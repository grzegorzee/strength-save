# /// script
# requires-python = ">=3.9"
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Jednorazowy: włącz capability Push Notifications (PUSH_NOTIFICATIONS) na App ID przez ASC API."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import asc_api as a

bundle = a.find_bundle()
if not bundle:
    print("BRAK bundleId"); sys.exit(1)
bid = bundle["id"]
r = a.get(f"/v1/bundleIds/{bid}/bundleIdCapabilities", **{"limit": 200})
existing = [c["attributes"].get("capabilityType") for c in r.json().get("data", [])] if r.status_code == 200 else []
print("istniejące:", existing)
if "PUSH_NOTIFICATIONS" in existing:
    print("OK: Push już włączone"); sys.exit(0)

body = {"data": {"type": "bundleIdCapabilities",
                 "attributes": {"capabilityType": "PUSH_NOTIFICATIONS"},
                 "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bid}}}}}
rp = a.post("/v1/bundleIdCapabilities", body)
print("POST ->", rp.status_code)
print("OK: WŁĄCZONO Push" if rp.status_code in (200, 201) else f"FAIL: {rp.text[:400]}")
sys.exit(0 if rp.status_code in (200, 201) else 1)
