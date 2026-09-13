"""Capture the real Watch app with local fictional data on the disposable simulator."""
import json
import subprocess
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SID = (Path('/tmp/strength-save-store-demo') / 'watch.id').read_text().strip()
BUNDLE = 'com.grzegorzjasionowicz.strengthsave.watchkitapp'

def run(*args, required=True):
    return subprocess.run(['xcrun', 'simctl', *args], check=required, capture_output=True)

for locale in ['en-US', 'pl']:
    polish = locale == 'pl'
    for scene in ['plan', 'active', 'finished']:
        run('terminate', SID, BUNDLE, required=False)
        exercises = [
            ('ex-1-1', 'Wyciskanie hantli (Lekki skos)' if polish else 'Incline dumbbell press', 34, 8),
            ('ex-1-2', 'Przysiad ze sztangą (High Bar)' if polish else 'High bar squat', 102.5, 6),
            ('ex-1-3', 'Wiosłowanie hantlami na ławce (przodem)' if polish else 'Chest supported dumbbell row', 32, 10),
        ]
        payload = {
            'v': 1, 'protocolVersion': 1, 'type': 'todayWorkout', 'date': date.today().isoformat(),
            'uid': 'store-demo-user', 'dayId': 'demo-day', 'dayName': 'Trening A' if polish else 'Workout A',
            'focus': 'Klatka / Nogi / Plecy' if polish else 'Chest / Legs / Back',
            'sentAt': time.time()*1000, 'active': scene != 'plan',
            'healthFeaturesEnabled': False, 'timersEnabled': True, 'restSeconds': 90,
            'unit': 'kg', 'lang': 'pl' if polish else 'en',
            'capability': {'v': 1, 'active': True, 'tier': 'yearly'},
            'exercises': [{'id': eid, 'name': name, 'setsLabel': f'3 x {reps}',
                           'sets': [{'reps': reps, 'weight': weight,
                                     'completed': scene == 'finished' or (scene == 'active' and i == 0 and j < 2)}
                                    for j in range(3)]}
                          for i, (eid, name, weight, reps) in enumerate(exercises)],
        }
        run('spawn', SID, 'defaults', 'write', BUNDLE, 'watch.workoutPayload', '-data', json.dumps(payload).encode().hex())
        session = f"{payload['date']}|demo-day"
        run('spawn', SID, 'defaults', 'write', BUNDLE, 'watch.sessionStarted.v1',
            '-dict', 'key', '-string', session, 'at', '-float', str(time.time()*1000 - 480000))
        if scene == 'finished':
            run('spawn', SID, 'defaults', 'write', BUNDLE, 'watch.localFinish', '-string', session)
        else:
            run('spawn', SID, 'defaults', 'delete', BUNDLE, 'watch.localFinish', required=False)
        run('launch', SID, BUNDLE)
        time.sleep(4)
        output = ROOT / 'release/app-store/launch-2026-09/raw' / locale / 'watch'
        output.mkdir(parents=True, exist_ok=True)
        run('io', SID, 'screenshot', str(output / f'{scene}.png'))
        print(locale, scene, flush=True)
