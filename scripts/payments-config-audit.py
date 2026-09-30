#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyjwt>=2.8", "cryptography>=42", "google-auth>=2.40,<3", "requests>=2.32,<3"]
# ///
"""Audyt konfiguracji płatności TYLKO DO ODCZYTU (App Store Connect, Google Play,
RevenueCat, Pub/Sub). Każde żądanie przechodzi przez guard: dozwolony wyłącznie GET.
Żadnych edycji Play (edits), żadnych zapisów w ASC/RC. Wynik: JSON-y bez sekretów
w release/payments-<data>/.

  uv run scripts/payments-config-audit.py all
  uv run scripts/payments-config-audit.py asc|play|rc|pubsub

Klucze: ASC p8 (ASC_KEY_PATH), RC v2 z .env (STRENGTHSAVE_REVENUECAT_SECRET_KEY),
Play/GCP przez ADC z impersonacją SA strength-save-play (tylko androidpublisher).
"""
import datetime
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "release" / f"payments-{datetime.date.today().isoformat()}"

ASC_KEY_ID = os.environ.get("ASC_KEY_ID", "UD43687FB9")
ASC_ISSUER = os.environ.get("ASC_ISSUER_ID", "c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9")
ASC_KEY = os.environ.get("ASC_KEY_PATH", str(Path.home() / "FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8"))
ASC_APP_ID = "6777446137"
ASC_BASE = "https://api.appstoreconnect.apple.com"

PLAY_SA = "strength-save-play@fittracker-workouts.iam.gserviceaccount.com"
PACKAGE = "com.grzegorzjasionowicz.strengthsave"
PLAY_BASE = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE}"
GCP_PROJECT = "fittracker-workouts"

RC_BASE = "https://api.revenuecat.com/v2"
RC_PROJECT = "proj67cb081f"
WEBHOOK_URL_EXPECTED = "revenuecatWebhook"

PRODUCTS = ("strengthsave_pro_monthly", "strengthsave_pro_yearly")
TERRITORIES = ("POL", "USA")
REQUESTS = {"count": 0}


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def get(session_or_none, url, headers=None, params=None):
    """Jedyna droga do sieci: wyłącznie GET."""
    REQUESTS["count"] += 1
    sess = session_or_none or requests
    for attempt in range(4):
        response = sess.request("GET", url, headers=headers, params=params, timeout=30)
        if response.status_code in (429, 500, 502, 503, 504) and attempt < 3:
            time.sleep(1.5 * (attempt + 1))
            continue
        return response
    return response


def sha12(value):
    return hashlib.sha256(value.encode()).hexdigest()[:12] if value else None


def write(name, payload):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(f"zapisano {path.relative_to(ROOT)}")


def load_env():
    env = {}
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


# ---------------------------------------------------------------- App Store Connect

