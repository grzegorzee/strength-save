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


def _app_id():
    app, _ = find_app()
    return app["id"] if app else None


def cmd_builds():
    aid = _app_id()
    if not aid:
        print("Brak rekordu apki")
        return
    r = get("/v1/builds", **{"filter[app]": aid, "limit": 20,
                             "sort": "-version", "include": "preReleaseVersion"})
    if r.status_code != 200:
        print(f"{r.status_code}: {r.text[:300]}")
        return
    data = r.json()
    pre = {x["id"]: x["attributes"]["version"] for x in data.get("included", [])
           if x["type"] == "preReleaseVersions"}
    for b in data.get("data", []):
        a = b["attributes"]
        rel = b.get("relationships", {}).get("preReleaseVersion", {}).get("data") or {}
        ver = pre.get(rel.get("id"), "?")
        print(f"  build {ver} ({a.get('version')}) state={a.get('processingState')} id={b['id']} expired={a.get('expired')}")


def cmd_groups():
    aid = _app_id()
    r = get("/v1/betaGroups", **{"filter[app]": aid, "limit": 50})
    if r.status_code != 200:
        print(f"{r.status_code}: {r.text[:300]}")
        return
    for g in r.json().get("data", []):
        a = g["attributes"]
        print(f"  group '{a.get('name')}' internal={a.get('isInternalGroup')} id={g['id']}")


def cmd_users():
    r = get("/v1/users", limit=50)
    if r.status_code != 200:
        print(f"{r.status_code}: {r.text[:300]}")
        return
    for u in r.json().get("data", []):
        a = u["attributes"]
        print(f"  {a.get('username')} roles={a.get('roles')} id={u['id']}")


def cmd_internal_setup():
    """Utwórz internal beta group + podepnij najnowszy VALID build."""
    aid = _app_id()
    if not aid:
        print("Brak rekordu apki")
        sys.exit(1)
    # znajdź grupę 'Wewnętrzni' lub utwórz
    rg = get("/v1/betaGroups", **{"filter[app]": aid, "limit": 50})
    group = None
    for g in rg.json().get("data", []):
        if g["attributes"].get("name") == "Wewnętrzni":
            group = g
            break
    if not group:
        body = {"data": {"type": "betaGroups",
                         "attributes": {"name": "Wewnętrzni", "isInternalGroup": True},
                         "relationships": {"app": {"data": {"type": "apps", "id": aid}}}}}
        r = post("/v1/betaGroups", body)
        if r.status_code not in (200, 201):
            print(f"BŁĄD tworzenia grupy {r.status_code}: {r.text[:400]}")
            sys.exit(1)
        group = r.json()["data"]
        print(f"UTWORZONO grupę 'Wewnętrzni' id={group['id']} internal={group['attributes'].get('isInternalGroup')}")
    else:
        print(f"Grupa 'Wewnętrzni' już istnieje id={group['id']}")
    # najnowszy VALID build
    rb = get("/v1/builds", **{"filter[app]": aid, "filter[processingState]": "VALID",
                              "sort": "-version", "limit": 1})
    builds = rb.json().get("data", [])
    if not builds:
        print("Brak VALID buildów")
        sys.exit(1)
    bid = builds[0]["id"]
    # podepnij build do grupy
    rr = post(f"/v1/betaGroups/{group['id']}/relationships/builds",
              {"data": [{"type": "builds", "id": bid}]})
    if rr.status_code in (200, 201, 204):
        print(f"PODPIĘTO build {builds[0]['attributes'].get('version')} do grupy")
    else:
        print(f"build->grupa {rr.status_code}: {rr.text[:300]}")
    print(f"GROUP_ID={group['id']}")


def cmd_add_tester():
    """add-tester <email> <imię> <nazwisko> — dodaj testera do grupy 'Wewnętrzni'."""
    email, first, last = sys.argv[2], sys.argv[3], sys.argv[4]
    aid = _app_id()
    rg = get("/v1/betaGroups", **{"filter[app]": aid, "limit": 50})
    group = next((g for g in rg.json().get("data", []) if g["attributes"].get("name") == "Wewnętrzni"), None)
    if not group:
        print("Brak grupy 'Wewnętrzni' — uruchom internal-setup")
        sys.exit(1)
    body = {"data": {"type": "betaTesters",
                     "attributes": {"email": email, "firstName": first, "lastName": last},
                     "relationships": {"betaGroups": {"data": [{"type": "betaGroups", "id": group["id"]}]}}}}
    r = post("/v1/betaTesters", body)
    if r.status_code in (200, 201):
        print(f"DODANO testera {email} do 'Wewnętrzni'")
    else:
        print(f"BŁĄD {r.status_code}: {r.text[:400]}")


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
     "check-signing": cmd_check_signing, "builds": cmd_builds, "groups": cmd_groups,
     "users": cmd_users, "internal-setup": cmd_internal_setup,
     "add-tester": cmd_add_tester, "whoami": cmd_whoami}[cmd]()
