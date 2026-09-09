#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-auth>=2.40,<3", "requests>=2.32,<3", "pycountry>=24.6"]
# ///
"""Mirror the reviewed iOS catalog into Google Play. Defaults to plan-only.

Requires a registered Play payments profile. --apply creates missing products,
checks existing prices/trials without changing them, then activates base plans
and offers. Never publishes an application release or changes Apple products.
"""
import argparse
from datetime import date, datetime, timezone
from decimal import Decimal
import json
from pathlib import Path
import pycountry
from google_play_check import PACKAGE_NAME, SERVICE_ACCOUNT

ROOT = f'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE_NAME}'
DEFAULT_REFERENCE = Path('audit/android-2026-09-09/ios-billing-reference.json')
POLICY = {
    'monthly': ('ONE_MONTH', 'P1M', 'ONE_WEEK', 'P7D', '7', 'PRO Monthly', 'PRO Miesięczny'),
    'yearly': ('ONE_YEAR', 'P1Y', 'TWO_WEEKS', 'P14D', '14', 'PRO Yearly', 'PRO Roczny'),
}


def money(currency, amount):
    value = Decimal(str(amount))
    if not value.is_finite() or value < 0:
        raise ValueError('Price must be a nonnegative finite amount')
    units = int(value)
    return {'currencyCode': currency, 'units': str(units), 'nanos': int((value - units) * 1_000_000_000)}


def build_catalog(reference, conversions):
    """Use identical retail prices where both stores support the same currency."""
    if reference.get('gracePeriod', {}).get('optIn') is not False:
        raise ValueError('Unknown or changed iOS grace period needs a reviewed policy')
    catalog = []
    today = date.today().isoformat()
    for key, (apple_period, period, apple_trial, trial, days, en, pl) in POLICY.items():
        source = reference['products'][key]
        if source['attributes']['subscriptionPeriod'] != apple_period:
            raise ValueError('Changed iOS period needs a new reviewed policy')
        product = source['attributes']['productId']
        if product != 'strengthsave_pro_' + key:
            raise ValueError('Unexpected product identity')
        prices = {}
        for row in source['prices']:
            if row['startDate'] is None or row['startDate'] <= today:
                previous = prices.get(row['territory'])
                if previous is None or (row['startDate'] or '') > (previous['startDate'] or ''):
                    prices[row['territory']] = row
        trial_territories = set()
        for offer in source['offers']:
            attrs = offer['attributes']
            if attrs.get('startDate', '') > today or (attrs.get('endDate') and attrs['endDate'] < today):
                continue
            if (attrs['offerMode'], attrs['duration'], attrs['numberOfPeriods']) != ('FREE_TRIAL', apple_trial, 1):
                raise ValueError('Changed iOS trial needs a new reviewed policy')
            trial_territories.add(offer['relationships']['territory']['data']['id'])
        converted = conversions[key]
        regions, trial_regions, differences = [], [], []
        for territory, row in sorted(prices.items()):
            country = pycountry.countries.get(alpha_3=territory)
            code = country.alpha_2 if country else ('XK' if territory == 'XKS' else None)
            store = converted['convertedRegionPrices'].get(code)
            if not store:
                continue
            apple_currency = reference['territories'][territory]['currency']
            price = money(apple_currency, row['price'])
            if price['currencyCode'] != store['price']['currencyCode']:
                differences.append({'region': code, 'appleCurrency': apple_currency, 'playCurrency': store['price']['currencyCode'], 'reason': 'Different store currency; Google regional conversion from matching USD price'})
                price = store['price']
            regions.append({'regionCode': code, 'price': price, 'newSubscriberAvailability': True})
            if territory in trial_territories:
                trial_regions.append(code)
        if not regions or not trial_regions:
            raise ValueError('No common priced regions with a verified iOS trial')
        base = {'basePlanId': key, 'autoRenewingBasePlanType': {'billingPeriodDuration': period, 'gracePeriodDuration': 'P0D'}, 'regionalConfigs': regions}
        subscription = {'packageName': PACKAGE_NAME, 'productId': product, 'basePlans': [base], 'listings': [
            {'languageCode': 'en-US', 'title': en, 'description': 'Full access to Strength Save PRO.'},
            {'languageCode': 'pl-PL', 'title': pl, 'description': 'Pełny dostęp do Strength Save PRO.'},
        ]}
        offer = {'packageName': PACKAGE_NAME, 'productId': product, 'basePlanId': key, 'offerId': 'trial-' + days + 'd',
                 'targeting': {'acquisitionRule': {'scope': {'anySubscriptionInApp': {}}}},
                 'regionalConfigs': [{'regionCode': c, 'newSubscriberAvailability': True} for c in trial_regions],
                 'phases': [{'duration': trial, 'recurrenceCount': 1, 'regionalConfigs': [{'regionCode': c, 'free': {}} for c in trial_regions]}]}
        catalog.append({'subscription': subscription, 'offer': offer, 'regionsVersion': converted['regionVersion']['version'], 'currencyDifferences': differences})
    return catalog


