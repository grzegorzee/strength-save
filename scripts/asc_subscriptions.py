#!/usr/bin/env python3
# Tworzy produkty subskrypcji Strength Save PRO w App Store Connect przez ASC API.
# Decyzje (DECYZJE.md cz. 10): PL 14,99 zl/mies + 99,99 zl/rok; US $2.99/$19.99;
# triale: monthly 14 dni FREE_TRIAL, yearly 30 dni (ONE_MONTH) FREE_TRIAL; bez lifetime.
# Reszta terytoriow: equalizacja Apple od ceny USA. Idempotentny (sprawdza istniejace zasoby).
#
# Uzycie:
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py setup
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py prices
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py offers
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py status
import sys, time, json, urllib.request, urllib.error, urllib.parse
import jwt

KEY_ID = "UD43687FB9"
ISSUER = "c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9"
KEY = "/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8"
APP_ID = "6777446137"
BASE = "https://api.appstoreconnect.apple.com"

GROUP_NAME = "Strength Save PRO"
PRODUCTS = {
    "monthly": {
        "productId": "strengthsave_pro_monthly",
        "name": "PRO Monthly",
        "period": "ONE_MONTH",
        "trial": "TWO_WEEKS",
        "price_pl": "14.99",
        "price_us": "2.99",
        "loc": {
            "en-US": ("PRO Monthly", "Full access: unlimited plans, AI Coach, analytics."),
            "pl": ("PRO Miesięczny", "Nielimitowane plany, Trener AI, pełna analityka."),
        },
    },
    "yearly": {
        "productId": "strengthsave_pro_yearly",
        "name": "PRO Yearly",
        "period": "ONE_YEAR",
        "trial": "ONE_MONTH",
        "price_pl": "99.99",
        "price_us": "19.99",
        "loc": {
            "en-US": ("PRO Yearly", "Full access for a year. Best value: 5 months free."),
            "pl": ("PRO Roczny", "Pełny dostęp na rok. 5 miesięcy gratis."),
        },
    },
}
GROUP_LOC = {"en-US": "Strength Save PRO", "pl": "Strength Save PRO"}


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


def die(msg, payload=None):
    print(f"BLAD: {msg}")
    if payload:
        print(json.dumps(payload, indent=2)[:2000])
    sys.exit(1)


def get_all(path):
    """GET z podazaniem za links.next (paginacja)."""
    items = []
    url = path
    while url:
        status, resp = req("GET", url)
        if status != 200:
            die(f"GET {url} -> {status}", resp)
        items.extend(resp.get("data", []))
        nxt = resp.get("links", {}).get("next")
        url = nxt.replace(BASE, "") if nxt else None
    return items


