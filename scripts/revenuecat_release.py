#!/usr/bin/env python3
"""Idempotentny kontrakt RevenueCat dla X25.

`status` jest read-only. `apply` nie tworzy aplikacji Google Play bez uprzednio
podlaczonych w RevenueCat credentials Play; kiedy aplikacja istnieje, tworzy
brakujace mapowania produkt:basePlan i dopina Apple+Google do tego samego
entitlementu oraz pakietow offeringu.
"""

import json
import os
import ssl
import sys
import urllib.error
import urllib.request


BASE = "https://api.revenuecat.com/v2"
PROJECT_ID = "proj67cb081f"
ENTITLEMENT_KEY = "pro"
OFFERING_KEY = "default"

PRODUCTS = {
    "$rc_monthly": {
        "apple": "strengthsave_pro_monthly",
        "google": "strengthsave_pro_monthly:monthly",
        "name": "PRO Monthly",
    },
    "$rc_annual": {
        "apple": "strengthsave_pro_yearly",
        "google": "strengthsave_pro_yearly:yearly",
        "name": "PRO Yearly",
    },
}
SSL_CONTEXT = ssl.create_default_context(
    cafile=os.environ.get("SSL_CERT_FILE", "/etc/ssl/cert.pem")
)


def die(message, code=1):
    print(message)
    raise SystemExit(code)


def secret():
    value = os.environ.get("STRENGTHSAVE_REVENUECAT_SECRET_KEY", "")
    if not value.startswith("sk_"):
        die("Brak klucza RevenueCat v2 w STRENGTHSAVE_REVENUECAT_SECRET_KEY")
    return value


def request(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + secret(),
            "Content-Type": "application/json",
        },
    )
    try:
        response = urllib.request.urlopen(req, context=SSL_CONTEXT)
        raw = response.read()
        return response.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, (json.loads(raw) if raw else {})


def expect(method, path, body=None, ok=(200,)):
    status, payload = request(method, path, body)
    if status not in ok:
        die(f"RevenueCat {method} {path} -> {status}: {json.dumps(payload)[:800]}")
    return payload


def list_all(path):
    items = []
    next_path = path
    while next_path:
        payload = expect("GET", next_path)
        items.extend(payload.get("items", []))
        next_path = payload.get("next_page")
    return items


def snapshot():
    root = f"/projects/{PROJECT_ID}"
    apps = list_all(root + "/apps?limit=100")
    products = list_all(root + "/products?limit=100")
    entitlements = list_all(root + "/entitlements?limit=100")
    offerings = list_all(
        root
        + "/offerings?limit=100&expand=items.package&expand=items.package.product"
    )

    entitlement = next(
        (item for item in entitlements if item.get("lookup_key") == ENTITLEMENT_KEY),
        None,
    )
    offering = next(
        (item for item in offerings if item.get("lookup_key") == OFFERING_KEY),
        None,
    )
    entitlement_products = []
    if entitlement:
        entitlement_products = list_all(
            root + f"/entitlements/{entitlement['id']}/products?limit=100"
        )

    package_products = {}
    packages = ((offering or {}).get("packages") or {}).get("items", [])
    for package in packages:
        associations = (package.get("products") or {}).get("items", [])
        package_products[package.get("lookup_key")] = {
            "id": package.get("id"),
            "products": [
                association.get("product", association)
                for association in associations
            ],
        }

    return {
        "apps": apps,
        "products": products,
        "entitlement": entitlement,
        "offering": offering,
        "entitlementProducts": entitlement_products,
        "packages": package_products,
    }


def required_status(state):
    apps_by_type = {item.get("type"): item for item in state["apps"]}
    products_by_store = {
        item.get("store_identifier"): item for item in state["products"]
    }
    entitlement_ids = {item.get("id") for item in state["entitlementProducts"]}
    rows = []
    for package_key, config in PRODUCTS.items():
        package = state["packages"].get(package_key, {})
        package_ids = {item.get("id") for item in package.get("products", [])}
        for platform in ("apple", "google"):
            store_id = config[platform]
            product = products_by_store.get(store_id)
            rows.append({
                "package": package_key,
                "platform": platform,
                "storeIdentifier": store_id,
                "productId": (product or {}).get("id"),
                "inEntitlement": bool(product and product.get("id") in entitlement_ids),
                "inPackage": bool(product and product.get("id") in package_ids),
            })
    return {
        "appleApp": (apps_by_type.get("app_store") or {}).get("id"),
        "googleApp": (apps_by_type.get("google_play") or {}).get("id"),
        "entitlement": (state["entitlement"] or {}).get("lookup_key"),
        "offering": (state["offering"] or {}).get("lookup_key"),
        "currentOffering": bool((state["offering"] or {}).get("is_current")),
        "rows": rows,
    }


