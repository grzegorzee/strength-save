"""Capture current WKWebView UI from disposable, locally seeded simulators."""
import json
import argparse
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'release/app-store/launch-2026-09'
DEVICES = Path('/tmp/strength-save-store-demo')
SCENES = [
    ('01-today', '/'),
    ('02-plan', '/plan'),
    ('03-workout', '/workout/day-1?autostart=true'),
    ('04-history', '/history'),
    ('05-results', '/achievements?period=week&offset=-1'),
    ('06-charts', '/achievements?view=analytics&tab=charts'),
    ('07-records', '/achievements?view=records'),
    ('08-badges', '/achievements?view=records&section=badges'),
    ('09-exercises', '/exercises'),
]

parser = argparse.ArgumentParser()
parser.add_argument('--scene', help='Capture one named scene, for example plan.')
args = parser.parse_args()
for locale in ['en-US', 'pl']:
    for name, route in SCENES:
        if args.scene and name[3:] != args.scene:
            continue
        revision = int(time.time() * 1000)
        (OUT / 'control.json').write_text(json.dumps({
            'revision': revision, 'locale': locale, 'scene': name[3:], 'route': route,
        }))
        for device in ['iphone', 'ipad']:
            ready = OUT / f'ready-{device}.json'
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                try:
                    data = json.loads(ready.read_text())
                    if data.get('revision') == str(revision) and data.get('native') == 'ios':
                        break
                except (OSError, ValueError):
                    pass
                time.sleep(.5)
            else:
                raise RuntimeError(f'Native screen not ready: {device} {locale} {name}')
            directory = OUT / 'raw' / locale / device
            directory.mkdir(parents=True, exist_ok=True)
            sid = (DEVICES / f'{device}.id').read_text().strip()
            subprocess.run(['xcrun','simctl','io',sid,'screenshot',str(directory/f'{name}.png')],
                           check=True, capture_output=True)
            (directory / f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
            print(locale, device, name, flush=True)
