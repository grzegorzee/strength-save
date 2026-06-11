# /// script
# requires-python = ">=3.9"
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Przygotowuje signing dla aplikacji Apple Watch (StrengthWatch):
1. rejestruje bundle ID com.grzegorzjasionowicz.strengthsave.watchkitapp (jeśli brak),
2. tworzy App Store provisioning profile na ISTNIEJĄCYM certyfikacie Distribution
   (tym samym, którego używa profil głównej apki — klucz prywatny już jest w keychain),
3. instaluje profil i dopisuje mapowanie do ios/ExportOptions-manual.plist.

Idempotentny: istniejący bundle/profil wykrywa i używa ponownie.
Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH
"""
import os
import time
import json
import base64
import re
import plistlib
import jwt
import requests

KEY_ID = os.environ["ASC_KEY_ID"]
ISSUER_ID = os.environ["ASC_ISSUER_ID"]
KEY_PATH = os.environ["ASC_KEY_PATH"]
MAIN_BUNDLE = "com.grzegorzjasionowicz.strengthsave"
WATCH_BUNDLE = MAIN_BUNDLE + ".watchkitapp"
BASE = "https://api.appstoreconnect.apple.com"
PROFILE_NAME = "Strength Save Watch App Store"
EXPORT_OPTS = "ios/ExportOptions-manual.plist"


def token():
    with open(KEY_PATH) as f:
        pk = f.read()
    now = int(time.time())
    return jwt.encode({"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
                      pk, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def H():
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def ensure_watch_bundle_id():
    r = requests.get(f"{BASE}/v1/bundleIds", headers=H(),
                     params={"filter[identifier]": WATCH_BUNDLE, "limit": 200})
    r.raise_for_status()
    for b in r.json().get("data", []):
        if b["attributes"]["identifier"] == WATCH_BUNDLE:
            print(f"  bundle ID istnieje: {b['id']}")
            return b["id"]
    body = {"data": {"type": "bundleIds", "attributes": {
        "identifier": WATCH_BUNDLE, "name": "Strength Save Watch", "platform": "IOS"}}}
    r = requests.post(f"{BASE}/v1/bundleIds", headers=H(), data=json.dumps(body))
    if r.status_code not in (200, 201):
        raise SystemExit(f"bundleIds -> {r.status_code}: {r.text[:300]}")
    bid = r.json()["data"]["id"]
    print(f"  zarejestrowano bundle ID: {bid}")
    return bid


def distribution_cert_id():
    r = requests.get(f"{BASE}/v1/certificates", headers=H(),
                     params={"filter[certificateType]": "DISTRIBUTION", "limit": 200})
    r.raise_for_status()
    certs = r.json().get("data", [])
    if not certs:
        raise SystemExit("Brak certyfikatu DISTRIBUTION — odpal najpierw ios_signing.py")
    # najświeższy (ten sam, który podpisuje główną apkę; klucz w keychain)
    cert = max(certs, key=lambda c: c["attributes"].get("expirationDate", ""))
    print(f"  certyfikat Distribution: {cert['id']} (exp {cert['attributes'].get('expirationDate')})")
    return cert["id"]


def existing_profile():
    r = requests.get(f"{BASE}/v1/profiles", headers=H(),
                     params={"filter[name]": PROFILE_NAME, "limit": 200})
    r.raise_for_status()
    for p in r.json().get("data", []):
        if p["attributes"]["name"] == PROFILE_NAME and p["attributes"].get("profileState") == "ACTIVE":
            return p
    return None


def install_profile(prof):
    pdata = base64.b64decode(prof["attributes"]["profileContent"])
    m = re.search(rb"<plist.*</plist>", pdata, re.DOTALL)
    pl = plistlib.loads(m.group(0))
    uuid = pl["UUID"]
    pp_dir = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")
    os.makedirs(pp_dir, exist_ok=True)
    with open(f"{pp_dir}/{uuid}.mobileprovision", "wb") as f:
        f.write(pdata)
    print(f"  profil '{pl['Name']}' zainstalowany (UUID {uuid})")
    return uuid


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
        raise SystemExit(f"profiles -> {r.status_code}: {r.text[:300]}")
    return r.json()["data"]


def update_export_options(uuid):
    with open(EXPORT_OPTS, "rb") as f:
        opts = plistlib.load(f)
    opts.setdefault("provisioningProfiles", {})[WATCH_BUNDLE] = uuid
    with open(EXPORT_OPTS, "wb") as f:
        plistlib.dump(opts, f)
    print(f"  {EXPORT_OPTS}: {WATCH_BUNDLE} -> {uuid}")


if __name__ == "__main__":
    print("==> bundle ID zegarka")
    bid = ensure_watch_bundle_id()
    print("==> profil App Store dla zegarka")
    prof = existing_profile()
    if prof is None:
        cert_id = distribution_cert_id()
        prof = create_profile(cert_id, bid)
        print(f"  utworzono profil {prof['id']}")
    else:
        print(f"  profil istnieje: {prof['id']}")
    uuid = install_profile(prof)
    print("==> ExportOptions-manual.plist")
    update_export_options(uuid)
    print("GOTOWE — signing zegarka przygotowany.")
