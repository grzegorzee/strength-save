#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-auth>=2.40,<3", "requests>=2.32,<3"]
# ///
"""Check Play access using ADC and short-lived service-account credentials.

uv run scripts/google_play_check.py --expect-version 50 --output /tmp/play-check.json

Creates an edit to read and validate the current release, then deletes that edit.
Never uploads a bundle or commits an edit. Avoid concurrent Play Console edits.
"""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path


SERVICE_ACCOUNT = "strength-save-play@fittracker-workouts.iam.gserviceaccount.com"
PACKAGE_NAME = "com.grzegorzjasionowicz.strengthsave"
BASE_URL = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE_NAME}/edits"


def check_access(session, expect_version=None):
    created = session.post(BASE_URL, json={}, timeout=30)
    created.raise_for_status()
    edit_url = BASE_URL + "/" + created.json()["id"]
    result = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "service_account": SERVICE_ACCOUNT,
        "package_name": PACKAGE_NAME,
        "authentication": "ADC with short-lived service-account impersonation",
        "edit_committed": False,
        "cleanup": False,
    }
    try:
        for resource in ("tracks", "bundles", "details"):
            response = session.get(edit_url + "/" + resource, timeout=30)
            response.raise_for_status()
            data = response.json()
            result[resource] = (
                {"defaultLanguage": data.get("defaultLanguage")}
                if resource == "details"
                else data
            )
        if expect_version is not None:
            releases = [
                release
                for track in result["tracks"].get("tracks", [])
                if track["track"] == "internal"
                for release in track.get("releases", [])
            ]
            if not any(
                str(expect_version) in release.get("versionCodes", [])
                and release.get("status") == "completed"
                for release in releases
            ):
                raise RuntimeError(
                    f"Internal testing has no completed release for version {expect_version}"
                )
        response = session.post(edit_url + ":validate", timeout=30)
        response.raise_for_status()
        result["validate_http"] = response.status_code
    finally:
        response = session.delete(edit_url, timeout=30)
        response.raise_for_status()
        result["cleanup"] = True
        result["cleanup_http"] = response.status_code
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expect-version", type=int)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    import google.auth
    from google.auth import impersonated_credentials
    from google.auth.transport.requests import AuthorizedSession

    source, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    credentials = impersonated_credentials.Credentials(
        source_credentials=source,
        target_principal=SERVICE_ACCOUNT,
        target_scopes=["https://www.googleapis.com/auth/androidpublisher"],
        lifetime=900,
    )
    with AuthorizedSession(credentials) as session:
        result = check_access(session, args.expect_version)
    output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output)
    print(output, end="")


if __name__ == "__main__":
    main()
