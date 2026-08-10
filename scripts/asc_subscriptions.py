#!/usr/bin/env python3
# Tworzy produkty subskrypcji Strength Save PRO w App Store Connect przez ASC API.
# X25/Z207: monthly 14,99 PLN / 3.99 USD + 7 dni; yearly 119,99 PLN /
# 31.99 USD + 14 dni. Reszta terytoriow: equalizacja Apple od ceny USA.
# Zmiany cen sa planowane z dwudniowym wyprzedzeniem; niezmienne oferty intro sa
# usuwane i odtwarzane tylko tam, gdzie read-back wykazuje stary kontrakt.
#
# Uzycie:
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py setup
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py prices
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py offers
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py dry-run
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py apply
#   uv run --with pyjwt --with cryptography python scripts/asc_subscriptions.py status
import base64
import datetime
import os
import sys
import time
import json
import urllib.request
import urllib.error
import urllib.parse
import jwt

KEY_ID = "UD43687FB9"
ISSUER = "c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9"
KEY = "/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8"
APP_ID = "6777446137"
BASE = "https://api.appstoreconnect.apple.com"

GROUP_NAME = "Strength Save PRO"
PRICE_START_DATE = os.environ.get(
    "X25_PRICE_START_DATE",
    (datetime.date.today() + datetime.timedelta(days=2)).isoformat(),
)
PRODUCTS = {
    "monthly": {
        "productId": "strengthsave_pro_monthly",
        "name": "PRO Monthly",
        "period": "ONE_MONTH",
        "trial": "ONE_WEEK",
        "price_pl": "14.99",
        "price_us": "3.99",
        "loc": {
            "en-US": ("PRO Monthly", "Full access: unlimited plans, AI Coach, analytics."),
            "pl": ("PRO Miesięczny", "Nielimitowane plany, Trener AI, pełna analityka."),
        },
    },
    "yearly": {
        "productId": "strengthsave_pro_yearly",
        "name": "PRO Yearly",
        "period": "ONE_YEAR",
        "trial": "TWO_WEEKS",
        "price_pl": "119.99",
        "price_us": "31.99",
        "loc": {
            "en-US": ("PRO Yearly", "Full access for one year."),
            "pl": ("PRO Roczny", "Pełny dostęp przez rok."),
        },
    },
}
GROUP_LOC = {"en-US": "Strength Save PRO", "pl": "Strength Save PRO"}


