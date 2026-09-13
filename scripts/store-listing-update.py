# /// script
# dependencies = ["pyjwt[crypto]>=2.8", "requests>=2.31"]
# ///
"""Validate or apply the reviewed bilingual launch listing. Never submits a release.

Uses ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH. Default is read-only.
--apply updates listing fields; --replace-existing also permits screenshot replacement.
Existing credentials and review contact details are never read or logged here.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'release/app-store/launch-2026-09'
spec = importlib.util.spec_from_file_location('asc_upload', ROOT / 'scripts/app-store-screenshots-upload.py')
asc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(asc)
APP = '6777446137'
VERSION = '8a088f55-9eb7-4abf-ad56-ba8fcef8cec9'
INFO = '60af6a85-b697-4e6d-a6dc-ed13cc86ed5e'
SLOTS = {'iphone': ('APP_IPHONE_67', (1320, 2868), 8),
         'ipad': ('APP_IPAD_PRO_3GEN_129', (2064, 2752), 6),
         'watch': ('APP_WATCH_SERIES_10', (416, 496), 3)}
VERSION_FIELDS = ['description', 'keywords', 'promotionalText', 'supportUrl', 'marketingUrl']
INFO_FIELDS = ['name', 'subtitle', 'privacyPolicyUrl']

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true')
parser.add_argument('--replace-existing', action='store_true')
args = parser.parse_args()
metadata = json.loads((OUT / 'metadata.json').read_text())
assets = {}
for locale, attributes in metadata.items():
    for key, limit in [('name', 30), ('subtitle', 30), ('keywords', 100), ('promotionalText', 170), ('description', 4000)]:
        assert len(attributes[key]) <= limit, f'{locale} {key} too long'
    assert len(attributes['keywords'].encode()) <= 100
    assert '\u2014' not in json.dumps(attributes, ensure_ascii=False)
    for device, (display, size, count) in SLOTS.items():
        files = sorted((OUT / 'screenshots' / locale / device).glob('*.png'))
        assert len(files) == count, (locale, device, len(files), count)
        assets[locale, device] = []
        for file in files:
            w, h, opaque = asc.png_info(file)
            assert (w, h) == size and opaque, f'Invalid asset: {file}'
            data = file.read_bytes()
            assets[locale, device].append({'name': file.name, 'path': file, 'size': len(data),
                                           'md5': hashlib.md5(data).hexdigest(),
                                           'sha256': hashlib.sha256(data).hexdigest()})
print('Validated PL/EN metadata and 34 opaque screenshots.', flush=True)

client = asc.AscClient()
version = client.get(f'/v1/appStoreVersions/{VERSION}')['data']
assert version['attributes']['appStoreState'] == 'PREPARE_FOR_SUBMISSION', 'Listing is no longer editable draft'
locals_ = asc.paged(client, f'/v1/appStoreVersions/{VERSION}/appStoreVersionLocalizations', limit=200)
infos = asc.paged(client, f'/v1/appInfos/{INFO}/appInfoLocalizations', limit=200)
if not args.apply:
    print('Current locales:', [x['attributes']['locale'] for x in locals_])
    print('DRY RUN. No remote changes. Use --apply --replace-existing to apply reviewed assets.')
    raise SystemExit(0)

backup = OUT / 'asc-public-listing-before.json'
if not backup.exists():
    backup.write_text(json.dumps({'version': {'id': VERSION, 'state': version['attributes']['appStoreState']},
        'versionLocalizations': [{'id': x['id'], 'attributes': x['attributes']} for x in locals_],
        'infoLocalizations': [{'id': x['id'], 'attributes': x['attributes']} for x in infos]}, indent=2)+'\n')
receipt = {'appId': APP, 'versionId': VERSION, 'submitted': False, 'localizations': {}, 'screenshots': []}
uploaded = []

def save_receipt():
    (OUT / 'asc-update-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')

for locale, attributes in metadata.items():
    for resource, collection, parent, relation, fields in [
        ('appStoreVersionLocalizations', locals_, VERSION, 'appStoreVersion', VERSION_FIELDS),
        ('appInfoLocalizations', infos, INFO, 'appInfo', INFO_FIELDS),
    ]:
        # ASC may create an app-info locale when its version locale is added.
        collection = asc.paged(client, f"/v1/{'appStoreVersions' if relation == 'appStoreVersion' else 'appInfos'}/{parent}/{resource}", limit=200)
        existing = next((x for x in collection if x['attributes']['locale'] == locale), None)
        attrs = {k: attributes[k] for k in fields}
        if existing:
            item = client.patch(f"/v1/{resource}/{existing['id']}", {'data': {'type': resource, 'id': existing['id'], 'attributes': attrs}})['data']
        else:
            item = client.post(f'/v1/{resource}', {'data': {'type': resource, 'attributes': {'locale': locale, **attrs},
                'relationships': {relation: {'data': {'type': 'appStoreVersions' if relation == 'appStoreVersion' else 'appInfos', 'id': parent}}}}})['data']
        if resource == 'appStoreVersionLocalizations': localization = item
    receipt['localizations'][locale] = {'id': localization['id'], 'name': attributes['name'], 'metadataUpdated': True}
    save_receipt()
    print('Metadata saved:', locale, flush=True)
    sets = asc.screenshot_sets(client, localization['id'])
    for device, (display, size, count) in SLOTS.items():
        current = next((s for s in sets if s['attributes']['screenshotDisplayType'] == display), None)
        if not current:
            current = client.post('/v1/appScreenshotSets', {'data': {'type': 'appScreenshotSets',
                'attributes': {'screenshotDisplayType': display}, 'relationships': {
                    'appStoreVersionLocalization': {'data': {'type': 'appStoreVersionLocalizations', 'id': localization['id']}}}}})['data']
        old = asc.screenshots(client, current['id'])
        old_backup = OUT / f'asc-screenshots-before-{locale}-{device}.json'
        if not old_backup.exists():
            old_backup.write_text(json.dumps([{'id': s['id'], **{k: s['attributes'].get(k) for k in
                ['fileName', 'sourceFileChecksum', 'imageAsset', 'assetDeliveryState']}} for s in old], indent=2)+'\n')
        desired = {(a['name'], a['md5']) for a in assets[locale, device]}
        keep = {}
        for shot in old:
            key = (shot['attributes'].get('fileName'), shot['attributes'].get('sourceFileChecksum'))
            if key in desired and asc.state_of(shot) in ('COMPLETE', 'UPLOAD_COMPLETE'):
                keep[key] = shot
            else:
                assert args.replace_existing, 'Replacing screenshots requires --replace-existing'
                client.delete(f"/v1/appScreenshots/{shot['id']}")
        ordered = []
        for asset in assets[locale, device]:
            shot = keep.get((asset['name'], asset['md5']))
            if not shot:
                shot = asc.upload_asset(client, current['id'], asset)
            ordered.append({'type': 'appScreenshots', 'id': shot['id']})
            uploaded.append(shot)
            receipt['screenshots'].append({'locale': locale, 'device': device, 'name': asset['name'],
                'id': shot['id'], 'setId': current['id'], 'sha256': asset['sha256'], 'size': size})
            save_receipt()
            print('Uploaded:', locale, device, asset['name'], flush=True)
        # Relationship updates return 204 No Content, unlike resource PATCH.
        client.request('PATCH', f"/v1/appScreenshotSets/{current['id']}/relationships/appScreenshots", body={'data': ordered})

asc.wait_for_delivery(client, uploaded)
for shot in receipt['screenshots']:
    shot['state'] = asc.state_of(client.get(f"/v1/appScreenshots/{shot['id']}")['data'])
for locale, attrs in metadata.items():
    item = client.get(f"/v1/appStoreVersionLocalizations/{receipt['localizations'][locale]['id']}")['data']['attributes']
    assert all(item[k] == attrs[k] for k in VERSION_FIELDS), f'Readback mismatch: {locale}'
receipt['verified'] = True
save_receipt()
print('Verified: both localizations, 34 delivered screenshots. No App Review submission.', flush=True)
