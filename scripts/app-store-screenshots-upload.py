# /// script
# requires-python = ">=3.9"
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Validate and optionally upload the canonical English App Store screenshots.

Dry-run is the default. It validates the exact ten opaque 1320x2868 PNG files,
resolves Strength Save 1.0 / en-US in App Store Connect, and reports the current
APP_IPHONE_67 screenshot set without changing remote state. Apple keeps this
historical API identifier for the current 6.9-inch screenshot slot.

Mutations require --apply. Existing screenshots are never touched unless both
--apply and --replace-existing are supplied.

Credentials are identical to scripts/asc_api.py:
  ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH

Examples:
  uv run scripts/app-store-screenshots-upload.py
  uv run scripts/app-store-screenshots-upload.py --apply
  uv run scripts/app-store-screenshots-upload.py --apply --replace-existing
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import struct
import sys
import time
from pathlib import Path
from typing import Any, Iterable

import jwt
import requests


BASE = "https://api.appstoreconnect.apple.com"
BUNDLE_ID = "com.grzegorzjasionowicz.strengthsave"
DISPLAY_TYPE = "APP_IPHONE_67"
EXPECTED_SIZE = (1320, 2868)
EXPECTED_FILES = (
    "01-today.png",
    "02-plan.png",
    "03-workout.png",
    "04-history.png",
    "05-results.png",
    "06-charts.png",
    "07-records.png",
    "08-badges.png",
    "09-exercises.png",
    "10-devices.png",
)
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DIRECTORY = ROOT / "release" / "app-store" / "screenshots" / "en-US" / "6.9-inch"


class AscError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Create/upload remote assets. Default is read-only dry-run.")
    parser.add_argument(
        "--replace-existing",
        action="store_true",
        help="With --apply, delete existing APP_IPHONE_67 (6.9-inch slot) screenshots before upload.",
    )
    parser.add_argument("--version", default="1.0", help="App Store version string (default: 1.0).")
    parser.add_argument("--locale", default="en-US", help="Localization locale (default: en-US).")
    parser.add_argument("--directory", type=Path, default=DEFAULT_DIRECTORY, help="Directory containing the ten canonical PNGs.")
    return parser.parse_args()


def png_info(path: Path) -> tuple[int, int, bool]:
    """Return width, height and opacity using only the PNG container."""
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise AscError(f"{path.name}: not a PNG")
    if len(data) < 33 or data[12:16] != b"IHDR":
        raise AscError(f"{path.name}: invalid PNG IHDR")
    width, height, _depth, color_type = struct.unpack(">IIBB", data[16:26])
    has_alpha_channel = color_type in (4, 6)
    has_transparency_chunk = b"tRNS" in data
    return width, height, not has_alpha_channel and not has_transparency_chunk


def validate_assets(directory: Path) -> list[dict[str, Any]]:
    if not directory.is_dir():
        raise AscError(f"Screenshot directory does not exist: {directory}")
    assets: list[dict[str, Any]] = []
    for name in EXPECTED_FILES:
        path = directory / name
        if not path.is_file():
            raise AscError(f"Missing canonical screenshot: {path}")
        width, height, opaque = png_info(path)
        if (width, height) != EXPECTED_SIZE:
            raise AscError(f"{name}: expected {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]}, got {width}x{height}")
        if not opaque:
            raise AscError(f"{name}: Apple screenshots must be opaque (no alpha/tRNS)")
        payload = path.read_bytes()
        assets.append({
            "name": name,
            "path": path,
            "size": len(payload),
            "md5": hashlib.md5(payload).hexdigest(),  # ASC sourceFileChecksum contract
            "sha256": hashlib.sha256(payload).hexdigest(),
        })
    return assets


