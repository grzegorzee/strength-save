"""Internal release workflow: no live credentials, uploads or Play edits in tests."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock
import zipfile

from google_play_release import release_internal, inspect_artifact, ReleaseError, EDITS_URL, UPLOAD_URL, PACKAGE_NAME


def response(data=None, status=200):
    return Mock(status_code=status, json=Mock(return_value=data or {}))


class InternalReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'fixture.aab'
        self.path.write_bytes(b'verified synthetic artifact')
        self.sha = hashlib.sha256(self.path.read_bytes()).hexdigest()
        self.artifact = {'path': str(self.path), 'versionCode': 51, 'sha256': self.sha}
        self.bundle = {'versionCode': 51, 'sha256': self.sha}
        self.track = {'track': 'internal', 'releases': [{'versionCodes': ['51'], 'status': 'completed'}]}
        self.session = Mock()
        self.session.delete.return_value = response(status=204)
        self.session.put.return_value = response(self.track)

    def success(self, *, existing=None, commit_error=None):
        posts = [response({'id': 'our-edit'})]
        if existing is None:
            posts.append(response(self.bundle))
        posts += [response(), commit_error or response({'id': 'our-edit'}), response({'id': 'readback-edit'})]
        self.session.post.side_effect = posts
        self.session.get.side_effect = [response({'bundles': existing or []}), response({'track': 'internal', 'releases': []}), response({'bundles': [self.bundle]}), response(self.track)]

    def publish(self):
        return release_internal(self.session, self.artifact, {'pl-PL': 'Poprawki Androida.', 'en-US': 'Android fixes.'}, publish=True)

    def test_default_dry_run_never_uses_credentials_or_api(self):
        result = release_internal(self.session, self.artifact, {})
        self.assertEqual(result['status'], 'DRY_RUN')
        self.assertEqual(self.session.mock_calls, [])

    def test_upload_internal_validate_commit_readback(self):
        self.success()
        result = self.publish()
        self.assertEqual(result['status'], 'COMPLETED')
        self.assertTrue(result['readback_verified'])
        calls = [call.args[0] for call in self.session.post.call_args_list]
        self.assertEqual(calls, [EDITS_URL, UPLOAD_URL + '/our-edit/bundles', EDITS_URL + '/our-edit:validate', EDITS_URL + '/our-edit:commit', EDITS_URL])
        self.assertEqual(self.session.put.call_args.args[0], EDITS_URL + '/our-edit/tracks/internal')
        self.assertEqual(self.session.put.call_args.kwargs['json']['releases'][0]['versionCodes'], ['51'])
        self.session.delete.assert_called_once_with(EDITS_URL + '/readback-edit', timeout=30)

    def test_wrong_upload_hash_or_version_never_changes_track(self):
        for wrong in ({**self.bundle, 'sha256': '0' * 64}, {**self.bundle, 'versionCode': 52}):
            with self.subTest(wrong=wrong):
                self.session.reset_mock()
                self.session.post.side_effect = [response({'id': 'our-edit'}), response(wrong)]
                self.session.get.side_effect = [response(), response({'track': 'internal'})]
                with self.assertRaisesRegex(ReleaseError, 'uploaded bundle'):
                    self.publish()
                self.session.put.assert_not_called()
                self.session.delete.assert_called_once_with(EDITS_URL + '/our-edit', timeout=30)

    def test_validation_failure_cleans_only_our_edit(self):
        self.success()
        self.session.post.side_effect = [response({'id': 'our-edit'}), response(self.bundle), response(status=400)]
        with self.assertRaisesRegex(ReleaseError, 'validate'):
            self.publish()
        self.session.delete.assert_called_once_with(EDITS_URL + '/our-edit', timeout=30)
        self.assertFalse(any(':commit' in call.args[0] for call in self.session.post.call_args_list))

    def test_ambiguous_commit_reconciles_before_any_retry_or_cleanup(self):
        self.success(commit_error=TimeoutError('lost acknowledgement'))
        result = self.publish()
        self.assertEqual(result['status'], 'COMPLETED')
        self.assertTrue(result['commit_acknowledgement_lost'])
        self.assertEqual(sum(':commit' in call.args[0] for call in self.session.post.call_args_list), 1)
        self.assertEqual(sum(UPLOAD_URL in call.args[0] for call in self.session.post.call_args_list), 1)
        self.session.delete.assert_called_once_with(EDITS_URL + '/readback-edit', timeout=30)

    def test_ambiguous_commit_not_observed_stops_without_blind_reupload(self):
        self.success(commit_error=TimeoutError('lost acknowledgement'))
        self.session.get.side_effect = [response(), response({'track': 'internal'}), response(), response({'track': 'internal'})]
        with self.assertRaisesRegex(ReleaseError, 'commit outcome unknown'):
            self.publish()
        self.assertEqual(sum(':commit' in call.args[0] for call in self.session.post.call_args_list), 1)
        self.assertEqual(sum(UPLOAD_URL in call.args[0] for call in self.session.post.call_args_list), 1)
        self.assertEqual([call.args[0] for call in self.session.delete.call_args_list], [EDITS_URL + '/readback-edit', EDITS_URL + '/our-edit'])

    def test_same_bundle_retry_reuses_upload_and_completed_release_is_noop(self):
        self.session.post.side_effect = [response({'id': 'our-edit'})]
        self.session.get.side_effect = [response({'bundles': [self.bundle]}), response(self.track)]
        result = self.publish()
        self.assertEqual(result['status'], 'ALREADY_COMPLETED')
        self.assertEqual(self.session.post.call_count, 1)
        self.session.put.assert_not_called()
        self.session.delete.assert_called_once_with(EDITS_URL + '/our-edit', timeout=30)

    def test_existing_unreleased_same_bundle_is_reused(self):
        self.success(existing=[self.bundle])
        self.assertEqual(self.publish()['status'], 'COMPLETED')
        self.assertFalse(any(UPLOAD_URL in call.args[0] for call in self.session.post.call_args_list))

    def test_version_collision_or_downgrade_never_uploads(self):
        for bundles in ([{**self.bundle, 'sha256': '0' * 64}], [{'versionCode': 52, 'sha256': '0' * 64}]):
            with self.subTest(bundles=bundles):
                self.session.reset_mock()
                self.session.post.side_effect = [response({'id': 'our-edit'})]
                self.session.get.side_effect = [response({'bundles': bundles}), response({'track': 'internal'})]
                with self.assertRaises(ReleaseError):
                    self.publish()
                self.assertEqual(self.session.post.call_count, 1)
                self.session.put.assert_not_called()
                self.session.delete.assert_called_once()

    def test_failed_creation_never_deletes_unknown_edit(self):
        self.session.post.side_effect = [response(status=403)]
        with self.assertRaises(ReleaseError):
            self.publish()
        self.session.delete.assert_not_called()

    def test_cleanup_failure_is_not_reported_as_success(self):
        self.success()
        self.session.delete.return_value = response(status=403)
        with self.assertRaisesRegex(ReleaseError, 'cleanup'):
            self.publish()

    def test_confirmed_commit_still_requires_actual_readback(self):
        self.success()
        self.session.get.side_effect = [response(), response({'track': 'internal'}), response({'bundles': [self.bundle]}), response({'track': 'internal', 'releases': [{'versionCodes': ['51'], 'status': 'draft'}]})]
        with self.assertRaisesRegex(ReleaseError, 'readback'):
            self.publish()

    def test_definite_commit_rejection_never_retries_or_creates_readback_edit(self):
        self.success(commit_error=response(status=403))
        with self.assertRaisesRegex(ReleaseError, 'commit edit'):
            self.publish()
        self.assertEqual(self.session.post.call_count, 4)
        self.session.delete.assert_called_once_with(EDITS_URL + '/our-edit', timeout=30)


class ArtifactPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.aab = Path(self.temp.name) / 'fixture.aab'
        self.receipt = Path(self.temp.name) / 'receipt.json'
        self.google_key = 'goog_1234567890abcdef'

    def prepare(self, source=None):
        with zipfile.ZipFile(self.aab, 'w') as archive:
            archive.writestr('base/assets/public/assets/index.js', source if source is not None else f'const apiKey="{self.google_key}";')
        digest = hashlib.sha256(self.aab.read_bytes()).hexdigest()
        receipt = {
            'artifact': {'versionCode': '51', 'versionName': '1.0.0', 'packageName': PACKAGE_NAME, 'sha256': digest, 'bytes': self.aab.stat().st_size},
            'build': {'status': 'PASS', 'bundletool_validation': 'PASS'},
            'signing': {'certificate_matches_existing_upload_keystore': True, 'full_payload_verification': {'JarFile_full_payload_signature_verification': 'PASS'}},
            'alignment_16k': {'all_64bit_elf_load_segments': 'PASS', 'generated_apks': [{'zipalign_16k': 'PASS'}]},
            'asset_parity': {'mobile-dist': {'files': 1, 'sha256': 'fixture'}, 'signed-aab': {'files': 1, 'sha256': 'fixture'}},
            'revenuecat_google_sdk_key_sha256': hashlib.sha256(self.google_key.encode()).hexdigest(),
        }
        self.receipt.write_text(json.dumps(receipt))
        return digest

    def test_binds_validated_bytes_version_and_google_key_without_returning_key(self):
        digest = self.prepare()
        result = inspect_artifact(self.aab, self.receipt, 51, digest)
        self.assertTrue(result['google_sdk_key_present'])
        self.assertTrue(result['google_sdk_key_matches_preflight'])
        self.assertNotIn(self.google_key, json.dumps(result))

    def test_cannot_reuse_receipt_after_aab_changes_or_for_other_version(self):
        digest = self.prepare()
        with self.assertRaisesRegex(ReleaseError, 'receipt'):
            inspect_artifact(self.aab, self.receipt, 52, digest)
        self.aab.write_bytes(self.aab.read_bytes() + b'changed')
        with self.assertRaisesRegex(ReleaseError, 'hash'):
            inspect_artifact(self.aab, self.receipt, 51, digest)

    def test_missing_google_key_reproduces_android50_release_gap(self):
        digest = self.prepare('const apiKey="appl_1234567890abcdef";')
        with self.assertRaisesRegex(ReleaseError, 'Google RevenueCat'):
            inspect_artifact(self.aab, self.receipt, 51, digest)

    def test_secret_and_service_account_material_cannot_reach_upload(self):
        for private in ('const key="sk_1234567890abcdefghijkl";', '{"type":"service_account","private_key":"fixture"}', '-----BEGIN PRIVATE KEY-----'):
            with self.subTest(private=private):
                digest = self.prepare(f'const apiKey="{self.google_key}";' + private)
                with self.assertRaisesRegex(ReleaseError, 'Private credential'):
                    inspect_artifact(self.aab, self.receipt, 51, digest)

    def test_correct_platform_key_from_another_environment_is_rejected(self):
        digest = self.prepare('const apiKey="goog_abcdefghijklmnop";')
        with self.assertRaisesRegex(ReleaseError, 'release environment'):
            inspect_artifact(self.aab, self.receipt, 51, digest)

    def test_incomplete_alignment_verification_is_rejected(self):
        digest = self.prepare()
        receipt = json.loads(self.receipt.read_text())
        receipt['alignment_16k']['generated_apks'] = []
        self.receipt.write_text(json.dumps(receipt))
        with self.assertRaisesRegex(ReleaseError, 'verification is incomplete'):
            inspect_artifact(self.aab, self.receipt, 51, digest)


if __name__ == '__main__':
    unittest.main()