def find_or_create_group():
    groups = get_all(f"/v1/apps/{APP_ID}/subscriptionGroups")
    for g in groups:
        if g["attributes"]["referenceName"] == GROUP_NAME:
            print(f"grupa istnieje: {g['id']}")
            return g["id"]
    status, resp = req("POST", "/v1/subscriptionGroups", {
        "data": {"type": "subscriptionGroups",
                 "attributes": {"referenceName": GROUP_NAME},
                 "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}}}})
    if status != 201:
        die(f"create group -> {status}", resp)
    print(f"grupa utworzona: {resp['data']['id']}")
    return resp["data"]["id"]


def ensure_group_localizations(group_id):
    existing = {l["attributes"]["locale"] for l in get_all(f"/v1/subscriptionGroups/{group_id}/subscriptionGroupLocalizations")}
    for locale, name in GROUP_LOC.items():
        if locale in existing:
            print(f"  group loc {locale}: jest")
            continue
        status, resp = req("POST", "/v1/subscriptionGroupLocalizations", {
            "data": {"type": "subscriptionGroupLocalizations",
                     "attributes": {"locale": locale, "name": name},
                     "relationships": {"subscriptionGroup": {"data": {"type": "subscriptionGroups", "id": group_id}}}}})
        print(f"  group loc {locale}: {status}" + ("" if status == 201 else f" {json.dumps(resp)[:300]}"))


def find_or_create_subscriptions(group_id):
    existing = {s["attributes"]["productId"]: s["id"] for s in get_all(f"/v1/subscriptionGroups/{group_id}/subscriptions")}
    ids = {}
    for key, p in PRODUCTS.items():
        if p["productId"] in existing:
            ids[key] = existing[p["productId"]]
            print(f"subskrypcja {p['productId']}: istnieje ({ids[key]})")
            continue
        status, resp = req("POST", "/v1/subscriptions", {
            "data": {"type": "subscriptions",
                     "attributes": {"name": p["name"], "productId": p["productId"],
                                    "subscriptionPeriod": p["period"], "groupLevel": 1,
                                    "familySharable": False},
                     "relationships": {"group": {"data": {"type": "subscriptionGroups", "id": group_id}}}}})
        if status != 201:
            die(f"create subscription {p['productId']} -> {status}", resp)
        ids[key] = resp["data"]["id"]
        print(f"subskrypcja {p['productId']}: utworzona ({ids[key]})")
    return ids


def ensure_sub_localizations(sub_ids):
    for key, p in PRODUCTS.items():
        existing = {l["attributes"]["locale"]: l for l in get_all(f"/v1/subscriptions/{sub_ids[key]}/subscriptionLocalizations")}
        for locale, (name, desc) in p["loc"].items():
            if locale in existing:
                cur = existing[locale]["attributes"]
                if cur.get("name") == name and cur.get("description") == desc:
                    print(f"  {p['productId']} loc {locale}: jest")
                    continue
                status, resp = req("PATCH", f"/v1/subscriptionLocalizations/{existing[locale]['id']}", {
                    "data": {"type": "subscriptionLocalizations", "id": existing[locale]["id"],
                             "attributes": {"name": name, "description": desc}}})
                print(f"  {p['productId']} loc {locale}: PATCH {status}" + ("" if status == 200 else f" {json.dumps(resp)[:300]}"))
                continue
            status, resp = req("POST", "/v1/subscriptionLocalizations", {
                "data": {"type": "subscriptionLocalizations",
                         "attributes": {"locale": locale, "name": name, "description": desc},
                         "relationships": {"subscription": {"data": {"type": "subscriptions", "id": sub_ids[key]}}}}})
            print(f"  {p['productId']} loc {locale}: {status}" + ("" if status == 201 else f" {json.dumps(resp)[:300]}"))


def get_sub_ids():
    groups = get_all(f"/v1/apps/{APP_ID}/subscriptionGroups")
    gid = next((g["id"] for g in groups if g["attributes"]["referenceName"] == GROUP_NAME), None)
    if not gid:
        die("brak grupy — odpal najpierw 'setup'")
    subs = get_all(f"/v1/subscriptionGroups/{gid}/subscriptions")
    return {("monthly" if s["attributes"]["productId"].endswith("monthly") else "yearly"): s["id"]
            for s in subs if s["attributes"]["productId"].startswith("strengthsave_pro_")}


def find_price_point(sub_id, territory, price):
    pts = get_all(f"/v1/subscriptions/{sub_id}/pricePoints?filter[territory]={territory}&limit=200")
    for pt in pts:
        if pt["attributes"]["customerPrice"] == price:
            return pt["id"]
    avail = sorted({p["attributes"]["customerPrice"] for p in pts}, key=float)
    die(f"brak price pointu {price} dla {territory}; dostepne w okolicy: {[v for v in avail if abs(float(v)-float(price))<3]}")


def set_price(sub_id, price_point_id, territory_id):
    # Terytorium wynika z price pointu — relacja territory w create jest odrzucana (409).
    status, resp = req("POST", "/v1/subscriptionPrices", {
        "data": {"type": "subscriptionPrices",
                 "relationships": {
                     "subscription": {"data": {"type": "subscriptions", "id": sub_id}},
                     "subscriptionPricePoint": {"data": {"type": "subscriptionPricePoints", "id": price_point_id}}}}})
    return status, resp


def cmd_setup():
    gid = find_or_create_group()
    ensure_group_localizations(gid)
    sub_ids = find_or_create_subscriptions(gid)
    ensure_sub_localizations(sub_ids)
    print("SETUP OK", json.dumps(sub_ids))


def cmd_prices():
    sub_ids = get_sub_ids()
    for key, p in PRODUCTS.items():
        sid = sub_ids[key]
        print(f"== {p['productId']} ==")
        # 1) USA (kotwica do equalizacji) + Polska (jawnie, decyzja usera)
        us_pp = find_price_point(sid, "USA", p["price_us"])
        pl_pp = find_price_point(sid, "POL", p["price_pl"])
        for terr, pp in (("USA", us_pp), ("POL", pl_pp)):
            status, resp = set_price(sid, pp, terr)
            print(f"  cena {terr}: {status}" + ("" if status == 201 else f" {json.dumps(resp)[:300]}"))
        # 2) Reszta swiata: equalizacja od price pointu USA
        eq = get_all(f"/v1/subscriptionPricePoints/{us_pp}/equalizations?limit=200&fields[subscriptionPricePoints]=customerPrice")
        done, skipped, errors = 0, 0, 0
        for pt in eq:
            # ID price pointu to base64 JSON {"s": subId, "t": "TERYTORIUM", "p": ...}
            try:
                import base64
                pad = pt["id"] + "=" * (-len(pt["id"]) % 4)
                terr = json.loads(base64.b64decode(pad)).get("t")
            except Exception:
                terr = pt.get("relationships", {}).get("territory", {}).get("data", {}).get("id")
            if not terr or terr in ("USA", "POL"):
                continue
            status, resp = set_price(sid, pt["id"], terr)
            if status == 201:
                done += 1
            elif status == 409:
                skipped += 1  # cena juz ustawiona
            else:
                errors += 1
                if errors <= 3:
                    print(f"  cena {terr}: {status} {json.dumps(resp)[:200]}")
        print(f"  equalizacja: {done} ustawione, {skipped} pominiete, {errors} bledy")
    print("PRICES OK")


def cmd_offers():
    sub_ids = get_sub_ids()
    territories = [t["id"] for t in get_all("/v1/territories?limit=200")]
    for key, p in PRODUCTS.items():
        sid = sub_ids[key]
        # API wymaga relacji territory — jedna oferta na terytorium.
        existing = set()
        for o in get_all(f"/v1/subscriptions/{sid}/introductoryOffers?include=territory&limit=200"):
            t = o.get("relationships", {}).get("territory", {}).get("data") or {}
            existing.add(t.get("id"))
        done, errors = 0, 0
        for terr in territories:
            if terr in existing:
                continue
            status, resp = req("POST", "/v1/subscriptionIntroductoryOffers", {
                "data": {"type": "subscriptionIntroductoryOffers",
                         "attributes": {"duration": p["trial"], "offerMode": "FREE_TRIAL", "numberOfPeriods": 1},
                         "relationships": {
                             "subscription": {"data": {"type": "subscriptions", "id": sid}},
                             "territory": {"data": {"type": "territories", "id": terr}}}}})
            if status == 201:
                done += 1
            else:
                errors += 1
                if errors <= 3:
                    print(f"  {terr}: {status} {json.dumps(resp)[:250]}")
        print(f"{p['productId']}: trial {p['trial']} -> {done} terytoriow OK, {len(existing)} bylo, {errors} bledow")
    print("OFFERS OK")


def cmd_status():
    sub_ids = get_sub_ids()
    for key, sid in sub_ids.items():
        status, resp = req("GET", f"/v1/subscriptions/{sid}")
        a = resp["data"]["attributes"]
        prices = get_all(f"/v1/subscriptions/{sid}/prices?include=subscriptionPricePoint,territory&limit=200")
        offers = get_all(f"/v1/subscriptions/{sid}/introductoryOffers?limit=200")
        print(f"{a['productId']}: state={a['state']} period={a['subscriptionPeriod']} prices={len(prices)} introOffers={len(offers)}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    {"setup": cmd_setup, "prices": cmd_prices, "offers": cmd_offers, "status": cmd_status}[cmd]()
