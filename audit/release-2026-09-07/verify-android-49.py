from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
import struct
import subprocess
import zipfile

ROOT = Path('/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save')
LOG = ROOT / 'audit/release-2026-09-07'
EVIDENCE = ROOT / 'release/android/internal-2026-09-07'
TEMP = Path('/tmp/strength-release-20260907/android-verification')
JAVA = '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin/'
BUNDLETOOL = '/tmp/strength-release-20260907/android-tools/bundletool-all-1.18.3.jar'
ZIPALIGN = '/Users/grzegorzjasionowicz/Library/Android/sdk/build-tools/36.0.0/zipalign'
AAB = ROOT / 'android/app/build/outputs/bundle/release/app-release.aab'
EXPECTED_CERT = '8F:65:CB:13:AD:7B:7D:FE:08:71:DD:AA:CE:C3:B3:A4:52:4B:90:A4:8E:E0:95:3C:6C:37:BA:9B:E3:7A:9C:65'
TEMP.mkdir(parents=True, exist_ok=True)

def run(label, args):
    log = LOG / f'android-49-{label}.log'
    with log.open('w') as out:
        result = subprocess.run(args, cwd=ROOT, stdout=out, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError(f'{label} failed: exit {result.returncode}; inspect {log}')
    return log.read_text()

def bundle(label, *args):
    return run(label, [JAVA + 'java', '-jar', BUNDLETOOL, *args])

assert 'BUILD SUCCESSFUL' in (LOG / 'android-49-bundle-release.log').read_text()
assert 'Sync finished' in (LOG / 'android-49-cap-sync.log').read_text()
bundle('bundle-validation', 'validate', '--bundle=' + str(AAB))

manifest = {}
for key, xpath in {
    'versionCode': '/manifest/@android:versionCode',
    'versionName': '/manifest/@android:versionName',
    'packageName': '/manifest/@package',
    'minSdkVersion': '/manifest/uses-sdk/@android:minSdkVersion',
    'targetSdkVersion': '/manifest/uses-sdk/@android:targetSdkVersion',
}.items():
    manifest[key] = bundle('manifest-' + key, 'dump', 'manifest', '--bundle=' + str(AAB), '--module=base', '--xpath=' + xpath).strip()
assert manifest == {
    'versionCode': '49', 'versionName': '1.0.0',
    'packageName': 'com.grzegorzjasionowicz.strengthsave',
    'minSdkVersion': '26', 'targetSdkVersion': '36',
}, manifest

signature = run('jar-signature', [JAVA + 'jarsigner', '-verify', str(AAB)])
assert 'jar verified.' in signature, signature
assert 'unsigned entries' not in signature.lower(), 'AAB contains unsigned entries'
certificate = run('aab-certificate', [JAVA + 'keytool', '-printcert', '-jarfile', str(AAB)])
fingerprints = re.findall(r'SHA256:\s*([0-9A-F:]+)', certificate)
assert fingerprints == [EXPECTED_CERT], fingerprints

config = bundle('bundle-config', 'dump', 'config', '--bundle=' + str(AAB))
assert 'PAGE_ALIGNMENT_16K' in config, 'AAB does not request 16 KB ZIP alignment'

def metadata(data):
    return [len(data), sha256(data).hexdigest()]

def tree(directory):
    return {p.relative_to(directory).as_posix(): metadata(p.read_bytes()) for p in sorted(directory.rglob('*')) if p.is_file() and p.name != '.DS_Store'}

def summarize(entries):
    rows = [[key, *entries[key]] for key in sorted(entries)]
    return {'files': len(rows), 'bytes': sum(row[1] for row in rows), 'sha256': sha256(json.dumps(rows, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()}

def elf_load_segments(data):
    assert data[:4] == b'\x7fELF'
    bits = {1: 32, 2: 64}[data[4]]
    endian = {1: '<', 2: '>'}[data[5]]
    if bits == 64:
        offset = struct.unpack_from(endian + 'Q', data, 32)[0]
        size, count = struct.unpack_from(endian + 'HH', data, 54)
    else:
        offset = struct.unpack_from(endian + 'I', data, 28)[0]
        size, count = struct.unpack_from(endian + 'HH', data, 42)
    loads = []
    for index in range(count):
        start = offset + size * index
        if struct.unpack_from(endian + 'I', data, start)[0] != 1:
            continue
        if bits == 64:
            values = struct.unpack_from(endian + 'IIQQQQQQ', data, start)
            file_offset, address, alignment = values[2], values[3], values[7]
        else:
            values = struct.unpack_from(endian + 'IIIIIIII', data, start)
            file_offset, address, alignment = values[1], values[2], values[7]
        loads.append({'offset': file_offset, 'virtual_address': address, 'alignment': alignment})
    assert loads
    return bits, loads

baseline = tree(ROOT / 'dist')
project = tree(ROOT / 'android/app/src/main/assets/public')
with zipfile.ZipFile(AAB) as archive:
    prefix = 'base/assets/public/'
    payload = {i.filename[len(prefix):]: metadata(archive.read(i)) for i in archive.infolist() if i.filename.startswith(prefix) and not i.is_dir() and Path(i.filename).name != '.DS_Store'}
    libraries = []
    for info in archive.infolist():
        if not info.filename.endswith('.so'):
            continue
        data = archive.read(info)
        bits, segments = elf_load_segments(data)
        supports = all(s['alignment'] >= 16384 and (s['offset'] - s['virtual_address']) % 16384 == 0 for s in segments)
        if bits == 64:
            assert supports, f'ELF 16 KB alignment failed: {info.filename}'
        libraries.append({'path': info.filename, 'sha256': sha256(data).hexdigest(), 'elf_bits': bits, 'load_segments': segments, 'supports_16k': supports, 'required_64bit_check': bits == 64})
parity = {}
extras = {}
for name, entries in [('mobile-dist', baseline), ('android-project', project), ('signed-aab', payload)]:
    assert set(baseline) <= set(entries), f'Missing assets: {name}'
    extra = set(entries) - set(baseline)
    assert extra <= {'cordova.js', 'cordova_plugins.js'}, (name, extra)
    assert {k: entries[k] for k in baseline} == baseline, f'Asset content mismatch: {name}'
    parity[name] = summarize(baseline)
    extras[name] = {k: entries[k] for k in sorted(extra)}

apk_set = TEMP / 'strength-save-49-verification.apks'
bundle('generated-apk-set', 'build-apks', '--bundle=' + str(AAB), '--output=' + str(apk_set), '--overwrite')
apk_checks = []
with zipfile.ZipFile(apk_set) as archive:
    for info in archive.infolist():
        if not info.filename.endswith('.apk'):
            continue
        data = archive.read(info)
        path = TEMP / info.filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        label = 'zipalign-' + info.filename.replace('/', '-').replace('.apk', '')
        run(label, [ZIPALIGN, '-c', '-P', '16', '-v', '4', str(path)])
        apk_checks.append({'path_in_apk_set': info.filename, 'bytes': len(data), 'sha256': sha256(data).hexdigest(), 'zipalign_16k': 'PASS'})
assert apk_checks

commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
assert commit == '3c9f975b40634e83472497b331b2d4ce53bafa0b', commit
receipt = {
    'verified_at': datetime.now(timezone.utc).isoformat(),
    'source_commit': commit,
    'artifact': {'path': AAB.relative_to(ROOT).as_posix(), 'bytes': AAB.stat().st_size, 'sha256': sha256(AAB.read_bytes()).hexdigest(), **manifest},
    'build': {'configuration': 'Release', 'jdk': 21, 'task': ':app:bundleRelease --no-daemon', 'status': 'PASS', 'bundletool_validation': 'PASS'},
    'signing': {'jar_verification': 'PASS', 'certificate_matches_existing_upload_keystore': True, 'certificate_sha256': EXPECTED_CERT, 'trust_note': 'Upload key is self-signed; expected Java trust-chain/timestamp warnings are not Play App Signing validation.'},
    'asset_parity': parity,
    'asset_hash_algorithm': 'SHA256 of compact UTF-8 JSON sorted rows [relativePath, byteLength, fileSHA256]. All mobile dist runtime files included; Finder .DS_Store excluded; generated Cordova stubs recorded separately.',
    'native_generated_extras': extras,
    'alignment_16k': {'aab_requested_zip_alignment': 'PAGE_ALIGNMENT_16K', 'all_64bit_elf_load_segments': 'PASS', 'libraries': libraries, 'generated_apks': apk_checks, 'physical_16k_device_test': 'NOT RUN'},
    'verification_apk_set': {'path': str(apk_set), 'sha256': sha256(apk_set.read_bytes()).hexdigest(), 'signing': 'Local debug signing for packaging verification only; not uploaded or installed; distinct from Play App Signing.'},
    'tooling': {'bundletool_version': '1.18.3', 'bundletool_sha256': sha256(Path(BUNDLETOOL).read_bytes()).hexdigest(), 'zipalign_sdk_build_tools': '36.0.0'},
    'logs_directory': LOG.relative_to(ROOT).as_posix(),
    'distribution': {'track': 'internal', 'upload': 'NOT PERFORMED', 'live_highest_versionCode': 'NOT VERIFIED', 'blockers': ['Existing Google ADC lacks Android Publisher scope (403 ACCESS_TOKEN_SCOPE_INSUFFICIENT).', 'Existing Chrome cannot be attached because remote debugging is disabled.'], 'production_release': 'NOT REQUESTED / NOT PERFORMED'},
    'runtime_installation': 'NOT PERFORMED for this signed AAB; prior debug-device evidence belongs to the launch audit, not this store artifact.',
}
EVIDENCE.mkdir(parents=True, exist_ok=True)
(EVIDENCE / 'artifact.json').write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'artifact': receipt['artifact'], 'signing': 'PASS', 'asset_parity': parity, '64bit_native_libraries_checked': sum(x['elf_bits'] == 64 for x in libraries), 'generated_apks_zipalign_pass': len(apk_checks), 'receipt': (EVIDENCE / 'artifact.json').relative_to(ROOT).as_posix()}, indent=2), flush=True)
