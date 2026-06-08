#!/usr/bin/env python3
"""Sprawdza status Beta App Review buildu v14 Strength Save i powiadamia (macOS notification + log)."""
import time, json, subprocess, urllib.request, urllib.error, sys

KEY_ID = "UD43687FB9"
ISSUER = "c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9"
KEY_PATH = "/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8"
BUILD = "7f7dd5b8-b722-439e-82e4-bd7c6684d307"
ROBERT = "robertzapala@icloud.com"
LOG = "/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/beta_review_status.log"

import jwt

with open(KEY_PATH) as f:
    pk = f.read()
token = jwt.encode(
    {"iss": ISSUER, "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
    pk, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})

req = urllib.request.Request(
    f"https://api.appstoreconnect.apple.com/v1/builds/{BUILD}/betaAppReviewSubmission",
    headers={"Authorization": "Bearer " + token})
try:
    data = json.load(urllib.request.urlopen(req))
    sub = data.get("data")
    state = sub["attributes"]["betaReviewState"] if sub else "BRAK_ZGLOSZENIA"
except urllib.error.HTTPError as e:
    state = f"BLAD_API_{e.code}: {e.read().decode()[:200]}"

stamp = time.strftime("%Y-%m-%d %H:%M:%S")
if state == "APPROVED":
    title = "TestFlight: build v14 ZATWIERDZONY ✅"
    msg = f"Robert ({ROBERT}) powinien już dostać mail z zaproszeniem TestFlight."
elif state == "REJECTED":
    title = "TestFlight: build v14 ODRZUCONY ❌"
    msg = "Beta App Review odrzucone. Sprawdź powód w App Store Connect."
elif state in ("WAITING_FOR_REVIEW", "IN_REVIEW"):
    title = "TestFlight: review w toku ⏳"
    msg = f"Build v14 wciąż w recenzji ({state}). Robert jeszcze nie dostał maila."
else:
    title = "TestFlight: status nieoczekiwany"
    msg = f"Stan: {state}"

line = f"[{stamp}] state={state} | {msg}"
with open(LOG, "a") as f:
    f.write(line + "\n")
print(line)

# macOS notification
try:
    subprocess.run(["/usr/bin/osascript", "-e",
        f'display notification "{msg}" with title "{title}"'], check=False)
except Exception:
    pass
