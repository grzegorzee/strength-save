"""Operational checks: read-only snapshot cleanup and expected release validation."""

import unittest
from unittest.mock import Mock

from google_play_check import BASE_URL, check_access


def response(payload=None, status=200, error=None):
    result = Mock(status_code=status)
    result.json.return_value = payload or {}
    result.raise_for_status.side_effect = error
    return result


class CheckPlayAccessTests(unittest.TestCase):
    def setUp(self):
        self.session = Mock()
        self.session.post.side_effect = [response({"id": "our-edit"}), response()]
        self.session.get.side_effect = [
            response({"tracks": [{"track": "internal", "releases": [
                {"versionCodes": ["50"], "status": "completed"}
            ]}]}),
            response({"bundles": [{"versionCode": 50}]}),
            response({"defaultLanguage": "en-US", "contactEmail": "private@example.com"}),
        ]
        self.session.delete.return_value = response(status=204)

    def test_reads_completed_release_without_committing_and_cleans_up(self):
        result = check_access(self.session, 50)
        self.assertTrue(result["cleanup"])
        self.assertFalse(result["edit_committed"])
        self.assertEqual(result["details"], {"defaultLanguage": "en-US"})
        self.assertEqual(
            [call.args[0] for call in self.session.post.call_args_list],
            [BASE_URL, BASE_URL + "/our-edit:validate"],
        )
        self.session.delete.assert_called_once_with(BASE_URL + "/our-edit", timeout=30)

    def test_cleans_up_after_read_failure(self):
        self.session.get.side_effect = [response(error=RuntimeError("read failed"))]
        with self.assertRaisesRegex(RuntimeError, "read failed"):
            check_access(self.session)
        self.session.delete.assert_called_once_with(BASE_URL + "/our-edit", timeout=30)

    def test_wrong_version_does_not_validate_or_commit_but_cleans_up(self):
        with self.assertRaisesRegex(RuntimeError, "version 51"):
            check_access(self.session, 51)
        self.assertEqual(self.session.post.call_count, 1)
        self.session.delete.assert_called_once()

    def test_draft_release_does_not_count_as_available(self):
        self.session.get.side_effect = [
            response({"tracks": [{"track": "internal", "releases": [
                {"versionCodes": ["50"], "status": "draft"}
            ]}]}), response(), response(),
        ]
        with self.assertRaisesRegex(RuntimeError, "no completed release"):
            check_access(self.session, 50)
        self.session.delete.assert_called_once()

    def test_failed_creation_never_deletes_an_unrelated_edit(self):
        self.session.post.side_effect = [response(error=RuntimeError("access denied"))]
        with self.assertRaisesRegex(RuntimeError, "access denied"):
            check_access(self.session)
        self.session.delete.assert_not_called()

    def test_failed_validation_still_cleans_up(self):
        self.session.post.side_effect = [
            response({"id": "our-edit"}), response(error=RuntimeError("invalid edit")),
        ]
        with self.assertRaisesRegex(RuntimeError, "invalid edit"):
            check_access(self.session)
        self.session.delete.assert_called_once()

    def test_failed_cleanup_cannot_report_success(self):
        self.session.delete.return_value = response(error=RuntimeError("cleanup failed"))
        with self.assertRaisesRegex(RuntimeError, "cleanup failed"):
            check_access(self.session)


if __name__ == "__main__":
    unittest.main()
