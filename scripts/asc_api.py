# /// script
# requires-python = ">=3.9"
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Minimalny klient App Store Connect API (JWT ES256 z .p8).

Komendy:
  bundle-ensure   — zarejestruj App ID (bundleId) jeśli nie istnieje
  app-ensure      — utwórz rekord apki (jeśli API pozwoli) lub zgłoś że trzeba GUI
  whoami          — sanity: lista bundleIds (test klucza)

Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH
"""
import os
import sys
import time
import json
import jwt
import requests

KEY_ID = os.environ["ASC_KEY_ID"]
ISSUER_ID = os.environ["ASC_ISSUER_ID"]
KEY_PATH = os.environ["ASC_KEY_PATH"]
BUNDLE = "com.grzegorzjasionowicz.strengthsave"
APP_NAME = "Strength Save"
BASE = "https://api.appstoreconnect.apple.com"


def token() -> str:
    with open(KEY_PATH, "r") as f:
        private_key = f.read()
    now = int(time.time())
    payload = {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def headers() -> dict:
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def get(path: str, **params):
    r = requests.get(f"{BASE}{path}", headers=headers(), params=params)
    return r


def post(path: str, body: dict):
    r = requests.post(f"{BASE}{path}", headers=headers(), data=json.dumps(body))
    return r


def find_bundle():
    r = get("/v1/bundleIds", **{"filter[identifier]": BUNDLE, "limit": 200})
    r.raise_for_status()
    for b in r.json().get("data", []):
        if b["attributes"]["identifier"] == BUNDLE:
            return b
    return None


def cmd_bundle_ensure():
    existing = find_bundle()
    if existing:
        print(f"OK bundleId już istnieje: {existing['id']} ({BUNDLE})")
        return
    body = {"data": {"type": "bundleIds", "attributes": {
        "identifier": BUNDLE, "name": APP_NAME.replace(" ", ""), "platform": "UNIVERSAL"}}}
    r = post("/v1/bundleIds", body)
    if r.status_code in (200, 201):
        print(f"UTWORZONO bundleId: {r.json()['data']['id']} ({BUNDLE})")
    else:
        print(f"BŁĄD bundleId {r.status_code}: {r.text}")
        sys.exit(1)


def find_app():
    r = get("/v1/apps", **{"filter[bundleId]": BUNDLE, "limit": 200})
    if r.status_code != 200:
        return None, r
    for a in r.json().get("data", []):
        if a["attributes"].get("bundleId") == BUNDLE:
            return a, r
    return None, r


def cmd_app_ensure():
    app, r = find_app()
    if app:
        print(f"OK rekord apki istnieje: {app['id']} ({app['attributes'].get('name')})")
        return
    # Próba utworzenia przez API (Apple historycznie nie wspiera POST /v1/apps).
    body = {"data": {"type": "apps", "attributes": {
        "name": APP_NAME, "bundleId": BUNDLE, "primaryLocale": "pl",
        "sku": "strengthsave001"}}}
    rp = post("/v1/apps", body)
    if rp.status_code in (200, 201):
        print(f"UTWORZONO rekord apki: {rp.json()['data']['id']}")
    else:
        print(f"NIE_UTWORZONO {rp.status_code}: {rp.text[:400]}")
        print("=> Rekord apki trzeba utworzyć w GUI (App Store Connect → Apps → +).")


def cmd_check_signing():
    """Czy klucz ma dostęp do zasobów podpisywania (certs/profiles)."""
    rc = get("/v1/certificates", **{"limit": 200})
    print(f"GET certificates -> {rc.status_code}")
    if rc.status_code == 200:
        dist = [c for c in rc.json().get("data", [])
                if c["attributes"].get("certificateType") in ("IOS_DISTRIBUTION", "DISTRIBUTION")]
        print(f"  istniejące Distribution certs: {len(dist)}")
        for c in dist:
            print(f"    - {c['id']} typ={c['attributes'].get('certificateType')} exp={c['attributes'].get('expirationDate')}")
    else:
        print(f"  {rc.text[:300]}")
    rp = get("/v1/profiles", **{"limit": 200})
    print(f"GET profiles -> {rp.status_code}")
    if rp.status_code == 200:
        store = [p for p in rp.json().get("data", [])
                 if p["attributes"].get("profileType") in ("IOS_APP_STORE",)]
        print(f"  istniejące App Store profiles: {len(store)}")
        for p in store:
            print(f"    - {p['id']} name={p['attributes'].get('name')} state={p['attributes'].get('profileState')}")
    else:
        print(f"  {rp.text[:300]}")


def cmd_whoami():
    r = get("/v1/bundleIds", limit=5)
    print(f"status {r.status_code}")
    if r.status_code == 200:
        print("KLUCZ DZIAŁA. Przykładowe bundleIds:")
        for b in r.json().get("data", []):
            print(f"  - {b['attributes']['identifier']}")
    else:
        print(r.text[:500])
        sys.exit(1)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "whoami"
    {"bundle-ensure": cmd_bundle_ensure, "app-ensure": cmd_app_ensure,
     "check-signing": cmd_check_signing, "whoami": cmd_whoami}[cmd]()
