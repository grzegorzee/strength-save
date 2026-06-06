# /// script
# requires-python = ">=3.9"
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Tworzy iOS Distribution certificate + App Store provisioning profile przez
App Store Connect API, instaluje je w keychain / katalogu profili i generuje
ExportOptions-manual.plist do podpisania archiwum (manual signing).

Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH
"""
import os
import sys
import time
import json
import base64
import re
import plistlib
import subprocess
import jwt
import requests

KEY_ID = os.environ["ASC_KEY_ID"]
ISSUER_ID = os.environ["ASC_ISSUER_ID"]
KEY_PATH = os.environ["ASC_KEY_PATH"]
BUNDLE = "com.grzegorzjasionowicz.strengthsave"
TEAM = "J4CRD2SA6D"
BASE = "https://api.appstoreconnect.apple.com"
WORK = "build/signing"
P12_PASS = "tmp123"
PROFILE_NAME = "Strength Save App Store"


def token():
    with open(KEY_PATH) as f:
        pk = f.read()
    now = int(time.time())
    return jwt.encode({"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
                      pk, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def H():
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def run(*a):
    subprocess.run(a, check=True, capture_output=True)


def find_bundle_id():
    r = requests.get(f"{BASE}/v1/bundleIds", headers=H(),
                     params={"filter[identifier]": BUNDLE, "limit": 200})
    r.raise_for_status()
    for b in r.json().get("data", []):
        if b["attributes"]["identifier"] == BUNDLE:
            return b["id"]
    raise SystemExit("Brak App ID (bundleId) — uruchom najpierw asc_api.py bundle-ensure")


def create_certificate():
    os.makedirs(WORK, exist_ok=True)
    key = f"{WORK}/dist.key"
    csr = f"{WORK}/dist.csr"
    run("openssl", "genrsa", "-out", key, "2048")
    run("openssl", "req", "-new", "-key", key, "-out", csr,
        "-subj", "/CN=Strength Save Distribution/O=Grzegorz Jasionowicz/C=PL")
    csr_content = open(csr).read()

    cert = None
    for ctype in ("DISTRIBUTION", "IOS_DISTRIBUTION"):
        body = {"data": {"type": "certificates", "attributes": {
            "certificateType": ctype, "csrContent": csr_content}}}
        r = requests.post(f"{BASE}/v1/certificates", headers=H(), data=json.dumps(body))
        if r.status_code in (200, 201):
            cert = r.json()["data"]
            print(f"  utworzono certyfikat typu {ctype}: {cert['id']}")
            break
        else:
            print(f"  cert {ctype} -> {r.status_code}: {r.text[:200]}")
    if not cert:
        raise SystemExit("Nie udało się utworzyć certyfikatu (uprawnienia klucza?)")

    der = base64.b64decode(cert["attributes"]["certificateContent"])
    open(f"{WORK}/dist.cer", "wb").write(der)
    run("openssl", "x509", "-inform", "DER", "-in", f"{WORK}/dist.cer", "-out", f"{WORK}/dist.pem")
    run("openssl", "pkcs12", "-export", "-inkey", key, "-in", f"{WORK}/dist.pem",
        "-out", f"{WORK}/dist.p12", "-passout", f"pass:{P12_PASS}",
        "-name", "Apple Distribution: Strength Save")
    # import do login keychain, dostęp dla codesign/security (-A)
    run("security", "import", f"{WORK}/dist.p12", "-P", P12_PASS, "-A")
    print("  certyfikat + klucz prywatny zaimportowane do keychain")
    return cert["id"]


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
    name = pl["Name"]
    pp_dir = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")
    os.makedirs(pp_dir, exist_ok=True)
    open(f"{pp_dir}/{uuid}.mobileprovision", "wb").write(pdata)
    print(f"  profil '{name}' zainstalowany (UUID {uuid})")
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
    path = "ios/ExportOptions-manual.plist"
    with open(path, "wb") as f:
        plistlib.dump(opts, f)
    print(f"  zapisano {path}")


if __name__ == "__main__":
    existing = os.environ.get("CERT_ID")
    if existing:
        print(f"==> używam istniejącego certyfikatu {existing} (pomijam tworzenie + import)")
        cert_id = existing
    else:
        print("==> tworzę certyfikat Distribution")
        cert_id = create_certificate()
    print("==> tworzę App Store profil")
    bid = find_bundle_id()
    uuid = create_profile(cert_id, bid)
    print("==> generuję ExportOptions-manual.plist")
    write_export_options(uuid)
    print("GOTOWE — signing przygotowany.")
