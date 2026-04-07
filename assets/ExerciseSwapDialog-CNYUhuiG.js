import{c as f}from"./ai-coach-fuOfV6vv.js";import{e as N,c as x}from"./exerciseLibrary-BsrhpWm9.js";import{j as n,g as h,h as D}from"./index-BZzEHaWf.js";import{D as O,a as E,b as P,c as A}from"./dialog-W4bTvo9b.js";import{B as $}from"./badge-BlkJj-Lo.js";import{P as I}from"./play-DCKfwVil.js";const z={2:[{name:"Poniedziałek",weekday:"monday"},{name:"Czwartek",weekday:"thursday"}],3:[{name:"Poniedziałek",weekday:"monday"},{name:"Środa",weekday:"wednesday"},{name:"Piątek",weekday:"friday"}],4:[{name:"Poniedziałek",weekday:"monday"},{name:"Wtorek",weekday:"tuesday"},{name:"Czwartek",weekday:"thursday"},{name:"Piątek",weekday:"friday"}],5:[{name:"Poniedziałek",weekday:"monday"},{name:"Wtorek",weekday:"tuesday"},{name:"Środa",weekday:"wednesday"},{name:"Czwartek",weekday:"thursday"},{name:"Piątek",weekday:"friday"}]};async function J(a){const r=N.map(i=>`- ${i.name} (${i.category}, ${i.type})`).join(`
`),d=z[a.daysPerWeek]||z[3],p=`Jesteś trenerem siłowym. Na podstawie odpowiedzi użytkownika generujesz plan treningowy.

DOSTĘPNE ĆWICZENIA Z BIBLIOTEKI (PRIORYTET — używaj tych nazw!):
${r}

ZASADY:
1. PRIORYTET: Dobieraj ćwiczenia z biblioteki powyżej. Używaj DOKŁADNYCH nazw z listy.
2. FALLBACK: Jeśli w bibliotece brakuje ćwiczenia na daną partię (np. user ma tylko ciężar ciała) — możesz dodać swoje.
3. Dopasuj sety/powtórzenia do doświadczenia:
   - Początkujący: 3x10-12 (więcej powtórzeń, mniej ciężaru)
   - Średnio-zaawansowany: 3-4x6-10
   - Zaawansowany: 4-5x4-8
4. Uwzględnij kontuzje/ograniczenia.
5. Każdy dzień powinien mieć 5-8 ćwiczeń.
6. Ustal czas trwania planu (planDurationWeeks): 8-12 tygodni, w zależności od celu i doświadczenia.
7. Odpowiadaj TYLKO w formacie JSON.

FORMAT ODPOWIEDZI (obiekt z planDurationWeeks i days):
{
  "planDurationWeeks": 12,
  "days": [
    {
      "id": "day-1",
      "dayName": "Poniedziałek",
      "weekday": "monday",
      "focus": "Klatka / Triceps",
      "exercises": [
        { "id": "ex-1-1", "name": "Wyciskanie sztangi na ławce płaskiej", "sets": "3x8-10" },
        { "id": "ex-1-2", "name": "...", "sets": "3x10-12" }
      ]
    }
  ]
}

Dni treningowe do wygenerowania: ${d.map(i=>`${i.name} (${i.weekday})`).join(", ")}
ID format: day-1, day-2, day-3... ; ćwiczenia: ex-1-1, ex-1-2, ex-2-1...`,k=`Wygeneruj plan treningowy na podstawie moich odpowiedzi:

CEL: ${a.goal}
DOŚWIADCZENIE: ${a.experience}
DNI W TYGODNIU: ${a.daysPerWeek}
DOSTĘPNY SPRZĘT: ${a.equipment.join(", ")}
KONTUZJE/OGRANICZENIA: ${a.injuries||"Brak"}`;let y=null;for(let i=0;i<2;i++)try{const w=(await f([{role:"system",content:p},{role:"user",content:k}])).replace(/```json\n?/g,"").replace(/```\n?/g,"").trim(),e=JSON.parse(w),t=Array.isArray(e)?e:e.days,g=!Array.isArray(e)&&e.planDurationWeeks?Math.min(16,Math.max(4,e.planDurationWeeks)):12;if(!Array.isArray(t))throw new Error("Odpowiedź nie zawiera tablicy dni");for(const s of t){const o=s;if(!o.id||!o.dayName||!o.weekday||!o.focus||!Array.isArray(o.exercises))throw new Error(`Nieprawidłowy format dnia: ${JSON.stringify(s)}`);for(const m of o.exercises)if(!m.id||!m.name||!m.sets)throw new Error(`Nieprawidłowy format ćwiczenia: ${JSON.stringify(m)}`)}return{days:t,planDurationWeeks:g}}catch(c){y=c instanceof Error?c:new Error("Nieznany błąd")}throw y||new Error("Nie udało się wygenerować planu")}async function Y(a,r){const d=N.map(e=>`- ${e.name} (${e.category}, ${e.type})`).join(`
`),p=z[a.daysPerWeek]||z[3],k=JSON.stringify(r.days.map(e=>({dayName:e.dayName,focus:e.focus,exercises:e.exercises.map(t=>({name:t.name,sets:t.sets}))}))),y=r.stats.prs.length>0?`Rekordy osobiste z poprzedniego cyklu:
${r.stats.prs.map(e=>`- ${e.exerciseName}: ${e.weight}kg (est. 1RM: ${e.estimated1RM}kg)`).join(`
`)}`:"Brak rekordów osobistych z poprzedniego cyklu.",i=`Jesteś trenerem siłowym. Generujesz NOWY plan treningowy na bazie poprzedniego planu z progresją.

DOSTĘPNE ĆWICZENIA Z BIBLIOTEKI:
${d}

POPRZEDNI PLAN (JSON):
${k}

STATYSTYKI POPRZEDNIEGO CYKLU:
- Czas trwania: ${r.durationWeeks} tygodni
- Ukończone treningi: ${r.stats.totalWorkouts}
- Tonaż: ${(r.stats.totalTonnage/1e3).toFixed(1)}t
- Frekwencja: ${r.stats.completionRate}%
${y}

ZASADY:
1. Na bazie POPRZEDNIEGO PLANU stwórz plan z PROGRESJĄ:
   - Zwiększ objętość (więcej serii lub ćwiczeń) jeśli frekwencja > 80%
   - Zamień ćwiczenia na warianty jeśli plateau (ten sam ciężar)
   - Zachowaj ćwiczenia które działały (wysoki 1RM)
2. Używaj DOKŁADNYCH nazw z biblioteki ćwiczeń.
3. Uwzględnij cel użytkownika i kontuzje.
4. Każdy dzień: 5-8 ćwiczeń.
5. planDurationWeeks: 8-12 tygodni.
6. Odpowiadaj TYLKO w formacie JSON.

FORMAT (identyczny):
{
  "planDurationWeeks": 12,
  "days": [
    {
      "id": "day-1",
      "dayName": "Poniedziałek",
      "weekday": "monday",
      "focus": "Klatka / Triceps",
      "exercises": [
        { "id": "ex-1-1", "name": "Wyciskanie sztangi na ławce płaskiej", "sets": "4x6-8" }
      ]
    }
  ]
}

Dni: ${p.map(e=>`${e.name} (${e.weekday})`).join(", ")}
ID format: day-1, day-2... ; ćwiczenia: ex-1-1, ex-1-2...`,c=`Wygeneruj NOWY plan z progresją na bazie poprzedniego cyklu.

CEL: ${a.goal}
DOŚWIADCZENIE: ${a.experience}
DNI W TYGODNIU: ${a.daysPerWeek}
DOSTĘPNY SPRZĘT: ${a.equipment.join(", ")}
KONTUZJE/OGRANICZENIA: ${a.injuries||"Brak"}

Dodatkowe uwagi: Zachowaj ćwiczenia bazowe które dobrze działały, dodaj progresję w seriach/powtórzeniach, zamień akcesoria na warianty.`;let w=null;for(let e=0;e<2;e++)try{const g=(await f([{role:"system",content:i},{role:"user",content:c}])).replace(/```json\n?/g,"").replace(/```\n?/g,"").trim(),s=JSON.parse(g),o=Array.isArray(s)?s:s.days,m=!Array.isArray(s)&&s.planDurationWeeks?Math.min(16,Math.max(4,s.planDurationWeeks)):12;if(!Array.isArray(o))throw new Error("Odpowiedź nie zawiera tablicy dni");for(const j of o){const l=j;if(!l.id||!l.dayName||!l.weekday||!l.focus||!Array.isArray(l.exercises))throw new Error(`Nieprawidłowy format dnia: ${JSON.stringify(j)}`);for(const u of l.exercises)if(!u.id||!u.name||!u.sets)throw new Error(`Nieprawidłowy format ćwiczenia: ${JSON.stringify(u)}`)}return{days:o,planDurationWeeks:m}}catch(t){w=t instanceof Error?t:new Error("Nieznany błąd")}throw w||new Error("Nie udało się wygenerować planu")}const K=({open:a,onOpenChange:r,category:d,currentExerciseName:p,usedExerciseNames:k,originalSets:y,onSwap:i})=>{const c=d?N.filter(e=>e.category===d&&e.name!==p&&!k.includes(e.name)):[],w=e=>{i({name:e.name,sets:y,videoUrl:e.videoUrl,category:e.category}),r(!1)};return n.jsx(O,{open:a,onOpenChange:r,children:n.jsxs(E,{className:"max-w-[95vw] w-full sm:max-w-md p-0",children:[n.jsxs(P,{className:"p-4 pb-2",children:[n.jsx(A,{className:"text-base",children:"Zamień ćwiczenie"}),d&&n.jsxs("p",{className:"text-sm text-muted-foreground",children:["Kategoria: ",x[d]]})]}),n.jsx("div",{className:"max-h-[60vh] overflow-y-auto px-2 pb-4",children:c.length===0?n.jsx("p",{className:"text-sm text-muted-foreground text-center py-8",children:"Brak dostępnych alternatyw w tej kategorii"}):n.jsx("div",{className:"space-y-1",children:c.map(e=>n.jsxs("button",{className:h("w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left","hover:bg-muted/60 active:bg-muted transition-colors"),onClick:()=>w(e),children:[n.jsxs("div",{className:"flex-1 min-w-0",children:[n.jsx("p",{className:"font-medium text-sm truncate",children:e.name}),n.jsxs("div",{className:"flex items-center gap-2 mt-0.5",children:[n.jsx($,{variant:"outline",className:"text-xs",children:e.type==="compound"?"Złożone":"Izolacja"}),e.videoUrl&&n.jsx(I,{className:"h-3 w-3 text-muted-foreground"})]})]}),n.jsx(D,{className:"h-4 w-4 text-muted-foreground shrink-0"})]},e.name))})})]})})};export{K as E,Y as a,J as g};
