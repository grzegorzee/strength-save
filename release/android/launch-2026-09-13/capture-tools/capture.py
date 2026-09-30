from pathlib import Path
import subprocess,time,json,hashlib
ROOT=Path('/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save')
OUT=ROOT/'release/android/launch-2026-09-13'
ADB=['/Users/grzegorzjasionowicz/Library/Android/sdk/platform-tools/adb','-s','emulator-5564']
scenes=[('01-workout','workout','/workout/day-1?autostart=true'),('02-today','today','/'),('03-plan','plan','/plan'),('04-history','history','/history'),('05-results','results','/achievements?period=week&offset=-1'),('06-charts','charts','/achievements?view=analytics&tab=charts'),('07-records','records','/achievements?view=records'),('08-exercises','exercises','/exercises')]
manifest=[]
for locale in ['en-US','pl-PL']:
 for filename,scene,route in scenes:
  revision=str(time.time_ns())
  (OUT/'control.json').write_text(json.dumps({'revision':revision,'locale':'pl' if locale=='pl-PL' else 'en-US','scene':scene,'route':route}))
  start=time.monotonic()
  while time.monotonic()-start<40:
   try:
    ready=json.loads((OUT/'ready-android.json').read_text())
    if ready['revision']==revision and ready['native']=='android':break
   except (FileNotFoundError,json.JSONDecodeError):pass
   time.sleep(.5)
  else:raise RuntimeError('Native screen not ready: '+filename)
  time.sleep(3)
  target=OUT/'assets'/'phone-raw'/locale/(filename+'.png');target.parent.mkdir(parents=True,exist_ok=True)
  result=subprocess.run(ADB+['exec-out','screencap','-p'],capture_output=True,check=True)
  target.write_bytes(result.stdout)
  manifest.append({'file':str(target.relative_to(ROOT)),'sha256':hashlib.sha256(result.stdout).hexdigest(),'native':'android','emulator':'emulator-5564','resolution':'1080x1920','density':360,'apiLevel':36,'webview':'133.0.6943.137','captureRenderer':'software-only in isolated debug manifest; no app CSS change','demoData':'fictional e2e-test-user','ready':ready})
  (OUT/'android-capture-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
  print(locale,filename,'captured',flush=True)
