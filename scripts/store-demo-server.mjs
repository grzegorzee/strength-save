// Local-only capture harness. Installed only in disposable simulators.
// It renders the current app in the native WKWebView using fictional E2E data.
import { createServer } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { authState, plan, workouts, cycles, dismissedDates } from './store-demo-fixture.mjs';

const output = resolve('release/app-store/launch-2026-09');
mkdirSync(output, { recursive: true });
const controlPath = resolve(output, 'control.json');
writeFileSync(controlPath, JSON.stringify({ revision: 1, locale: 'en-US', scene: 'today', route: '/' }));
process.env.VITE_E2E_MODE = 'true';
const payload = { authState, plan, workouts, cycles, dismissedDates };
const server = await createServer({
  mode: 'mobile',
  server: { host: '127.0.0.1', port: 4187, strictPort: true },
  plugins: [{
    name: 'isolated-store-demo',
    configureServer(vite) {
      vite.middlewares.use('/__demo/control', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(controlPath));
      });
      vite.middlewares.use('/__demo/ready', (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const platform = url.searchParams.get('device') || 'unknown';
        const data = Object.fromEntries(url.searchParams);
        writeFileSync(resolve(output, `ready-${platform}.json`), JSON.stringify(data, null, 2));
        res.end('ok');
      });
    },
    transformIndexHtml(html) {
      const control = JSON.parse(readFileSync(controlPath));
      const injected = `
        (async () => {
        for(const database of await indexedDB.databases()) {
          await new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = request.onerror = request.onblocked = resolve;
          });
        }
        const demo = ${JSON.stringify(payload)};
        const control = ${JSON.stringify(control)};
        const device = new URLSearchParams(location.search).get('device') || 'iphone';
        localStorage.clear();
        localStorage.setItem('app-language', control.locale === 'pl' ? 'pl' : 'en');
        localStorage.setItem('ss-theme-owner-v1', 'e2e-test-user');
        localStorage.setItem('ss-accent-color', 'lime');
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('fittracker_e2e_auth_state', JSON.stringify(demo.authState));
        if(control.locale === 'pl') {
          demo.plan.name = 'Siła i sylwetka';
          demo.cycles[0].name = 'Siła i sylwetka';
        }
        if(control.scene === 'workout') {
          const date = new Date().toISOString().slice(0,10);
          demo.workouts.push({
            id: 'workout-e2e-test-user-day-1-' + date, userId: 'e2e-test-user', dayId: 'day-1',
            date, completed: false,
            cycleId: 'store-cycle-active', startedAt: new Date(Date.now()-480000).toISOString(),
            dayName: control.locale === 'pl' ? 'Niedziela' : 'Sunday',
            dayFocus: 'Chest / Squat / Mid Back', durationSec: 480,
            exercises: demo.plan.days[0].exercises.map((e, i) => ({
              exerciseId:e.id, name:e.name,
              sets: Array.from({length:3}, (_,j) => ({reps:[8,6,10,12][i],
                weight:[34,102.5,32,40][i], completed:i===0 && j<2})),
            })),
          });
          const active = demo.workouts.at(-1);
          localStorage.setItem('fittracker_workout_draft:e2e-test-user', JSON.stringify({
            sessionId: active.id, dayId: 'day-1', date,
            cycleId:'store-cycle-active',sessionOrigin:'remote',remoteSessionId:active.id,
            exerciseSets:Object.fromEntries(active.exercises.map(e=>[e.exerciseId,e.sets])),
            exerciseNames:Object.fromEntries(active.exercises.map(e=>[e.exerciseId,e.name])),
            exerciseNotes:{},dayNotes:'',skippedExercises:[],
            savedAt:Date.now(),startedAt:Date.now()-480000,lastActivityAt:Date.now(),
            version:1,cloudRevision:0,lastSyncedVersion:1
          }));
        }
        localStorage.setItem('fittracker_e2e_plan', JSON.stringify(demo.plan));
        localStorage.setItem('fittracker_e2e_workouts', JSON.stringify(demo.workouts));
        localStorage.setItem('fittracker_e2e_cycles', JSON.stringify(demo.cycles));
        localStorage.setItem('fittracker_lapse_dismissed_v1', JSON.stringify(demo.dismissedDates));
        localStorage.setItem('fittracker_first_workout_tour_v1', '1');
        localStorage.setItem('fittracker_nextstep_dismissed', '1');
        location.hash = control.route;
        let readySent = false;
        let planWeekSelected = false;
        let attempts = 0;
        {
          setInterval(async () => {
            try {
              const next = await fetch('/__demo/control').then(r => r.json());
              if(next.revision !== control.revision) {
                location.replace('/?device=' + device + '&revision=' + next.revision);
                return;
              }
              attempts++;
              const skip = document.querySelector('[data-testid="prestart-skip"]');
              if(skip) skip.click();
              if(control.scene === 'plan' && !planWeekSelected) {
                const previousWeek = document.querySelector('[aria-label="Poprzedni tydzień"], [aria-label="Previous week"]');
                if(previousWeek) { previousWeek.click(); planWeekSelected = true; }
              }
              if(!readySent && attempts > 5 && document.querySelector('#root main')) {
                await document.fonts.ready;
                readySent = true;
                const fields = {device, scene:control.scene, locale:control.locale, revision:control.revision,
                  width:innerWidth, height:innerHeight, title:document.title,
                  native:String(window.Capacitor?.getPlatform()),
                  text:document.querySelector('main')?.innerText.slice(0,7000) || ''};
                await fetch('/__demo/ready?' + new URLSearchParams(fields));
              }
            } catch(e) { console.warn('Local capture control:',e.message); }
          }, 700);
        }
        await import('/src/main.tsx');
        })();
      `;
      return html.replace(/<script type="module" src="\/src\/main.tsx"><\/script>/, '')
        .replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="connect-src \'self\' ws://127.0.0.1:4187; form-action \'none\'"><script type="module">'+injected+'</script>');
    },
  }],
});
await server.listen();
console.log('Local native demo ready at http://127.0.0.1:4187');