def api(session, method, url, **kwargs):
    response = session.request(method, url, timeout=45, **kwargs)
    if response.status_code >= 400:
        try:
            message = response.json()['error']['message']
        except (ValueError, KeyError):
            message = response.reason
        raise RuntimeError(f'{method} {url}: HTTP {response.status_code}: {message}')
    return response.json() if response.content else {}


def subset_matches(expected, actual):
    if isinstance(expected, dict):
        # Google Money is ProtoJSON: zero units/nanos may be omitted on readback.
        if 'currencyCode' in expected and set(expected) <= {'currencyCode', 'units', 'nanos'}:
            if not isinstance(actual, dict) or actual.get('currencyCode') != expected['currencyCode']:
                return False
            try:
                return all(int(expected.get(k, 0)) == int(actual.get(k, 0)) for k in ('units', 'nanos'))
            except (TypeError, ValueError):
                return False
        return isinstance(actual, dict) and all(k in actual and subset_matches(v, actual[k]) for k, v in expected.items())
    if isinstance(expected, list):
        # Region/listing order returned by Play is not stable.
        return isinstance(actual, list) and len(expected) == len(actual) and all(any(subset_matches(e, a) for a in actual) for e in expected)
    return expected == actual


def apply_catalog(session, catalog):
    # Complete creation/validation before making any offer available.
    prepared = []
    for item in catalog:
        sub, offer = item['subscription'], item['offer']
        url = ROOT + '/subscriptions/' + sub['productId']
        r = session.get(url, timeout=45)
        if r.status_code == 404:
            current = api(session, 'POST', ROOT + '/subscriptions', params={'productId': sub['productId'], 'regionsVersion.version': item['regionsVersion']}, json=sub)
        else:
            r.raise_for_status(); current = r.json()
        if not subset_matches(sub, current):
            raise RuntimeError('Existing subscription differs; refusing to overwrite live prices: ' + sub['productId'])
        offer_url = url + '/basePlans/' + offer['basePlanId'] + '/offers/' + offer['offerId']
        r = session.get(offer_url, timeout=45)
        if r.status_code == 404:
            current_offer = api(session, 'POST', offer_url.rsplit('/', 1)[0], params={'offerId': offer['offerId'], 'regionsVersion.version': item['regionsVersion']}, json=offer)
        else:
            r.raise_for_status(); current_offer = r.json()
        if not subset_matches(offer, current_offer):
            raise RuntimeError('Existing trial differs; refusing to overwrite: ' + offer['offerId'])
        prepared.append((item, current, current_offer, url, offer_url))
    verified = []
    for item, current, current_offer, url, offer_url in prepared:
        base = item['offer']['basePlanId']
        if current['basePlans'][0]['state'] != 'ACTIVE':
            api(session, 'POST', url + '/basePlans/' + base + ':activate', json={})
        if current_offer['state'] != 'ACTIVE':
            api(session, 'POST', offer_url + ':activate', json={})
        sub = api(session, 'GET', url)
        offer = api(session, 'GET', offer_url)
        if sub['basePlans'][0]['state'] != 'ACTIVE' or offer['state'] != 'ACTIVE':
            raise RuntimeError('Activation not confirmed')
        if not subset_matches(item['subscription'], sub) or not subset_matches(item['offer'], offer):
            raise RuntimeError('Final price/trial read-back mismatch')
        verified.append({'subscription': sub, 'offer': offer})
    return verified


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path, default=DEFAULT_REFERENCE)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    import google.auth
    from google.auth import impersonated_credentials
    from google.auth.transport.requests import AuthorizedSession
    source, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    credentials = impersonated_credentials.Credentials(source_credentials=source, target_principal=SERVICE_ACCOUNT, target_scopes=['https://www.googleapis.com/auth/androidpublisher'], lifetime=900)
    reference = json.loads(args.reference.read_text())
    with AuthorizedSession(credentials) as session:
        conversions = {}
        for key in POLICY:
            usa = next(p for p in reference['products'][key]['prices'] if p['territory'] == 'USA' and p['startDate'] is None)
            conversions[key] = api(session, 'POST', ROOT + '/pricing:convertRegionPrices', json={'price': money('USD', usa['price'])})
        catalog = build_catalog(reference, conversions)
        result = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'iosReference': str(args.reference), 'applied': False, 'catalog': catalog}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
        if args.apply:
            result['readBack'] = apply_catalog(session, catalog)
            result['applied'] = True
            args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
        print(json.dumps({'applied': result['applied'], 'products': len(catalog), 'output': str(args.output)}))


if __name__ == '__main__':
    main()