def asc_headers():
    token = jwt.encode(
        {"iss": ASC_ISSUER, "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        open(ASC_KEY).read(), algorithm="ES256", headers={"kid": ASC_KEY_ID, "typ": "JWT"})
    return {"Authorization": f"Bearer {token}"}


def asc(path, params=None):
    response = get(None, ASC_BASE + path, headers=asc_headers(), params=params)
    body = response.json() if response.content else {}
    return response.status_code, body


def asc_all(path, params=None):
    status, body = asc(path, params)
    items, included = list(body.get("data", []) or []), list(body.get("included", []) or [])
    nxt = body.get("links", {}).get("next")
    while status == 200 and nxt:
        response = get(None, nxt, headers=asc_headers())
        status, body = response.status_code, response.json()
        items += body.get("data", []) or []
        included += body.get("included", []) or []
        nxt = body.get("links", {}).get("next")
    return status, items, included


def mask_url(url):
    """Ostatni segment URL-a powiadomień RC to token: w publicznym repo tylko prefiks + hash."""
    if not url:
        return url
    head, _, token = url.rpartition("/")
    return f"{head}/{token[:4]}…(sha256:{sha12(token)})"


def audit_asc():
    result = {"checkedAt": now_iso(), "source": "App Store Connect API (GET only)", "appId": ASC_APP_ID}
    status, app = asc(f"/v1/apps/{ASC_APP_ID}")
    attrs = app.get("data", {}).get("attributes", {})
    result["app"] = {
        "http": status,
        "bundleId": attrs.get("bundleId"),
        "name": attrs.get("name"),
        # App Store Server Notifications (produkcja i sandbox) — gdzie Apple wysyła zdarzenia.
        "subscriptionStatusUrl": mask_url(attrs.get("subscriptionStatusUrl")),
        "subscriptionStatusUrlVersion": attrs.get("subscriptionStatusUrlVersion"),
        "subscriptionStatusUrlForSandbox": mask_url(attrs.get("subscriptionStatusUrlForSandbox")),
        "subscriptionStatusUrlVersionForSandbox": attrs.get("subscriptionStatusUrlVersionForSandbox"),
    }
    status, versions, _ = asc_all(f"/v1/apps/{ASC_APP_ID}/appStoreVersions", {"limit": 10})
    result["appStoreVersions"] = [{
        "id": v["id"], "platform": v["attributes"].get("platform"),
        "versionString": v["attributes"].get("versionString"),
        "appStoreState": v["attributes"].get("appStoreState"),
        "appVersionState": v["attributes"].get("appVersionState"),
        "releaseType": v["attributes"].get("releaseType"),
        "createdDate": v["attributes"].get("createdDate"),
    } for v in versions]
    for version in result["appStoreVersions"]:
        status, build = asc(f"/v1/appStoreVersions/{version['id']}/build")
        attached = build.get("data") or {}
        version["attachedBuild"] = attached.get("attributes", {}).get("version")
    status, builds_body = asc("/v1/builds", {
        "filter[app]": ASC_APP_ID, "sort": "-uploadedDate", "limit": 5,
        "fields[builds]": "version,processingState,uploadedDate,expired,buildAudienceType",
    })
    result["latestBuilds"] = [{"id": b["id"], **b["attributes"]} for b in builds_body.get("data", [])]

    status, groups, _ = asc_all(f"/v1/apps/{ASC_APP_ID}/subscriptionGroups")
    result["subscriptionGroups"] = []
    for group in groups:
        g = {"id": group["id"], "referenceName": group["attributes"].get("referenceName"), "subscriptions": []}
        status, gl, _ = asc_all(f"/v1/subscriptionGroups/{group['id']}/subscriptionGroupLocalizations")
        g["localizations"] = [{"locale": x["attributes"].get("locale"), "name": x["attributes"].get("name"),
                               "state": x["attributes"].get("state")} for x in gl]
        status, subs, _ = asc_all(f"/v1/subscriptionGroups/{group['id']}/subscriptions")
        for sub in subs:
            a = sub["attributes"]
            s = {"id": sub["id"], "productId": a.get("productId"), "name": a.get("name"), "state": a.get("state"),
                 "subscriptionPeriod": a.get("subscriptionPeriod"), "groupLevel": a.get("groupLevel"),
                 "familySharable": a.get("familySharable")}
            # Ceny PL/US (aktywna = najnowsza z startDate <= dziś albo bez daty).
            status, prices, inc = asc_all(f"/v1/subscriptions/{sub['id']}/prices", {
                "include": "subscriptionPricePoint,territory", "filter[territory]": ",".join(TERRITORIES),
                "limit": 200})
            points = {x["id"]: x for x in inc if x["type"] == "subscriptionPricePoints"}
            s["prices"] = []
            for p in prices:
                terr = p["relationships"]["territory"]["data"]["id"]
                pp = points.get(p["relationships"]["subscriptionPricePoint"]["data"]["id"], {})
                s["prices"].append({"territory": terr, "startDate": p["attributes"].get("startDate"),
                                    "preserved": p["attributes"].get("preserved"),
                                    "customerPrice": pp.get("attributes", {}).get("customerPrice"),
                                    "proceeds": pp.get("attributes", {}).get("proceeds")})
            status, offers, _ = asc_all(f"/v1/subscriptions/{sub['id']}/introductoryOffers", {
                "filter[territory]": ",".join(TERRITORIES), "include": "territory", "limit": 200})
            s["introductoryOffers"] = [{"territory": o["relationships"]["territory"]["data"]["id"],
                                        **{k: o["attributes"].get(k) for k in ("offerMode", "duration", "numberOfPeriods", "startDate", "endDate")}}
                                       for o in offers]
            status, avail = asc(f"/v1/subscriptions/{sub['id']}/subscriptionAvailability")
            av = avail.get("data") or {}
            s["availability"] = {"http": status, "availableInNewTerritories": av.get("attributes", {}).get("availableInNewTerritories")}
            if av.get("id"):
                status, terrs, _ = asc_all(f"/v1/subscriptionAvailabilities/{av['id']}/availableTerritories", {"limit": 200})
                ids = sorted(t["id"] for t in terrs)
                s["availability"].update({"territoryCount": len(ids), "includesPOL": "POL" in ids, "includesUSA": "USA" in ids})
            g["subscriptions"].append(s)
        result["subscriptionGroups"].append(g)

    # Sandbox testerzy (bez haseł: API ich nie zwraca; e-maile maskujemy).
    status, testers, _ = asc_all("/v2/sandboxTesters", {"limit": 200})
    def mask(email):
        if not email or "@" not in email:
            return email
        local, domain = email.split("@", 1)
        return local[:3] + "***@" + domain
    result["sandboxTesters"] = {"http": status, "count": len(testers), "testers": [{
        "acAccountName": mask(t["attributes"].get("acAccountName")),
        "territory": t["attributes"].get("territory"),
        "subscriptionRenewalRate": t["attributes"].get("subscriptionRenewalRate"),
        "interruptPurchases": t["attributes"].get("interruptPurchases"),
        "applePayCompatible": t["attributes"].get("applePayCompatible"),
    } for t in testers]}
    result["paidAppsAgreement"] = ("Brak endpointu w App Store Connect API. Sprawdź w konsoli: "
                                   "Business → Agreements (Paid Apps = Active).")
    result["requests"] = REQUESTS["count"]
    write("asc", result)
    return result


# ---------------------------------------------------------------- Google Play + Pub/Sub

def google_session(scopes):
    import google.auth
    from google.auth import impersonated_credentials
    from google.auth.transport.requests import AuthorizedSession
    source, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds = impersonated_credentials.Credentials(source_credentials=source, target_principal=PLAY_SA,
                                                 target_scopes=scopes, lifetime=900)
    return AuthorizedSession(creds)


def money(m):
    if not m:
        return None
    return f"{int(m.get('units', 0)) + m.get('nanos', 0) / 1e9:.2f} {m.get('currencyCode')}"


def audit_play():
    result = {"checkedAt": now_iso(), "source": "Android Publisher API v3 (GET only, bez edits)",
              "packageName": PACKAGE, "impersonatedServiceAccount": PLAY_SA}
    with google_session(["https://www.googleapis.com/auth/androidpublisher"]) as s:
        r = get(s, f"{PLAY_BASE}/subscriptions", params={"pageSize": 50})
        body = r.json()
        result["subscriptions"] = {"http": r.status_code, "items": []}
        for sub in body.get("subscriptions", []):
            item = {"productId": sub.get("productId"), "basePlans": []}
            for bp in sub.get("basePlans", []):
                regional = {c.get("regionCode"): c for c in bp.get("regionalConfigs", [])}
                arp = bp.get("autoRenewingBasePlanType") or {}
                item["basePlans"].append({
                    "basePlanId": bp.get("basePlanId"), "state": bp.get("state"),
                    "billingPeriodDuration": arp.get("billingPeriodDuration"),
                    "gracePeriodDuration": arp.get("gracePeriodDuration"),
                    "accountHoldDuration": arp.get("accountHoldDuration"),
                    "resubscribeState": arp.get("resubscribeState"),
                    "regionCount": len(regional),
                    "pricePL": money(regional.get("PL", {}).get("price")),
                    "priceUS": money(regional.get("US", {}).get("price")),
                })
                r2 = get(s, f"{PLAY_BASE}/subscriptions/{sub['productId']}/basePlans/{bp['basePlanId']}/offers",
                         params={"pageSize": 50})
                offers = r2.json().get("subscriptionOffers", [])
                item["basePlans"][-1]["offers"] = [{
                    "offerId": o.get("offerId"), "state": o.get("state"),
                    "eligibility": (o.get("targeting") or {}),
                    "phases": [{"duration": p.get("duration"), "recurrenceCount": p.get("recurrenceCount"),
                                "free": "free" in (p.get("regionalConfigs") or [{}])[0] or
                                        any("free" in c for c in p.get("regionalConfigs", []))}
                               for p in o.get("phases", [])],
                } for o in offers]
            result["subscriptions"]["items"].append(item)
        # Build z kanału testowego — sam GET generatedApks dowodzi, że versionCode jest w sklepie.
        for code in (57,):
            r3 = get(s, f"{PLAY_BASE}/generatedApks/{code}")
            result[f"generatedApks_{code}"] = {"http": r3.status_code,
                                               "present": r3.status_code == 200 and bool(r3.json().get("generatedApks"))}
    result["licenseTesters"] = ("Android Publisher API nie udostępnia listy License testers. Sprawdź: Play Console → "
                                "Ustawienia (Settings) → Testowanie licencji (License testing).")
    result["rtdnTopic"] = ("Temat RTDN nie jest dostępny w publicznym API. Sprawdź: Play Console → Strength Save → "
                           "Zarabianie (Monetize with Play) → Konfiguracja zarabiania (Monetization setup) → "
                           "Powiadomienia w czasie rzeczywistym dla deweloperów. Temat po stronie RevenueCat: "
                           "patrz rc.json (google integration) i pubsub.json.")
    result["requests"] = REQUESTS["count"]
    write("play", result)
    return result


def audit_pubsub():
    """RTDN: Play publikuje na temat Pub/Sub, subskrypcja push wysyła do RevenueCat.
    Odczyt przez SA strength-save-play (agent-readonly nie ma pubsub.viewer)."""
    result = {"checkedAt": now_iso(), "project": GCP_PROJECT, "source": "Pub/Sub API v1 (GET only)",
              "impersonatedServiceAccount": PLAY_SA}
    base = f"https://pubsub.googleapis.com/v1/projects/{GCP_PROJECT}"
    with google_session(["https://www.googleapis.com/auth/pubsub"]) as s:
        r = get(s, f"{base}/topics", params={"pageSize": 200})
        topics = [t["name"] for t in r.json().get("topics", [])] if r.ok else []
        result["topics"] = {"http": r.status_code, "count": len(topics),
                            "nonEventarc": [t for t in topics if "/topics/eventarc-" not in t]}
        r = get(s, f"{base}/subscriptions", params={"pageSize": 200})
        subs = r.json().get("subscriptions", []) if r.ok else []
        result["subscriptions"] = {"http": r.status_code, "nonEventarc": [{
            "name": x["name"], "topic": x.get("topic"),
            "pushEndpointHost": x["pushConfig"]["pushEndpoint"].split("/")[2] if x.get("pushConfig", {}).get("pushEndpoint") else None,
            "pushEndpointPathPrefix": "/".join(x["pushConfig"]["pushEndpoint"].split("/")[3:5]) if x.get("pushConfig", {}).get("pushEndpoint") else None,
            "state": x.get("state")} for x in subs if "eventarc-" not in x["name"]]}
        result["topicIamPublishers"] = {}
        for topic in result["topics"]["nonEventarc"]:
            r = get(s, f"https://pubsub.googleapis.com/v1/{topic}:getIamPolicy")
            bindings = r.json().get("bindings", []) if r.ok else []
            result["topicIamPublishers"][topic] = {"http": r.status_code, "publishers": sorted(
                m for b in bindings if b.get("role") == "roles/pubsub.publisher" for m in b.get("members", []))}
    result["requests"] = REQUESTS["count"]
    write("pubsub", result)
    return result


# ---------------------------------------------------------------- RevenueCat

def audit_rc():
    env = load_env()
    key = os.environ.get("STRENGTHSAVE_REVENUECAT_SECRET_KEY") or env.get("STRENGTHSAVE_REVENUECAT_SECRET_KEY", "")
    if not key.startswith("sk_"):
        sys.exit("Brak klucza RC v2")
    headers = {"Authorization": f"Bearer {key}"}
    root = f"{RC_BASE}/projects/{RC_PROJECT}"

    def rc(path, params=None):
        r = get(None, root + path, headers=headers, params=params)
        return r.status_code, (r.json() if r.content else {})

    def rc_all(path, params=None):
        status, body = rc(path, {**(params or {}), "limit": 100})
        items = body.get("items", [])
        nxt = body.get("next_page")
        while status == 200 and nxt:
            r = get(None, "https://api.revenuecat.com" + nxt, headers=headers)
            status, body = r.status_code, r.json()
            items += body.get("items", [])
            nxt = body.get("next_page")
        return status, items

    result = {"checkedAt": now_iso(), "source": "RevenueCat API v2 (GET only)", "projectId": RC_PROJECT}
    status, apps = rc_all("/apps")
    result["apps"] = {"http": status, "items": []}
    for app in apps:
        entry = {"id": app.get("id"), "name": app.get("name"), "type": app.get("type")}
        store = app.get(app.get("type") or "", {}) or {}
        entry["storeConfig"] = {k: v for k, v in store.items() if "secret" not in k.lower() and "key" not in k.lower()
                                and "credential" not in k.lower() and "vendor" not in k.lower()}
        # Klucze publiczne SDK (hash, nie wartość) — do porównania z buildem.
        st, keys = rc_all(f"/apps/{app['id']}/public_api_keys")
        entry["publicApiKeys"] = {"http": st, "sha256_12": [sha12(k.get("key")) for k in keys],
                                  "environments": [k.get("environment") for k in keys]}
        result["apps"]["items"].append(entry)

    status, products = rc_all("/products", {"expand": "items.app"})
    result["products"] = {"http": status, "items": [{"id": p.get("id"), "store_identifier": p.get("store_identifier"),
                                                     "type": p.get("type"), "state": p.get("state"),
                                                     "app_id": p.get("app_id")} for p in products]}
    status, ents = rc_all("/entitlements")
    result["entitlements"] = {"http": status, "items": []}
    for ent in ents:
        st, eprods = rc_all(f"/entitlements/{ent['id']}/products")
        result["entitlements"]["items"].append({"id": ent["id"], "lookup_key": ent.get("lookup_key"),
                                                "state": ent.get("state"),
                                                "products": [p.get("store_identifier") for p in eprods]})
    status, offerings = rc_all("/offerings")
    result["offerings"] = {"http": status, "items": []}
    for off in offerings:
        st, pkgs = rc_all(f"/offerings/{off['id']}/packages")
        pk = []
        for pkg in pkgs:
            st2, pprods = rc_all(f"/packages/{pkg['id']}/products")
            pk.append({"lookup_key": pkg.get("lookup_key"), "position": pkg.get("position"),
                       "products": [{"store_identifier": (x.get("product") or {}).get("store_identifier"),
                                     "product_id": (x.get("product") or {}).get("id"),
                                     "eligibility": x.get("eligibility_criteria")} for x in pprods]})
        result["offerings"]["items"].append({"id": off["id"], "lookup_key": off.get("lookup_key"),
                                             "is_current": off.get("is_current"), "state": off.get("state"),
                                             "packages": pk})
    # Webhook: v2 endpoint integrations/webhooks (jeśli dostępny dla klucza).
    status, hooks = rc("/integrations/webhooks")
    items = hooks.get("items", []) if isinstance(hooks, dict) else []
    result["webhooks"] = {"http": status, "error": None if status == 200 else hooks.get("message") or hooks.get("type"),
                          "items": [{"id": h.get("id"), "name": h.get("name"), "url": h.get("url"),
                                     "environment": h.get("environment"), "event_types": h.get("event_types"),
                                     "app_id": h.get("app_id"),
                                     "authorizationHeaderSet": bool(h.get("authorization_header") or h.get("authorization")),
                                     "authorizationMatchesEnv_sha256_12": (sha12(h.get("authorization_header") or h.get("authorization") or "")
                                                                           == sha12(env.get("STRENGTHSAVE_REVENUECAT_WEBHOOK_AUTH", "x")))}
                                    for h in items]}
    result["requests"] = REQUESTS["count"]
    write("rc", result)
    return result


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    steps = {"asc": audit_asc, "play": audit_play, "pubsub": audit_pubsub, "rc": audit_rc}
    for name, fn in steps.items():
        if cmd in (name, "all"):
            try:
                fn()
            except Exception as error:  # jeden dostawca nie blokuje reszty
                print(f"{name}: BŁĄD {type(error).__name__}: {str(error)[:300]}")
                write(f"{name}-error", {"checkedAt": now_iso(), "error": f"{type(error).__name__}: {str(error)[:300]}"})


if __name__ == "__main__":
    main()
