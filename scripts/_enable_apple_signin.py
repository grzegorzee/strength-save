# /// script
# requires-python = ">=3.9"
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Jednorazowy: włącz capability Sign in with Apple (APPLE_ID_AUTH) na App ID przez ASC API."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import asc_api as a

bundle = a.find_bundle()
if not bundle:
    print("BRAK bundleId — uruchom najpierw bundle-ensure"); sys.exit(1)
bid = bundle["id"]
print(f"bundleId: {bid} ({a.BUNDLE})")

# Istniejące capabilities
r = a.get(f"/v1/bundleIds/{bid}/bundleIdCapabilities", **{"limit": 200})
existing = [c["attributes"].get("capabilityType") for c in r.json().get("data", [])] if r.status_code == 200 else []
print("istniejące capabilities:", existing)

if "APPLE_ID_AUTH" in existing:
    print("OK: Sign in with Apple JUŻ włączone"); sys.exit(0)

body = {"data": {"type": "bundleIdCapabilities",
                 "attributes": {"capabilityType": "APPLE_ID_AUTH",
                                "settings": [{"key": "APPLE_ID_AUTH_APP_CONSENT",
                                              "options": [{"key": "PRIMARY_APP_CONSENT"}]}]},
                 "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bid}}}}}
rp = a.post("/v1/bundleIdCapabilities", body)
print("POST capability ->", rp.status_code)
if rp.status_code in (200, 201):
    print("OK: WŁĄCZONO Sign in with Apple")
else:
    print("FAIL:", rp.text[:500]); sys.exit(1)
