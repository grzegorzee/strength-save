# /// script
# requires-python = ">=3.9"
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Jednorazowy: usuń stary profil App Store i utwórz nowy (z capability Apple Sign-In).
Reużywa istniejącego certyfikatu Distribution (już w keychain)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import requests
import ios_signing as s

# 1. Usuń stary profil o tej samej nazwie (Apple nie pozwala na duplikat nazwy).
r = requests.get(f"{s.BASE}/v1/profiles", headers=s.H(), params={"limit": 200})
r.raise_for_status()
for p in r.json().get("data", []):
    if p["attributes"]["name"] == s.PROFILE_NAME:
        d = requests.delete(f"{s.BASE}/v1/profiles/{p['id']}", headers=s.H())
        print(f"usunięto stary profil {p['id']} -> {d.status_code}")

# 2. Znajdź certyfikat Distribution (reużywamy, jest w keychain).
rc = requests.get(f"{s.BASE}/v1/certificates", headers=s.H(), params={"limit": 200})
rc.raise_for_status()
cert_id = None
for c in rc.json().get("data", []):
    if c["attributes"].get("certificateType") in ("DISTRIBUTION", "IOS_DISTRIBUTION"):
        cert_id = c["id"]
        print(f"certyfikat: {cert_id} ({c['attributes'].get('name')})")
        break
if not cert_id:
    sys.exit("BRAK certyfikatu Distribution — uruchom ios_signing.py od zera")

# 3. Utwórz nowy profil (zawiera applesignin bo App ID ma już capability) + ExportOptions.
bid = s.find_bundle_id()
uuid = s.create_profile(cert_id, bid)
s.write_export_options(uuid)
print(f"GOTOWE nowy profil UUID {uuid}")