class AscClient:
    def __init__(self) -> None:
        missing = [name for name in ("ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_KEY_PATH") if not os.environ.get(name)]
        if missing:
            raise AscError(f"Missing ASC credentials: {', '.join(missing)} (same env as scripts/asc_api.py)")
        self.key_id = os.environ["ASC_KEY_ID"]
        self.issuer_id = os.environ["ASC_ISSUER_ID"]
        self.key_path = Path(os.environ["ASC_KEY_PATH"])
        if not self.key_path.is_file():
            raise AscError(f"ASC_KEY_PATH does not exist: {self.key_path}")

    def token(self) -> str:
        now = int(time.time())
        return jwt.encode(
            {"iss": self.issuer_id, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
            self.key_path.read_text(),
            algorithm="ES256",
            headers={"kid": self.key_id, "typ": "JWT"},
        )

    def request(self, method: str, path: str, *, params: dict[str, Any] | None = None, body: dict[str, Any] | None = None) -> requests.Response:
        response = requests.request(
            method,
            f"{BASE}{path}",
            headers={"Authorization": f"Bearer {self.token()}", "Content-Type": "application/json"},
            params=params,
            data=json.dumps(body) if body is not None else None,
            timeout=45,
        )
        if not response.ok:
            detail = response.text[:1200]
            raise AscError(f"ASC {method} {path} -> {response.status_code}: {detail}")
        return response

    def get(self, path: str, **params: Any) -> dict[str, Any]:
        return self.request("GET", path, params=params).json()

    def post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        return self.request("POST", path, body=body).json()

    def patch(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        return self.request("PATCH", path, body=body).json()

    def delete(self, path: str) -> None:
        self.request("DELETE", path)


def paged(client: AscClient, path: str, **params: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    next_path: str | None = path
    next_params: dict[str, Any] | None = dict(params)
    while next_path:
        payload = client.get(next_path, **(next_params or {}))
        items.extend(payload.get("data", []))
        next_url = payload.get("links", {}).get("next")
        if not next_url:
            break
        if not next_url.startswith(BASE):
            raise AscError(f"Unexpected ASC pagination URL: {next_url}")
        # The URL already contains its query string; requests can consume it as
        # a full API-relative path when no separate params are supplied.
        next_path = next_url[len(BASE):]
        next_params = None
    return items


def relationship_id(item: dict[str, Any], name: str) -> str | None:
    value = item.get("relationships", {}).get(name, {}).get("data")
    return value.get("id") if isinstance(value, dict) else None


def resolve_target(client: AscClient, version_string: str, locale: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    apps = paged(client, "/v1/apps", **{"filter[bundleId]": BUNDLE_ID, "limit": 200})
    app = next((item for item in apps if item.get("attributes", {}).get("bundleId") == BUNDLE_ID), None)
    if not app:
        raise AscError(f"App not found for bundle id {BUNDLE_ID}")

    versions = paged(
        client,
        f"/v1/apps/{app['id']}/appStoreVersions",
        **{"filter[platform]": "IOS", "filter[versionString]": version_string, "limit": 200},
    )
    version = next((item for item in versions if item.get("attributes", {}).get("versionString") == version_string), None)
    if not version:
        raise AscError(f"iOS App Store version {version_string} not found")

    localizations = paged(client, f"/v1/appStoreVersions/{version['id']}/appStoreVersionLocalizations", limit=200)
    localization = next((item for item in localizations if item.get("attributes", {}).get("locale") == locale), None)
    if not localization:
        raise AscError(f"Localization {locale} not found on App Store version {version_string}")
    return app, version, localization


def screenshot_sets(client: AscClient, localization_id: str) -> list[dict[str, Any]]:
    return paged(client, f"/v1/appStoreVersionLocalizations/{localization_id}/appScreenshotSets", limit=200)


def screenshots(client: AscClient, set_id: str) -> list[dict[str, Any]]:
    return paged(client, f"/v1/appScreenshotSets/{set_id}/appScreenshots", limit=200)


def create_set(client: AscClient, localization_id: str) -> dict[str, Any]:
    payload = client.post("/v1/appScreenshotSets", {
        "data": {
            "type": "appScreenshotSets",
            "attributes": {"screenshotDisplayType": DISPLAY_TYPE},
            "relationships": {
                "appStoreVersionLocalization": {
                    "data": {"type": "appStoreVersionLocalizations", "id": localization_id},
                },
            },
        },
    })
    return payload["data"]


def upload_asset(client: AscClient, set_id: str, asset: dict[str, Any]) -> dict[str, Any]:
    reservation = client.post("/v1/appScreenshots", {
        "data": {
            "type": "appScreenshots",
            "attributes": {"fileName": asset["name"], "fileSize": asset["size"]},
            "relationships": {
                "appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}},
            },
        },
    })["data"]
    screenshot_id = reservation["id"]
    operations = reservation.get("attributes", {}).get("uploadOperations") or []
    if not operations:
        raise AscError(f"{asset['name']}: ASC returned no upload operations")

    with asset["path"].open("rb") as source:
        for operation in operations:
            offset = int(operation["offset"])
            length = int(operation["length"])
            source.seek(offset)
            chunk = source.read(length)
            if len(chunk) != length:
                raise AscError(f"{asset['name']}: upload operation requested bytes outside the file")
            upload_headers = {entry["name"]: entry["value"] for entry in operation.get("requestHeaders", [])}
            response = requests.request(
                operation.get("method", "PUT"),
                operation["url"],
                headers=upload_headers,
                data=chunk,
                timeout=120,
            )
            if not response.ok:
                raise AscError(f"{asset['name']}: binary upload failed ({response.status_code}): {response.text[:500]}")

    committed = client.patch(f"/v1/appScreenshots/{screenshot_id}", {
        "data": {
            "type": "appScreenshots",
            "id": screenshot_id,
            "attributes": {"uploaded": True, "sourceFileChecksum": asset["md5"]},
        },
    })["data"]
    return committed


def state_of(item: dict[str, Any]) -> str:
    state = item.get("attributes", {}).get("assetDeliveryState", {})
    return str(state.get("state") or "UNKNOWN")


def wait_for_delivery(client: AscClient, uploaded: Iterable[dict[str, Any]], timeout_seconds: int = 300) -> None:
    pending = {item["id"]: item.get("attributes", {}).get("fileName", item["id"]) for item in uploaded}
    deadline = time.time() + timeout_seconds
    while pending and time.time() < deadline:
        for screenshot_id, name in list(pending.items()):
            item = client.get(f"/v1/appScreenshots/{screenshot_id}")["data"]
            state = state_of(item)
            if state in {"UPLOAD_COMPLETE", "COMPLETE"}:
                print(f"  READY {name}: {state}")
                del pending[screenshot_id]
            elif state in {"FAILED", "ERROR"}:
                errors = item.get("attributes", {}).get("assetDeliveryState", {}).get("errors", [])
                raise AscError(f"{name}: asset delivery {state}: {json.dumps(errors)[:1000]}")
        if pending:
            time.sleep(3)
    if pending:
        raise AscError(f"Timed out waiting for ASC delivery: {', '.join(pending.values())}")


def main() -> int:
    args = parse_args()
    if args.replace_existing and not args.apply:
        raise AscError("--replace-existing requires --apply")

    assets = validate_assets(args.directory.resolve())
    print(f"Validated {len(assets)}/10 opaque PNGs at {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]}")
    for asset in assets:
        print(f"  {asset['name']}: {asset['size']} bytes sha256={asset['sha256'][:16]}…")

    client = AscClient()
    app, version, localization = resolve_target(client, args.version, args.locale)
    sets = screenshot_sets(client, localization["id"])
    matching_sets = [item for item in sets if item.get("attributes", {}).get("screenshotDisplayType") == DISPLAY_TYPE]
    if len(matching_sets) > 1:
        raise AscError(f"Expected at most one {DISPLAY_TYPE} set, found {len(matching_sets)}")
    screenshot_set = matching_sets[0] if matching_sets else None
    existing = screenshots(client, screenshot_set["id"]) if screenshot_set else []

    print(
        f"ASC target: app={app['id']} version={version['attributes'].get('versionString')} "
        f"state={version['attributes'].get('appStoreState')} locale={args.locale} display={DISPLAY_TYPE}"
    )
    print(f"Remote set: {screenshot_set['id'] if screenshot_set else 'not created'}; screenshots={len(existing)}")

    if not args.apply:
        print("DRY-RUN: no remote state changed. Re-run with --apply after visual approval.")
        if existing:
            print("NOTE: existing screenshots require --apply --replace-existing for replacement.")
        return 0

    if existing and not args.replace_existing:
        raise AscError(
            f"Remote {DISPLAY_TYPE} set already contains {len(existing)} screenshot(s). "
            "Refusing to append duplicates; use --apply --replace-existing after explicit approval."
        )
    if existing:
        print(f"Deleting {len(existing)} existing screenshot(s) from {DISPLAY_TYPE}…")
        for item in existing:
            client.delete(f"/v1/appScreenshots/{item['id']}")
    if screenshot_set is None:
        screenshot_set = create_set(client, localization["id"])
        print(f"Created {DISPLAY_TYPE} set {screenshot_set['id']}")

    uploaded: list[dict[str, Any]] = []
    for index, asset in enumerate(assets, 1):
        print(f"Uploading {index:02d}/10 {asset['name']}…")
        uploaded.append(upload_asset(client, screenshot_set["id"], asset))
    wait_for_delivery(client, uploaded)

    remote = screenshots(client, screenshot_set["id"])
    if len(remote) != len(assets):
        raise AscError(f"Read-back count mismatch: expected {len(assets)}, got {len(remote)}")
    print(f"SUCCESS: {len(remote)} screenshots present in {DISPLAY_TYPE}. Verify order and visuals in App Store Connect.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AscError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
