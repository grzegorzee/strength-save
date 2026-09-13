/** Render store compositions around unchanged native screenshots. No generated UI. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('release/app-store/launch-2026-09');
const fonts = path.resolve('../strength_save_landing/node_modules/@fontsource/archivo/files');
const font = async (name) => `data:font/woff2;base64,${(await fs.readFile(path.join(fonts,name))).toString('base64')}`;
const fontLatin = await font('archivo-latin-800-normal.woff2');
const fontExt = await font('archivo-latin-ext-800-normal.woff2');
const shots = [
  {id:'01-log', raw:'03-workout', light:true, pl:['Zapisz<br>każdą serię.','Ciężar, powtórzenia i poprzedni wynik.'], en:['Log every<br>set.','Weight, reps and your previous result.']},
  {id:'02-plan', raw:'02-plan', pl:['Trenuj według<br>planu.','Wybierz gotowy plan albo ułóż własny.'], en:['Go in with<br>a plan.','Choose a program or build your own.']},
  {id:'03-progress', raw:'05-results', light:true, pl:['Zobacz swój<br>postęp.','Treningi, tonaż i rekordy z całego tygodnia.'], en:['See your<br>progress.','Your workouts, volume and weekly records.']},
  {id:'04-records', raw:'07-records', pl:['Pamiętaj swój<br>najlepszy wynik.','Rekordy dla każdego ćwiczenia.'], en:['Know your<br>personal best.','Your records, exercise by exercise.']},
  {id:'05-history', raw:'04-history', pl:['Wróć do każdego<br>treningu.','Sprawdź, co i ile ostatnio podniosłeś.'], en:['Every workout.<br>Saved.','Look back at what you lifted last time.']},
  {id:'06-exercises', raw:'09-exercises', light:true, pl:['Znajdź swoje<br>ćwiczenie.','243 ćwiczenia. Filtry według partii mięśni.'], en:['Find your<br>next exercise.','243 exercises. Filter by muscle group.']},
  {id:'07-watch', raw:'03-workout', watch:true, pl:['Odhacz serię<br>na zegarku.','Trening z iPhone’a na Apple Watch.'], en:['Log sets<br>on your wrist.','Your iPhone workout on Apple Watch.']},
  {id:'08-today', raw:'01-today', pl:['Wiesz, co<br>trenujesz dalej.','Najbliższy trening i plan na tydzień.'], en:['Know what<br>comes next.','Your next workout and weekly schedule.']},
];
const data = async (p) => `data:image/png;base64,${(await fs.readFile(p)).toString('base64')}`;
const browser = await chromium.launch();
const gallery = [];
for (const locale of ['pl','en-US']) {
  for (const device of ['iphone','ipad']) {
    const ipad = device === 'ipad';
    const width = ipad ? 2064 : 1320, height = ipad ? 2752 : 2868;
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const target = path.join(root,'screenshots',locale,device);
    await fs.mkdir(target,{recursive:true});
    for(const [index,shot] of shots.entries()) {
      if (ipad && index > 5) continue;
      const [headline,caption] = shot[locale==='pl'?'pl':'en'];
      const bg=shot.light?'#D0FF16':'#111310', ink=shot.light?'#111310':'#F5F5E9';
      const screen=await data(path.join(root,'raw',locale,device,shot.raw+'.png'));
      const watch=shot.watch?await data(path.join(root,'raw',locale,'watch','active.png')):null;
      const html=`<!doctype html><html lang="${locale}"><meta charset="utf-8"><style>
      @font-face{font-family:Archivo;src:url('${fontExt}');font-weight:800;unicode-range:U+0100-02FF,U+1E00-1EFF} @font-face{font-family:Archivo;src:url('${fontLatin}');font-weight:800;unicode-range:U+0000-00FF}
      *{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${bg};color:${ink};font-family:Archivo,sans-serif}
      .brand{position:absolute;left:${ipad?110:84}px;right:${ipad?110:84}px;top:76px;display:flex;justify-content:space-between;align-items:center;font-size:${ipad?44:38}px;letter-spacing:-1.4px}
      .mark{display:inline-block;width:26px;height:26px;background:currentColor;margin-right:18px;transform:rotate(-12deg);border-radius:4px}.number{font-size:28px;letter-spacing:2px;opacity:.5}
      h1{position:absolute;left:${ipad?110:84}px;right:60px;top:${ipad?154:194}px;font-size:${ipad?154:128}px;line-height:1.04;letter-spacing:-7px;margin:0;font-weight:800}
      .caption{position:absolute;left:${ipad?110:84}px;right:70px;top:${ipad?510:520}px;font-family:Arial,sans-serif;font-size:${ipad?48:41}px;line-height:1.3;letter-spacing:-.8px;margin:0;opacity:.83}
      .device{position:absolute;left:50%;top:${ipad?607:688}px;width:${ipad?1540:1010}px;padding:${ipad?24:17}px;border:4px solid #70746a;border-radius:${ipad?61:119}px;background:#020302;transform:translateX(-50%) rotate(${ipad?0:shot.light?-3:2}deg);box-shadow:0 24px 0 #050604,0 52px 90px #0005}
      .device img{display:block;width:100%;border-radius:${ipad?36:99}px}
      .side{position:absolute;width:8px;height:155px;left:-10px;top:340px;background:#62675c;border-radius:8px}
      .watch{position:absolute;right:40px;bottom:210px;width:448px;background:#050605;padding:25px 15px;border:7px solid #777d70;border-radius:108px;transform:rotate(9deg);box-shadow:0 30px 60px #000b}
      .watch:after{content:'';position:absolute;right:-20px;top:126px;width:17px;height:64px;background:#777d70;border-radius:10px}.watch img{width:100%;display:block;border-radius:75px}
      .stroke{position:absolute;left:-200px;top:1190px;width:2000px;height:500px;border:2px solid currentColor;opacity:.09;transform:rotate(-27deg)}
      </style><div class="stroke"></div><div class="brand"><span><i class="mark"></i>Strength Save</span><span class="number">${String(index+1).padStart(2,'0')}</span></div><h1>${headline}</h1><p class="caption">${caption}</p><div class="device"><i class="side"></i><img src="${screen}" alt=""></div>${watch?`<div class="watch"><img src="${watch}" alt=""></div>`:''}</html>`;
      await page.setContent(html); await page.evaluate(()=>document.fonts.ready);
      const collision=await page.evaluate(()=>document.querySelector('h1').getBoundingClientRect().bottom>document.querySelector('.caption').getBoundingClientRect().top-15);
      if(collision)throw new Error(`Headline overlaps caption: ${locale}/${device}/${shot.id}`);
      await page.screenshot({path:path.join(target,shot.id+'.png'),omitBackground:false});
      gallery.push({locale,device,id:shot.id,headline:headline.replace('<br>',' '),src:`screenshots/${locale}/${device}/${shot.id}.png`});
      console.log(locale,device,shot.id);
    }
    await page.close();
  }
}
const galleryHTML=`<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Strength Save | Materiały do App Store</title><style>body{background:#111310;color:#f5f5e9;font:16px Arial;margin:0;padding:36px}h1{font-size:42px;letter-spacing:-2px}p{color:#babfb0}h2{margin-top:60px;color:#d0ff16}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px}img{width:100%;border-radius:14px}a{color:inherit;text-decoration:none}figure{margin:0}figcaption{margin:10px 0 25px;font-size:13px}</style><h1>Strength Save</h1><p>Nowe materiały do App Store. Polski i angielski. 13 września 2026.</p>${['pl','en-US'].map(locale=>['iphone','ipad'].map(device=>`<h2>${locale==='pl'?'Polski':'English'} · ${device==='iphone'?'iPhone':'iPad'}</h2><div class="grid">${gallery.filter(s=>s.locale===locale&&s.device===device).map(s=>`<figure><a href="${s.src}"><img src="${s.src}" loading="lazy" alt="${s.headline}"><figcaption>${s.id} · ${s.headline}</figcaption></a></figure>`).join('')}</div>`).join('')).join('')}<h2>Apple Watch</h2><div class="grid">${['pl','en-US'].flatMap(locale=>['plan','active','finished'].map(scene=>`<figure><img src="raw/${locale}/watch/${scene}.png"><figcaption>${locale} · ${scene}</figcaption></figure>`)).join('')}</div></html>`;
await fs.writeFile(path.join(root,'index.html'),galleryHTML);
await fs.writeFile(path.join(root,'mockup-manifest.json'),JSON.stringify(gallery,null,2)+'\n');
await browser.close();