def cmd_status():
    status = required_status(snapshot())
    print(json.dumps(status, indent=2))
    missing = [row for row in status["rows"] if not row["productId"]]
    if status["googleApp"] is None:
        print(
            "KROK USERA: po pierwszym uploadzie Play Internal dodaj w RevenueCat "
            "aplikacje google_play com.grzegorzjasionowicz.strengthsave z Play "
            "service credentials; potem uruchom ponownie `apply`."
        )
    print(f"STATUS missingProducts={len(missing)}")


def ensure_google_products(state):
    google_app = next(
        (item for item in state["apps"] if item.get("type") == "google_play"),
        None,
    )
    if not google_app:
        die(
            "KROK USERA: RevenueCat nie ma aplikacji google_play. Najpierw Play "
            "Internal + service credentials; skrypt celowo nie tworzy pustej aplikacji.",
            2,
        )
    products_by_store = {
        item.get("store_identifier"): item for item in state["products"]
    }
    root = f"/projects/{PROJECT_ID}"
    for config in PRODUCTS.values():
        store_id = config["google"]
        if store_id in products_by_store:
            continue
        created = expect(
            "POST",
            root + "/products",
            {
                "store_identifier": store_id,
                "app_id": google_app["id"],
                "type": "subscription",
                "display_name": config["name"] + " (Google Play)",
            },
            ok=(201,),
        )
        print(f"created Google product {store_id}: {created.get('id')}")


def attach_missing(state):
    if not state["entitlement"] or not state["offering"]:
        die("Brak canonical entitlement `pro` lub offeringu `default`")
    root = f"/projects/{PROJECT_ID}"
    products_by_store = {
        item.get("store_identifier"): item for item in state["products"]
    }
    required = []
    for config in PRODUCTS.values():
        for platform in ("apple", "google"):
            product = products_by_store.get(config[platform])
            if not product:
                die(f"Brak produktu RevenueCat {config[platform]}")
            required.append(product)

    entitlement_ids = {item.get("id") for item in state["entitlementProducts"]}
    missing_entitlement = [item["id"] for item in required if item["id"] not in entitlement_ids]
    if missing_entitlement:
        expect(
            "POST",
            root
            + f"/entitlements/{state['entitlement']['id']}/actions/attach_products",
            {"product_ids": missing_entitlement},
        )
        print(f"attached to pro: {missing_entitlement}")

    for package_key, config in PRODUCTS.items():
        package = state["packages"].get(package_key)
        if not package:
            die(f"Brak package {package_key} w offeringu default")
        existing = {item.get("id") for item in package["products"]}
        wanted = [products_by_store[config[platform]] for platform in ("apple", "google")]
        missing = [item for item in wanted if item["id"] not in existing]
        if missing:
            expect(
                "POST",
                root + f"/packages/{package['id']}/actions/attach_products",
                {
                    "products": [
                        {"product_id": item["id"], "eligibility_criteria": "all"}
                        for item in missing
                    ]
                },
            )
            print(f"attached to {package_key}: {[item['id'] for item in missing]}")


def cmd_apply():
    before = snapshot()
    ensure_google_products(before)
    attach_missing(snapshot())
    after = required_status(snapshot())
    failures = [
        row for row in after["rows"]
        if not row["productId"] or not row["inEntitlement"] or not row["inPackage"]
    ]
    if failures or not after["currentOffering"]:
        die("RevenueCat read-back mismatch: " + json.dumps(failures))
    print(json.dumps(after, indent=2))
    print("APPLY + READ_BACK OK")


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "status"
    {"status": cmd_status, "apply": cmd_apply}[command]()
