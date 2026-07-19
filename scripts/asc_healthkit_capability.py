# /// script
# requires-python = ">=3.11"
# dependencies = ["requests", "pyjwt[crypto]"]
# ///
"""Z116: dodaje capability HealthKit do App ID i regeneruje App Store provisioning
profile (stary profil bez HealthKit nie pokryje entitlementu — export by padł).

Użycie:
  set -a; source _secrets/oauth/appstore-connect.env; set +a
  uv run scripts/asc_healthkit_capability.py
"""
import base64
import json
import os
import plistlib
import re
import time

import jwt
import requests

KEY_ID = os.environ["ASC_KEY_ID"]
ISSUER_ID = os.environ["ASC_ISSUER_ID"]
KEY_PATH = os.environ["ASC_KEY_PATH"]
BUNDLE = "com.grzegorzjasionowicz.strengthsave"
TEAM = "J4CRD2SA6D"
BASE = "https://api.appstoreconnect.apple.com"
PROFILE_NAME = "Strength Save App Store"


def token():
    with open(KEY_PATH) as f:
        pk = f.read()
    return jwt.encode(
        {"iss": ISSUER_ID, "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        pk, algorithm="ES256", headers={"kid": KEY_ID},
    )


def H():
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def find_bundle_id():
    r = requests.get(f"{BASE}/v1/bundleIds", headers=H(), params={"filter[identifier]": BUNDLE})
    r.raise_for_status()
    for item in r.json()["data"]:
        if item["attributes"]["identifier"] == BUNDLE:
            return item["id"]
    raise SystemExit(f"Bundle {BUNDLE} nie znaleziony")


def ensure_healthkit(bundle_resource_id):
    r = requests.get(f"{BASE}/v1/bundleIds/{bundle_resource_id}/bundleIdCapabilities", headers=H())
    if r.status_code == 200:
        for cap in r.json().get("data", []):
            if cap["attributes"].get("capabilityType") == "HEALTHKIT":
                print("  capability HEALTHKIT już włączona")
                return
    body = {"data": {
        "type": "bundleIdCapabilities",
        "attributes": {"capabilityType": "HEALTHKIT"},
        "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bundle_resource_id}}},
    }}
    r = requests.post(f"{BASE}/v1/bundleIdCapabilities", headers=H(), data=json.dumps(body))
    if r.status_code not in (200, 201):
        raise SystemExit(f"Capability -> {r.status_code}: {r.text[:300]}")
    print("  capability HEALTHKIT dodana")


def delete_old_profiles():
    r = requests.get(f"{BASE}/v1/profiles", headers=H(), params={"filter[name]": PROFILE_NAME})
    r.raise_for_status()
    for prof in r.json()["data"]:
        pid = prof["id"]
        requests.delete(f"{BASE}/v1/profiles/{pid}", headers=H())
        print(f"  usunięto stary profil {pid}")


def find_distribution_cert():
    r = requests.get(f"{BASE}/v1/certificates", headers=H(), params={"filter[certificateType]": "DISTRIBUTION", "limit": 10})
    r.raise_for_status()
    certs = r.json()["data"]
    if not certs:
        raise SystemExit("Brak certyfikatu DISTRIBUTION")
    return certs[0]["id"]


def create_profile(cert_id, bundle_resource_id):
    body = {"data": {
        "type": "profiles",
        "attributes": {"name": PROFILE_NAME, "profileType": "IOS_APP_STORE"},
        "relationships": {
            "bundleId": {"data": {"type": "bundleIds", "id": bundle_resource_id}},
            "certificates": {"data": [{"type": "certificates", "id": cert_id}]},
        }}}
    r = requests.post(f"{BASE}/v1/profiles", headers=H(), data=json.dumps(body))
    if r.status_code not in (200, 201):
        raise SystemExit(f"Profil -> {r.status_code}: {r.text[:300]}")
    prof = r.json()["data"]
    pdata = base64.b64decode(prof["attributes"]["profileContent"])
    m = re.search(rb"<plist.*</plist>", pdata, re.DOTALL)
    pl = plistlib.loads(m.group(0))
    uuid = pl["UUID"]
    pp_dir = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")
    os.makedirs(pp_dir, exist_ok=True)
    open(f"{pp_dir}/{uuid}.mobileprovision", "wb").write(pdata)
    print(f"  profil '{pl['Name']}' zainstalowany (UUID {uuid})")
    return uuid


def write_export_options(profile_uuid):
    opts = {
        "method": "app-store-connect",
        "teamID": TEAM,
        "signingStyle": "manual",
        "signingCertificate": "Apple Distribution",
        "provisioningProfiles": {BUNDLE: profile_uuid},
        "uploadSymbols": True,
        "destination": "export",
    }
    with open("ios/ExportOptions-manual.plist", "wb") as f:
        plistlib.dump(opts, f)
    print("  zapisano ios/ExportOptions-manual.plist")


if __name__ == "__main__":
    bid = find_bundle_id()
    print("==> capability HealthKit")
    ensure_healthkit(bid)
    print("==> regeneracja profilu")
    delete_old_profiles()
    cert = find_distribution_cert()
    uuid = create_profile(cert, bid)
    write_export_options(uuid)
    print("GOTOWE — profil z HealthKit.")
