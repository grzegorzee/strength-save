#!/usr/bin/env python3
# Auto-dystrybucja builda do testerow ZEWNETRZNYCH TestFlight:
#   1) czeka az build (po wersji) bedzie VALID,
#   2) ustawia "What to Test" (whatsNew),
#   3) podpina build do grupy zewnetrznej,
#   4) zglasza na Beta App Review (obsluga limitu "jeden build w review na train" -> expire poprzednich),
#   5) weryfikuje stan review.
#
# Tester zewnetrzny (np. Robert) NIE wymaga konta App Store Connect, ale Apple wymaga
# Beta App Review dla KAZDEGO builda przed instalacja. Ten skrypt automatyzuje wszystko
# poza samym (asynchronicznym) review Apple.
#
# Uzycie:
#   uv run --with pyjwt --with cryptography python scripts/testflight_external.py [WERSJA] [--whats-new "tekst"]
#   (bez WERSJI = najnowszy build)
import sys, time, json, urllib.request, urllib.error
import jwt

KEY_ID = "UD43687FB9"
ISSUER = "c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9"
KEY = "/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8"
APP_ID = "6777446137"
EXTERNAL_GROUP = "4ad8388a-a717-42a6-b7a7-7aeb737d29e8"   # "Testerzy zewnetrzni" (Robert)
BASE = "https://api.appstoreconnect.apple.com"


def token():
    return jwt.encode(
        {"iss": ISSUER, "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        open(KEY).read(), algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(r)
        raw = resp.read()
        return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw else {})


def find_build(version):
    _, d = req("GET", f"/v1/builds?filter[app]={APP_ID}&sort=-version&limit=10")
    builds = d.get("data", [])
    if version:
        return next((b for b in builds if b["attributes"]["version"] == str(version)), None)
    return builds[0] if builds else None


def main():
    args = [a for a in sys.argv[1:]]
    whats_new = "Poprawki stabilnosci i testy."
    if "--whats-new" in args:
        i = args.index("--whats-new")
        whats_new = args[i + 1]
        del args[i:i + 2]
    version = args[0] if args else None

    # 1) czekaj na VALID
    bid = None
    for attempt in range(40):
        b = find_build(version)
        if b:
            st = b["attributes"]["processingState"]
            version = b["attributes"]["version"]
            print(f"[{attempt}] build {version} {st}", flush=True)
            if st == "VALID":
                bid = b["id"]
                break
            if st in ("INVALID", "FAILED"):
                print("Build INVALID/FAILED — przerywam.")
                return 1
        else:
            print(f"[{attempt}] build {version or '(najnowszy)'} jeszcze niewidoczny", flush=True)
        time.sleep(30)
    if not bid:
        print("TIMEOUT: build nie osiagnal VALID.")
        return 1

    # 2) whatsNew (en-US + ewentualnie pozostale lokalizacje)
    _, locs = req("GET", f"/v1/builds/{bid}/betaBuildLocalizations")
    for loc in locs.get("data", []):
        lid = loc["id"]
        sc, _ = req("PATCH", f"/v1/betaBuildLocalizations/{lid}",
                    {"data": {"type": "betaBuildLocalizations", "id": lid, "attributes": {"whatsNew": whats_new}}})
        print(f"whatsNew {loc['attributes'].get('locale')} -> HTTP {sc}", flush=True)

    # 3) podpiecie do grupy zewnetrznej (idempotentne)
    sc, resp = req("POST", f"/v1/betaGroups/{EXTERNAL_GROUP}/relationships/builds",
                   {"data": [{"type": "builds", "id": bid}]})
    print(f"podpiecie do grupy zewnetrznej -> HTTP {sc}"
          + ("" if sc in (200, 204) else f" {resp}"), flush=True)

    # 4) zgloszenie na Beta App Review (z obsluga ANOTHER_BUILD_IN_REVIEW)
    for tries in range(3):
        sc, resp = req("POST", "/v1/betaAppReviewSubmissions",
                       {"data": {"type": "betaAppReviewSubmissions",
                                 "relationships": {"build": {"data": {"type": "builds", "id": bid}}}}})
        if sc in (200, 201):
            print("Zgloszono na Beta App Review.", flush=True)
            break
        errs = json.dumps(resp)
        print(f"submit -> HTTP {sc} {errs}", flush=True)
        if "ANOTHER_BUILD_IN_REVIEW" in errs or "another build" in errs.lower():
            # zwolnij train: expire wszystkie inne buildy w stanie review
            _, d = req("GET", f"/v1/builds?filter[app]={APP_ID}&sort=-version&limit=15")
            for b in d.get("data", []):
                if b["id"] == bid:
                    continue
                _, sub = req("GET", f"/v1/builds/{b['id']}/betaAppReviewSubmission")
                state = (sub.get("data") or {}).get("attributes", {}).get("betaReviewState")
                if state in ("WAITING_FOR_REVIEW", "IN_REVIEW"):
                    esc, _ = req("PATCH", f"/v1/builds/{b['id']}",
                                 {"data": {"type": "builds", "id": b["id"], "attributes": {"expired": True}}})
                    print(f"  expire build {b['attributes']['version']} (był {state}) -> HTTP {esc}", flush=True)
            time.sleep(3)
            continue
        # inny blad — przerwij
        return 1

    # 5) weryfikacja
    _, sub = req("GET", f"/v1/builds/{bid}/betaAppReviewSubmission")
    state = (sub.get("data") or {}).get("attributes", {}).get("betaReviewState", "?")
    print(f"\nBuild {version}: betaReviewState = {state}")
    print("Po zatwierdzeniu przez Apple Robert dostanie maila z nowym buildem.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
