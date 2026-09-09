#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-auth>=2.40,<3", "requests>=2.32,<3"]
# ///
"""Publish a verified AAB exclusively to existing Google Play Internal Testing.

Default: local dry-run, no authentication or API calls. --publish explicitly
enables upload, internal track update, validation, commit and fresh readback.
Never edits testers or production. Avoid concurrent Play Console/script edits.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import zipfile

from google_play_check import PACKAGE_NAME, SERVICE_ACCOUNT

EDITS_URL = f'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE_NAME}/edits'
UPLOAD_URL = f'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{PACKAGE_NAME}/edits'


class ReleaseError(RuntimeError):
    def __init__(self, message, http_status=None):
        super().__init__(message)
        self.http_status = http_status


def _digest(path):
    with Path(path).open('rb') as stream:
        digest = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def inspect_artifact(path, receipt_path, version, sha256):
    """Bind the bytes to the native verifier receipt and inspect shipped SDK config."""
    path = Path(path)
    if not re.fullmatch(r'[0-9a-fA-F]{64}', sha256) or version < 1:
        raise ReleaseError('Expected version/hash is malformed')
    sha256 = sha256.lower()
    if _digest(path) != sha256:
        raise ReleaseError('Local AAB hash differs from the explicitly expected hash')
    receipt = json.loads(Path(receipt_path).read_text())
    meta = receipt.get('artifact', {})
    if (str(meta.get('versionCode')) != str(version) or meta.get('sha256') != sha256
            or meta.get('packageName') != PACKAGE_NAME or meta.get('versionName') != '1.0.0'
            or meta.get('bytes') != path.stat().st_size):
        raise ReleaseError('Native verification receipt does not match the requested artifact')
    signing = receipt.get('signing', {})
    alignment = receipt.get('alignment_16k', {})
    parity = receipt.get('asset_parity', {})
    if (receipt.get('build', {}).get('status') != 'PASS'
            or receipt.get('build', {}).get('bundletool_validation') != 'PASS'
            or signing.get('full_payload_verification', {}).get('JarFile_full_payload_signature_verification') != 'PASS'
            or not signing.get('certificate_matches_existing_upload_keystore')
            or alignment.get('all_64bit_elf_load_segments') != 'PASS'
            or not alignment.get('generated_apks')
            or any(apk.get('zipalign_16k') != 'PASS' for apk in alignment['generated_apks'])
            or not parity.get('mobile-dist') or parity.get('mobile-dist') != parity.get('signed-aab')):
        raise ReleaseError('Native signing, asset parity or 16 KB verification is incomplete')
    google_keys = set()
    with zipfile.ZipFile(path) as archive:
        for item in archive.infolist():
            name = item.filename
            if not name.startswith('base/assets/') or item.is_dir():
                continue
            if Path(name).suffix.lower() in ('.jks', '.keystore', '.p8', '.p12', '.pem'):
                raise ReleaseError('Private credential file must not be bundled')
            if Path(name).suffix.lower() not in ('.js', '.json', '.html', '.txt', '.md'):
                continue
            content = archive.read(item)
            if (re.search(rb'\bsk_[A-Za-z0-9_]{16,}\b', content)
                    or re.search(rb'-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----', content)
                    or re.search(rb'"type"\s*:\s*"service_account"', content)):
                raise ReleaseError('Private credential material must not be bundled')
            if name.startswith('base/assets/public/') and name.endswith('.js'):
                google_keys.update(re.findall(rb'\bgoog_[A-Za-z0-9]{12,}\b', content))
    if len(google_keys) != 1:
        raise ReleaseError('AAB must contain exactly one production Google RevenueCat SDK key')
    key_hash = hashlib.sha256(next(iter(google_keys))).hexdigest()
    expected_key_hash = receipt.get('revenuecat_google_sdk_key_sha256')
    if not expected_key_hash or expected_key_hash != key_hash:
        raise ReleaseError('Bundled Google SDK key does not match the release environment preflight')
    return {'path': str(path.resolve()), 'versionCode': version, 'sha256': sha256, 'bytes': path.stat().st_size,
            'google_sdk_key_present': True, 'google_sdk_key_matches_preflight': True}


def _json(response, action):
    if not 200 <= response.status_code < 300:
        raise ReleaseError(f'{action}: Play API HTTP {response.status_code}', response.status_code)
    return response.json() if response.status_code != 204 else {}


def _new_edit(session):
    edit = _json(session.post(EDITS_URL, json={}, timeout=30), 'create edit').get('id')
    if not isinstance(edit, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,200}', edit):
        raise ReleaseError('create edit: missing or invalid edit identity')
    return EDITS_URL + '/' + edit


def _cleanup(session, edit):
    response = session.delete(edit, timeout=30)
    if response.status_code != 404:
        _json(response, 'cleanup owned edit')


def _read(session, edit):
    bundles = _json(session.get(edit + '/bundles', timeout=30), 'read bundles').get('bundles', [])
    response = session.get(edit + '/tracks/internal', timeout=30)
    track = {'track': 'internal', 'releases': []} if response.status_code == 404 else _json(response, 'read internal track')
    return bundles, track


def _matches(bundle, artifact):
    return str(bundle.get('versionCode')) == str(artifact['versionCode']) and bundle.get('sha256', '').lower() == artifact['sha256']


def _completed(bundles, track, artifact):
    return any(_matches(bundle, artifact) for bundle in bundles) and any(
        release.get('status') == 'completed' and str(artifact['versionCode']) in release.get('versionCodes', [])
        for release in track.get('releases', [])
    )


def _readback(session, artifact):
    # A new snapshot distinguishes committed state from our uncommitted edit.
    edit = _new_edit(session)
    try:
        bundles, track = _read(session, edit)
        return _completed(bundles, track, artifact)
    finally:
        _cleanup(session, edit)


def release_internal(session, artifact, notes, publish=False):
    if _digest(artifact['path']) != artifact['sha256']:
        raise ReleaseError('Artifact changed after local verification')
    result = {'checked_at': datetime.now(timezone.utc).isoformat(), 'track': 'internal', 'artifact': artifact,
              'status': 'DRY_RUN', 'uploaded': False, 'readback_verified': False, 'commit_acknowledgement_lost': False}
    if not publish:
        return result
    if set(notes) != {'pl-PL', 'en-US'} or any(not text.strip() or len(text) > 500 for text in notes.values()):
        raise ReleaseError('Publish requires non-empty PL/EN release notes, each at most 500 characters')
    edit = _new_edit(session)
    committed = False
    try:
        bundles, track = _read(session, edit)
        existing = next((bundle for bundle in bundles if str(bundle.get('versionCode')) == str(artifact['versionCode'])), None)
        if existing and not _matches(existing, artifact):
            raise ReleaseError('Version code already belongs to another bundle hash')
        if _completed(bundles, track, artifact):
            result.update(status='ALREADY_COMPLETED', readback_verified=True)
            return result
        if any(int(bundle['versionCode']) > artifact['versionCode'] for bundle in bundles):
            raise ReleaseError('A newer bundle exists; refusing an internal downgrade')
        if not existing:
            with Path(artifact['path']).open('rb') as stream:
                uploaded = _json(session.post(UPLOAD_URL + '/' + edit.rsplit('/', 1)[1] + '/bundles',
                    params={'uploadType': 'media'}, headers={'Content-Type': 'application/octet-stream'},
                    data=stream, timeout=(30, 300)), 'upload bundle')
            if not _matches(uploaded, artifact):
                raise ReleaseError('The uploaded bundle version/hash differs from the verified AAB')
            result['uploaded'] = True
        body = {'track': 'internal', 'releases': [{'name': f"1.0.0 ({artifact['versionCode']})", 'status': 'completed',
            'versionCodes': [str(artifact['versionCode'])],
            'releaseNotes': [{'language': language, 'text': text} for language, text in notes.items()]}]}
        updated = _json(session.put(edit + '/tracks/internal', json=body, timeout=30), 'update internal track')
        if not _completed([artifact], updated, artifact):
            raise ReleaseError('Internal track update did not acknowledge the requested release')
        _json(session.post(edit + ':validate', timeout=30), 'validate edit')
        try:
            _json(session.post(edit + ':commit', timeout=60), 'commit edit')
            committed = True
        except Exception as error:
            if isinstance(error, ReleaseError) and error.http_status is not None and 400 <= error.http_status < 500 and error.http_status != 408:
                raise
            # Never blindly retry a timed-out commit or upload. Observe the live state first.
            result['commit_acknowledgement_lost'] = True
            try:
                committed = _readback(session, artifact)
            except Exception as read_error:
                raise ReleaseError('commit outcome unknown; readback failed. Inspect Internal Testing before retrying') from read_error
            if not committed:
                raise ReleaseError('commit outcome unknown; requested release is not observed. Inspect Internal Testing before retrying') from error
            result.update(status='COMPLETED', readback_verified=True)
            return result
        if not _readback(session, artifact):
            raise ReleaseError('Commit acknowledged but completed release readback differs; inspect Internal Testing before retrying')
        result.update(status='COMPLETED', readback_verified=True)
        return result
    finally:
        if not committed:
            _cleanup(session, edit)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--aab', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--expect-version', type=int, required=True)
    parser.add_argument('--expect-sha256', required=True)
    parser.add_argument('--notes-pl', type=Path)
    parser.add_argument('--notes-en', type=Path)
    parser.add_argument('--publish', action='store_true', help='Explicitly upload/update/commit Internal Testing; otherwise local dry-run')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    artifact = inspect_artifact(args.aab, args.receipt, args.expect_version, args.expect_sha256)
    notes = {language: path.read_text() for language, path in [('pl-PL', args.notes_pl), ('en-US', args.notes_en)] if path}
    if args.publish:
        import google.auth
        from google.auth import impersonated_credentials
        from google.auth.transport.requests import AuthorizedSession
        source, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
        credentials = impersonated_credentials.Credentials(source_credentials=source, target_principal=SERVICE_ACCOUNT,
            target_scopes=['https://www.googleapis.com/auth/androidpublisher'], lifetime=900)
        with AuthorizedSession(credentials) as session:
            result = release_internal(session, artifact, notes, publish=True)
    else:
        result = release_internal(None, artifact, notes)
    output = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output)
    print(output, end='')


if __name__ == '__main__':
    try:
        main()
    except ReleaseError as error:
        raise SystemExit(str(error)) from None
