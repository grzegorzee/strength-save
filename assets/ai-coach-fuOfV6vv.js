import{k as m}from"./firebase-CXN9cpOF.js";import{_ as c}from"./index-BZzEHaWf.js";async function p(e){return(await m(c,"proxyOpenAI")({messages:e})).data.text||"[]"}const l=`Jesteś trenerem siłowym. Użytkownik nie może wykonać danego ćwiczenia i prosi o zamiennik.

ZASADY:
- Podaj 3 alternatywy, od najlepszej
- Każda musi angażować te same grupy mięśniowe
- Uwzględnij typowy sprzęt siłowni (hantle, sztanga, maszyny, linka)
- Podaj schemat serii (np. "3 x 8-10")
- Odpowiadaj TYLKO w formacie JSON

Format:
{
  "original": "Nazwa oryginalnego ćwiczenia",
  "alternatives": [
    { "name": "Zamiennik 1", "reason": "Dlaczego pasuje", "setsScheme": "3 x 8-10" },
    { "name": "Zamiennik 2", "reason": "...", "setsScheme": "3 x 6-8" },
    { "name": "Zamiennik 3", "reason": "...", "setsScheme": "3 x 10-12" }
  ]
}`;async function u(e,a,n){const t=n.map(s=>({day:s.dayName,exercises:s.exercises.map(r=>r.name)})),o=`Nie mogę robić: "${e}"
Powód: ${a||"brak sprzętu / dyskomfort"}
Mój aktualny plan: ${JSON.stringify(t)}

Zaproponuj 3 zamienniki.`,i=(await p([{role:"system",content:l},{role:"user",content:o}])).replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();return JSON.parse(i)}export{p as c,u as g};
