from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import plistlib
import re
import subprocess
import zipfile

root = Path.cwd()
audit = root / 'audit/launch-2026-09-06'
context = json.loads((audit / 'native-refresh-after-copy-context.json').read_text())
previous_path = context['previous_artifacts']['native-build-receipt.json']
previous = json.loads((audit / previous_path).read_text())
app = Path('/tmp/strength-launch-audit-20260906/ios/Build/Products/Debug-iphonesimulator/App.app')
apk = root / 'android/app/build/outputs/apk/debug/app-debug.apk'

assert '** BUILD SUCCEEDED **' in (audit / 'final-ios-build.log').read_text()
assert 'BUILD SUCCESSFUL' in (audit / 'final-android-build.log').read_text()
assert 'Sync finished' in (audit / 'final-mobile-sync.log').read_text()

def entries_from_tree(directory):
    result = {}
    for path in sorted(directory.rglob('*')):
        if path.is_file():
            data = path.read_bytes()
            result[path.relative_to(directory).as_posix()] = [len(data), sha256(data).hexdigest()]
    return result

def summarize(entries):
    ordered = [[name, *entries[name]] for name in sorted(entries)]
    return {
        'files': len(ordered),
        'bytes': sum(row[1] for row in ordered),
        'sha256': sha256(json.dumps(ordered, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest(),
    }

trees = {
    'mobile-dist': entries_from_tree(root / 'dist'),
    'ios-project': entries_from_tree(root / 'ios/App/App/public'),
    'ios-built-app': entries_from_tree(app / 'public'),
    'android-project': entries_from_tree(root / 'android/app/src/main/assets/public'),
}
with zipfile.ZipFile(apk) as archive:
    apk_public = {}
    prefix = 'assets/public/'
    for info in archive.infolist():
        if info.filename.startswith(prefix) and not info.is_dir():
            data = archive.read(info)
            apk_public[info.filename[len(prefix):]] = [len(data), sha256(data).hexdigest()]
    trees['android-built-apk'] = apk_public

finder_metadata = {}
for name, entries in trees.items():
    finder_metadata[name] = {
        key: entries.pop(key)
        for key in list(entries)
        if Path(key).name == '.DS_Store'
    }

baseline = trees['mobile-dist']
parity = {}
extras = {}
for name, entries in trees.items():
    missing = set(baseline) - set(entries)
    unexpected = set(entries) - set(baseline) - {'cordova.js', 'cordova_plugins.js'}
    assert not missing and not unexpected, (name, sorted(missing), sorted(unexpected))
    selected = {key: entries[key] for key in baseline}
    assert selected == baseline, f'Mobile asset mismatch: {name}'
    parity[name] = summarize(selected)
    extras[name] = {key: entries[key] for key in sorted(set(entries) - set(baseline))}

info = plistlib.loads((app / 'Info.plist').read_bytes())
assert info['CFBundleShortVersionString'] == '1.0.0'
assert info['CFBundleVersion'] == '142'
aapt = Path('/Users/grzegorzjasionowicz/Library/Android/sdk/build-tools/36.0.0/aapt')
badging = subprocess.check_output([str(aapt), 'dump', 'badging', str(apk)], text=True).splitlines()[0]
android = dict(re.findall(r"(?:^|\s)(name|versionCode|versionName)='([^']*)'", badging))
assert android['versionCode'] == '48' and android['versionName'] == '1.0.0'
assert android['name'] == info['CFBundleIdentifier']

copy = {
    'pl': 'Przygotuj ciało do pierwszych serii.',
    'en': 'Get ready for your first sets.',
}
bundles = '\n'.join(path.read_text() for path in (root / 'dist/assets').glob('*.js'))
assert all(text in bundles for text in copy.values()), 'Final copy missing from mobile bundle'

receipt = {
    'verified_at': datetime.now(timezone.utc).isoformat(),
    'base_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'working_tree': 'local uncommitted audit fixes',
    'scope': 'Fresh simulator/debug compilation after final warmup copy; prior runtime smoke is recorded separately. No distribution or physical-device signoff.',
    'refresh': {
        'reason': 'Final warmup firstWhy copy in PL/EN',
        'started_at': context['started_at'],
        'previous_receipt': previous_path,
        'previous_logs': context['previous_artifacts'],
        'previous_ios_app': context['previous_ios_app'],
        'mobile_sync_log': 'final-mobile-sync.log',
        'final_copy_present_in_mobile_bundle': {lang: True for lang in copy},
        'source_locale_sha256': {
            f'src/i18n/locales/{lang}.ts': sha256((root / f'src/i18n/locales/{lang}.ts').read_bytes()).hexdigest()
            for lang in copy
        },
    },
    'ios': {
        'version': info['CFBundleShortVersionString'],
        'build': info['CFBundleVersion'],
        'bundle_id': info['CFBundleIdentifier'],
        'configuration': 'Debug iphonesimulator',
        'sdk': info.get('DTSDKName'),
        'app_path': str(app),
        'app_executable_sha256': sha256((app / info['CFBundleExecutable']).read_bytes()).hexdigest(),
        'code_signing_allowed': False,
        'installed_after_copy': False,
        'simulator': previous['ios']['simulator'],
        'build_log': 'final-ios-build.log',
    },
    'android': {
        **android,
        'configuration': 'Debug',
        'apk_sha256': sha256(apk.read_bytes()).hexdigest(),
        'apk_bytes': apk.stat().st_size,
        'signing': 'standard debug keystore; no release signing',
        'installed_after_copy': False,
        'build_log': 'final-android-build.log',
    },
    'mobile_asset_parity': parity,
    'mobile_asset_hash_algorithm': 'SHA256 of compact UTF-8 JSON sorted rows [relativePath, byteLength, fileSHA256]; all mobile-dist runtime files included. Finder .DS_Store metadata excluded and recorded separately; native-only Cordova stubs recorded separately.',
    'excluded_finder_metadata': finder_metadata,
    'native_generated_extras': extras,
    'previous_runtime_smoke': {
        'receipt': previous_path,
        'verified_at': previous['verified_at'],
        'scope': previous['scope'],
        'ios_device': previous['ios'].get('device'),
        'android_device': previous['android'].get('device'),
        'repeated_after_copy': False,
        'note': 'Prior unauthenticated login/keyboard smoke predates this copy-only refresh. Android AVD not started; iOS simulator left running.',
    },
    'signed_ipa_aab': 'Historical artifacts predating these fixes; not rebuilt or uploaded.',
    'physical_device_qa': 'NOT RUN',
}
(audit / 'native-build-receipt.json').write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'parity': parity, 'ios': receipt['ios']['build'], 'android': android, 'apk_sha256': receipt['android']['apk_sha256'], 'final_copy_present': True}, indent=2))
