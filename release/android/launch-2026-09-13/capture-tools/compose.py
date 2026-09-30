from pathlib import Path
import base64,subprocess,json,hashlib
from html import escape
root=Path('/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/release/android/launch-2026-09-13/assets')
copy={
'en-US':[
['Your last weight.','Right next to your set.'],['Know what’s next.','Start your workout.'],['Your week,','already planned.'],['Every workout,','saved in one place.'],['See your week','in numbers.'],['See how your','training adds up.'],['Keep track of','your personal bests.'],['Find the exercise.','Check the technique.']],
'pl-PL':[
['Poprzedni ciężar.','Tuż obok serii.'],['Wiesz, co dalej.','Możesz zaczynać.'],['Cały tydzień','w jednym planie.'],['Twoje treningi.','Wszystkie zapisane.'],['Tydzień treningów','w liczbach.'],['Śledź obciążenie','z tygodnia na tydzień.'],['Twoje rekordy','zawsze pod ręką.'],['Znajdź ćwiczenie.','Sprawdź technikę.']]}
manifest=[]
for locale in ['en-US','pl-PL']:
 for i,p in enumerate(sorted((root/'phone-raw'/locale).glob('*.png'))):
  bright=i in (0,3,6);bg='#d4ff28' if bright else '#172007';ink='#172007' if bright else '#f8ffe9';muted='#3e510a' if bright else '#d4ff28'
  a,b=copy[locale][i];fs=64 if max(len(a),len(b))<22 else 59
  data=base64.b64encode(p.read_bytes()).decode();out=root/'phone-final'/locale/p.name;out.parent.mkdir(parents=True,exist_ok=True)
  svg=f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><clipPath id="screen"><rect x="108" y="336" width="864" height="1536" rx="22"/></clipPath></defs>
  <rect width="1080" height="1920" fill="{bg}"/>
  <g font-family="Arial"><text x="64" y="70" fill="{muted}" font-size="23" font-weight="700">STRENGTH SAVE</text><text x="1016" y="70" fill="{muted}" text-anchor="end" font-size="23">0{i+1} / 08</text>
  <text x="60" y="172" fill="{ink}" font-size="{fs}" font-weight="700" letter-spacing="-1">{escape(a)}</text><text x="60" y="249" fill="{ink}" font-size="{fs}" font-weight="700" letter-spacing="-1">{escape(b)}</text></g>
  <rect x="102" y="330" width="876" height="1548" rx="28" fill="#53681a"/>
  <image x="108" y="336" width="864" height="1536" clip-path="url(#screen)" xlink:href="data:image/png;base64,{data}"/>
  </svg>'''
  source=out.with_suffix('.svg');source.write_text(svg)
  subprocess.run(['rsvg-convert','-o',str(out),str(source)],check=True)
  subprocess.run(['magick',str(out),'-depth','8','-alpha','off','PNG24:'+str(out)],check=True)
  manifest.append({'file':str(out.relative_to(root.parent)),'source':str(p.relative_to(root.parent)),'headline':a+' '+b,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()})
  print(locale,p.name,flush=True)
(root.parent/'store-graphics-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