def token():
    return jwt.encode(
        {"iss": ISSUER, "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        open(KEY).read(), algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def req(method, path, body=None):
    attempts = 4 if method == "GET" else 3
    for attempt in range(attempts):
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(
            BASE + path,
            data=data,
            method=method,
            headers={
                "Authorization": "Bearer " + token(),
                "Content-Type": "application/json",
            },
        )
        try:
            response = urllib.request.urlopen(request)
            raw = response.read()
            return response.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as error:
            raw = error.read()
            payload = json.loads(raw) if raw else {}
            retryable = error.code == 429 or (
                method == "GET" and error.code in (500, 502, 503, 504)
            )
            if retryable and attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
                continue
            return error.code, payload
        except urllib.error.URLError as error:
            if method == "GET" and attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
                continue
            return 0, {"error": str(error)}


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


def get_all_with_included(path):
    """GET z paginacja, zachowujac zasoby z `included` potrzebne do read-backu."""
    items = []
    included = {}
    url = path
    while url:
        status, resp = req("GET", url)
        if status != 200:
            die(f"GET {url} -> {status}", resp)
        items.extend(resp.get("data", []))
        for resource in resp.get("included", []):
            included[resource["id"]] = resource
        nxt = resp.get("links", {}).get("next")
        url = nxt.replace(BASE, "") if nxt else None
    return items, included


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


def territory_from_price_point(price_point):
    try:
        padded = price_point["id"] + "=" * (-len(price_point["id"]) % 4)
        return json.loads(base64.b64decode(padded)).get("t")
    except Exception:
        return (price_point.get("relationships", {}).get("territory", {}).get("data") or {}).get("id")


def desired_price_points(sub_id, product):
    """Jawne USA/POL plus pozostale storefronty z equalizacji wybranego USD."""
    us_point = find_price_point(sub_id, "USA", product["price_us"])
    pl_point = find_price_point(sub_id, "POL", product["price_pl"])
    targets = {
        "USA": {"id": us_point, "price": product["price_us"]},
        "POL": {"id": pl_point, "price": product["price_pl"]},
    }
    equalized = get_all(
        f"/v1/subscriptionPricePoints/{us_point}/equalizations"
        "?limit=200&fields[subscriptionPricePoints]=customerPrice"
    )
    for point in equalized:
        territory = territory_from_price_point(point)
        if territory and territory not in ("USA", "POL"):
            targets[territory] = {
                "id": point["id"],
                "price": point["attributes"]["customerPrice"],
            }
    return targets


def get_price_records(sub_id):
    prices, included = get_all_with_included(
        f"/v1/subscriptions/{sub_id}/prices"
        "?include=subscriptionPricePoint,territory&limit=200"
    )
    records = []
    for price in prices:
        relationships = price.get("relationships", {})
        point_ref = relationships.get("subscriptionPricePoint", {}).get("data") or {}
        territory_ref = relationships.get("territory", {}).get("data") or {}
        point = included.get(point_ref.get("id"), {})
        territory = included.get(territory_ref.get("id"), {}).get("id", territory_ref.get("id"))
        records.append({
            "id": price["id"],
            "territory": territory,
            "price": point.get("attributes", {}).get("customerPrice"),
            "startDate": price.get("attributes", {}).get("startDate"),
        })
    return records


def price_actions(sub_id, product):
    targets = desired_price_points(sub_id, product)
    records = get_price_records(sub_id)
    by_territory = {}
    for record in records:
        by_territory.setdefault(record["territory"], []).append(record)
    actions = []
    for territory, target in targets.items():
        current = by_territory.get(territory, [])
        exact = [r for r in current if r["price"] == target["price"]]
        wrong_future = [
            r for r in current
            if r["startDate"] is not None and r["price"] != target["price"]
        ]
        if exact and not wrong_future:
            continue
        actions.append({
            "territory": territory,
            "target": target,
            "delete": wrong_future,
            "create": not exact,
        })
    return actions, targets, records


def set_price(sub_id, price_point_id):
    # Terytorium wynika z price pointu; startDate planuje bezpieczna zmiane ceny.
    status, resp = req("POST", "/v1/subscriptionPrices", {
        "data": {"type": "subscriptionPrices",
                 "attributes": {
                     "startDate": PRICE_START_DATE,
                     "preserveCurrentPrice": False,
                 },
                 "relationships": {
                     "subscription": {"data": {"type": "subscriptions", "id": sub_id}},
                     "subscriptionPricePoint": {"data": {"type": "subscriptionPricePoints", "id": price_point_id}}}}})
    return status, resp


def apply_prices(sub_ids):
    total_created = 0
    total_deleted = 0
    for key, product in PRODUCTS.items():
        sid = sub_ids[key]
        actions, targets, _ = price_actions(sid, product)
        print(f"{product['productId']}: price changes={len(actions)}/{len(targets)} start={PRICE_START_DATE}")
        for action in actions:
            for old in action["delete"]:
                status, resp = req("DELETE", f"/v1/subscriptionPrices/{old['id']}")
                if status != 204:
                    die(f"delete scheduled price {action['territory']} -> {status}", resp)
                total_deleted += 1
            if action["create"]:
                status, resp = set_price(sid, action["target"]["id"])
                if status != 201:
                    die(f"set price {action['territory']} -> {status}", resp)
                total_created += 1
            if (total_created + total_deleted) % 50 == 0:
                print(f"  price progress: created={total_created} deleted={total_deleted}", flush=True)
    print(f"PRICES APPLY OK created={total_created} deletedScheduled={total_deleted}")


def get_offer_map(sub_id):
    offers = get_all(
        f"/v1/subscriptions/{sub_id}/introductoryOffers?include=territory&limit=200"
    )
    result = {}
    for offer in offers:
        territory = (
            offer.get("relationships", {}).get("territory", {}).get("data") or {}
        ).get("id")
        if territory:
            result.setdefault(territory, []).append(offer)
    return result


def offer_actions(sub_id, product, territories):
    existing = get_offer_map(sub_id)
    expected = (product["trial"], "FREE_TRIAL", 1)
    actions = []
    for territory in territories:
        offers = existing.get(territory, [])
        exact = [
            offer for offer in offers
            if (
                offer["attributes"].get("duration"),
                offer["attributes"].get("offerMode"),
                offer["attributes"].get("numberOfPeriods"),
            ) == expected
        ]
        wrong = [offer for offer in offers if offer not in exact]
        if len(exact) == 1 and not wrong:
            continue
        actions.append({
            "territory": territory,
            "delete": wrong + exact[1:],
            "create": len(exact) == 0,
        })
    return actions, existing


def create_offer(sub_id, product, territory):
    return req("POST", "/v1/subscriptionIntroductoryOffers", {
        "data": {"type": "subscriptionIntroductoryOffers",
                 "attributes": {
                     "duration": product["trial"],
                     "offerMode": "FREE_TRIAL",
                     "numberOfPeriods": 1,
                 },
                 "relationships": {
                     "subscription": {"data": {"type": "subscriptions", "id": sub_id}},
                     "territory": {"data": {"type": "territories", "id": territory}}}}})


def apply_offers(sub_ids):
    territories = [t["id"] for t in get_all("/v1/territories?limit=200")]
    total_created = 0
    total_deleted = 0
    for key, product in PRODUCTS.items():
        sid = sub_ids[key]
        actions, _ = offer_actions(sid, product, territories)
        print(f"{product['productId']}: offer changes={len(actions)}/{len(territories)} target={product['trial']}")
        for action in actions:
            for old in action["delete"]:
                status, resp = req("DELETE", f"/v1/subscriptionIntroductoryOffers/{old['id']}")
                if status != 204:
                    die(f"delete intro {action['territory']} -> {status}", resp)
                total_deleted += 1
            if action["create"]:
                status, resp = create_offer(sid, product, action["territory"])
                if status != 201:
                    die(f"create intro {action['territory']} -> {status}", resp)
                total_created += 1
            if (total_created + total_deleted) % 50 == 0:
                print(f"  offer progress: created={total_created} deleted={total_deleted}", flush=True)
        print(f"  done: created={total_created} deleted={total_deleted}")
    print(f"OFFERS APPLY OK created={total_created} deleted={total_deleted}")


def cmd_setup():
    gid = find_or_create_group()
    ensure_group_localizations(gid)
    sub_ids = find_or_create_subscriptions(gid)
    ensure_sub_localizations(sub_ids)
    print("SETUP OK", json.dumps(sub_ids))


def cmd_prices():
    apply_prices(get_sub_ids())


def cmd_offers():
    apply_offers(get_sub_ids())


def build_plan(sub_ids):
    territories = [t["id"] for t in get_all("/v1/territories?limit=200")]
    plan = {}
    for key, product in PRODUCTS.items():
        price_changes, price_targets, price_records = price_actions(sub_ids[key], product)
        offer_changes, offers = offer_actions(sub_ids[key], product, territories)
        plan[key] = {
            "product": product,
            "priceChanges": price_changes,
            "priceTargets": price_targets,
            "priceRecords": price_records,
            "offerChanges": offer_changes,
            "offers": offers,
            "territories": territories,
        }
    return plan


def print_plan(plan, label):
    price_changes = 0
    offer_changes = 0
    for key, item in plan.items():
        product = item["product"]
        price_changes += len(item["priceChanges"])
        offer_changes += len(item["offerChanges"])
        samples = {}
        for territory in ("POL", "USA"):
            samples[territory] = [
                {"price": row["price"], "startDate": row["startDate"]}
                for row in item["priceRecords"]
                if row["territory"] == territory
            ]
        offer_summary = {}
        for offers in item["offers"].values():
            for offer in offers:
                attrs = offer["attributes"]
                signature = (
                    attrs.get("duration"),
                    attrs.get("offerMode"),
                    attrs.get("numberOfPeriods"),
                )
                offer_summary[signature] = offer_summary.get(signature, 0) + 1
        print(
            f"{label} {key}: target POL={product['price_pl']} USA={product['price_us']} "
            f"trial={product['trial']} priceChanges={len(item['priceChanges'])}/"
            f"{len(item['priceTargets'])} offerChanges={len(item['offerChanges'])}/"
            f"{len(item['territories'])} samples={json.dumps(samples)} offers={offer_summary}"
        )
    return price_changes, offer_changes


def cmd_dry_run():
    plan = build_plan(get_sub_ids())
    price_changes, offer_changes = print_plan(plan, "DRY_RUN")
    print(
        f"DRY_RUN TOTAL priceChanges={price_changes} offerChanges={offer_changes} "
        f"priceStart={PRICE_START_DATE}"
    )


def cmd_apply():
    sub_ids = get_sub_ids()
    plan = build_plan(sub_ids)
    price_changes, offer_changes = print_plan(plan, "BEFORE")
    if price_changes:
        apply_prices(sub_ids)
    if offer_changes:
        apply_offers(sub_ids)
    ensure_sub_localizations(sub_ids)
    verified = build_plan(sub_ids)
    remaining_prices, remaining_offers = print_plan(verified, "READ_BACK")
    if remaining_prices or remaining_offers:
        die(f"read-back mismatch: prices={remaining_prices} offers={remaining_offers}")
    print("APPLY + READ_BACK OK")


def cmd_status():
    sub_ids = get_sub_ids()
    plan = build_plan(sub_ids)
    print_plan(plan, "STATUS")
    for key, sid in sub_ids.items():
        status, resp = req("GET", f"/v1/subscriptions/{sid}")
        a = resp["data"]["attributes"]
        prices = plan[key]["priceRecords"]
        offers = sum(len(value) for value in plan[key]["offers"].values())
        print(f"{a['productId']}: state={a['state']} period={a['subscriptionPeriod']} prices={len(prices)} introOffers={offers}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    {
        "setup": cmd_setup,
        "prices": cmd_prices,
        "offers": cmd_offers,
        "dry-run": cmd_dry_run,
        "apply": cmd_apply,
        "status": cmd_status,
    }[cmd]()
