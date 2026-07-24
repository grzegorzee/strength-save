#!/usr/bin/env node

// Z153 (X19): audyt rozjazdu id dni między aktywnym cyklem, planem i HISTORIĄ
// (workouts.dayId). Fix Z151 zatrzymuje dryf na przyszłość; ten skrypt znajduje
// rozjazdy już istniejące na produkcji.
// DRY-RUN jest domyślny i wyłącznie czyta. Zapis TYLKO przez `apply --confirm <uid>`
// po jawnej zgodzie usera (dane usera są święte). Historia (workouts) NIGDY nie
// jest modyfikowana — wyrównujemy plan/cykl do formatu, którego używa historia.
//
// Użycie:
//   node scripts/repair-cycle-day-ids.mjs dry-run --email <email>
//   node scripts/repair-cycle-day-ids.mjs apply --email <email> --confirm <uid>

import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = 'fittracker-workouts';

const CYCLE_ID_RE = /^\d{4}-\d{2}-\d{2}-d(\d+)$/;
const DAY_ID_RE = /^day-(\d+)$/;

const usage = () => {
  console.error([
    'Usage:',
    '  node scripts/repair-cycle-day-ids.mjs dry-run --email <email>',
    '  node scripts/repair-cycle-day-ids.mjs apply --email <email> --confirm <uid>',
  ].join('\n'));
  process.exit(2);
};

const parseArgs = () => {
  const [mode, ...rest] = process.argv.slice(2);
  const args = { mode };
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]?.replace(/^--/, '');
    const value = rest[index + 1];
    if (!key || !value) usage();
    args[key] = value;
  }
  return args;
};

const initAdmin = () => {
  const credential = applicationDefault();
  const app = getApps()[0] ?? initializeApp({ credential, projectId: PROJECT_ID });
  return {
    auth: getAuth(app),
    getAccessToken: async () => (await credential.getAccessToken()).access_token,
  };
};

const decodeValue = (value) => {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  return undefined;
};
const decodeFields = (fields) => Object.fromEntries(
  Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
);

const encodeValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeValue(v)])) } };
};

const runQuery = async (token, body) => {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: body }),
    },
  );
  if (!response.ok) throw new Error(`RUN_QUERY_FAILED:${response.status}:${await response.text()}`);
  const rows = await response.json();
  return rows
    .filter((row) => row.document)
    .map((row) => ({
      id: row.document.name.split('/').pop(),
      data: decodeFields(row.document.fields ?? {}),
    }));
};

const fieldEquals = (fieldPath, stringValue) => ({
  fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { stringValue } },
});

const getDocument = async (token, path) => {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GET_FAILED:${response.status}:${await response.text()}`);
  const doc = await response.json();
  return decodeFields(doc.fields ?? {});
};

const idFormat = (id) => {
  if (typeof id !== 'string') return 'invalid';
  if (CYCLE_ID_RE.test(id)) return 'cycle';
  if (DAY_ID_RE.test(id)) return 'day';
  if (id.startsWith('adhoc')) return 'adhoc';
  return 'other';
};

const countBy = (items, keyFn) => items.reduce((acc, item) => {
  const key = keyFn(item);
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

/**
 * Mapowanie dnia do formatu historii po NUMERZE N (day-3 <-> `${start}-d3`).
 * Zwraca null, gdy id nie da się jednoznacznie przemapować.
 */
const remapDayId = (id, targetFormat, cycleStartDate) => {
  const format = idFormat(id);
  if (format === targetFormat) return id;
  const match = format === 'cycle' ? id.match(CYCLE_ID_RE) : id.match(DAY_ID_RE);
  if (!match) return null;
  const n = match[1];
  return targetFormat === 'cycle' ? `${cycleStartDate}-d${n}` : `day-${n}`;
};

const analyzeCycle = (cycle, planDays, workouts) => {
  const cycleDayIds = (cycle.days ?? []).map((day) => day.id);
  const planDayIds = (planDays ?? []).map((day) => day.id);

  const inWindow = workouts.filter(({ data }) => {
    if (typeof data.date !== 'string') return false;
    if (data.date < cycle.startDate) return false;
    if (cycle.endDate && data.date > cycle.endDate) return false;
    return true;
  });
  const planWorkouts = inWindow.filter(({ data }) => idFormat(data.dayId) !== 'adhoc');

  const historyFormats = countBy(planWorkouts, ({ data }) => idFormat(data.dayId));
  const orphaned = planWorkouts.filter(({ data }) => !cycleDayIds.includes(data.dayId));

  // Format historii = dominujący format dayId treningów planowych w oknie cyklu;
  // brak historii => format cyklu (nic do wyrównywania po stronie historii).
  const dominantHistoryFormat = ['cycle', 'day', 'other'].reduce(
    (best, format) => ((historyFormats[format] ?? 0) > (historyFormats[best] ?? 0) ? format : best),
    'cycle',
  );

  const misalignedCycleDays = cycleDayIds.filter((id) => idFormat(id) !== dominantHistoryFormat);
  const misalignedPlanDays = planDayIds.filter((id) => idFormat(id) !== dominantHistoryFormat);

  const proposal = {
    cycleDays: cycleDayIds.map((id) => ({ from: id, to: remapDayId(id, dominantHistoryFormat, cycle.startDate) })),
    planDays: planDayIds.map((id) => ({ from: id, to: remapDayId(id, dominantHistoryFormat, cycle.startDate) })),
  };
  const unmappable = [...proposal.cycleDays, ...proposal.planDays].filter((entry) => entry.to === null);

  return {
    cycleDayIds,
    planDayIds,
    workoutsInWindow: inWindow.length,
    adhocInWindow: inWindow.length - planWorkouts.length,
    historyFormats,
    dominantHistoryFormat,
    orphaned,
    misalignedCycleDays,
    misalignedPlanDays,
    proposal,
    unmappable,
    needsRepair: misalignedCycleDays.length > 0 || misalignedPlanDays.length > 0 || orphaned.length > 0,
  };
};

const patchDays = async (token, path, days) => {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?updateMask.fieldPaths=days`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { days: encodeValue(days) } }),
    },
  );
  if (!response.ok) throw new Error(`PATCH_FAILED:${response.status}:${await response.text()}`);
};

const main = async () => {
  const args = parseArgs();
  if (!['dry-run', 'apply'].includes(args.mode) || !args.email) usage();

  const { auth, getAccessToken } = initAdmin();
  const user = await auth.getUserByEmail(args.email);
  const token = await getAccessToken();

  const activeCycles = await runQuery(token, {
    from: [{ collectionId: 'plan_cycles' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [fieldEquals('userId', user.uid), fieldEquals('status', 'active')],
      },
    },
  });
  const plan = await getDocument(token, `training_plans/${user.uid}`);
  const workouts = await runQuery(token, {
    from: [{ collectionId: 'workouts' }],
    where: fieldEquals('userId', user.uid),
  });

  console.log(`Konto: ${args.email} (uid ${user.uid})`);
  console.log(`Aktywne cykle: ${activeCycles.length} · plan: ${plan ? `${(plan.days ?? []).length} dni` : 'BRAK'} · workouts: ${workouts.length}`);

  if (activeCycles.length === 0) {
    console.log('Brak aktywnego cyklu — nic do audytu.');
    return;
  }

  let anyRepairNeeded = false;
  const repairs = [];

  for (const cycle of activeCycles) {
    const report = analyzeCycle(cycle.data, plan?.days ?? [], workouts);
    anyRepairNeeded = anyRepairNeeded || report.needsRepair;

    console.log(`\nCykl ${cycle.id} (${cycle.data.startDate} -> ${cycle.data.endDate ?? 'trwa'}):`);
    console.log(`  dni cyklu (${report.cycleDayIds.length}): ${report.cycleDayIds.join(', ')}`);
    console.log(`  dni planu (${report.planDayIds.length}): ${report.planDayIds.join(', ')}`);
    console.log(`  workouts w oknie: ${report.workoutsInWindow} (adhoc poza planem: ${report.adhocInWindow})`);
    console.log(`  formaty dayId historii: ${JSON.stringify(report.historyFormats)} -> dominujący: ${report.dominantHistoryFormat}`);

    if (report.orphaned.length > 0) {
      console.log(`  OSIEROCONE workouts (dayId spoza dni cyklu): ${report.orphaned.length}`);
      report.orphaned.forEach(({ id, data }) => console.log(`    id=${id} date=${data.date} dayId=${data.dayId}`));
    }
    if (!report.needsRepair) {
      console.log('  OK: plan, cykl i historia trzymają ten sam format id.');
      continue;
    }

    console.log(`  ROZJAZD: dni cyklu poza formatem historii: [${report.misalignedCycleDays.join(', ') || '-'}], dni planu: [${report.misalignedPlanDays.join(', ') || '-'}]`);
    if (report.unmappable.length > 0) {
      console.log(`  UWAGA: ${report.unmappable.length} id nie da się jednoznacznie przemapować — apply je pominie, wymagają ręcznej decyzji:`);
      report.unmappable.forEach((entry) => console.log(`    ${entry.from}`));
    }
    console.log('  Propozycja (workouts BEZ zmian, wyrównanie cyklu i planu do formatu historii):');
    [...report.proposal.cycleDays, ...report.proposal.planDays]
      .filter((entry) => entry.to !== null && entry.to !== entry.from)
      .forEach((entry) => console.log(`    ${entry.from} -> ${entry.to}`));

    repairs.push({ cycle, report });
  }

  if (args.mode === 'dry-run') {
    console.log(anyRepairNeeded
      ? '\nDRY-RUN: nic nie zapisano. Zapis: apply --email <email> --confirm <uid>.'
      : '\nDRY-RUN: brak rozjazdów, nic do naprawy.');
    return;
  }

  if (args.confirm !== user.uid) {
    console.error('apply wymaga --confirm <uid> równego uid konta.');
    process.exit(2);
  }
  if (!anyRepairNeeded) {
    console.log('\nBrak rozjazdów — nic nie zapisano.');
    return;
  }

  for (const { cycle, report } of repairs) {
    const remap = (day) => {
      const to = remapDayId(day.id, report.dominantHistoryFormat, cycle.data.startDate);
      return to ? { ...day, id: to } : day;
    };
    const nextCycleDays = (cycle.data.days ?? []).map(remap);
    await patchDays(token, `plan_cycles/${cycle.id}`, nextCycleDays);
    console.log(`ZAPISANO: plan_cycles/${cycle.id} days wyrównane do formatu ${report.dominantHistoryFormat}.`);

    if (plan) {
      const nextPlanDays = (plan.days ?? []).map(remap);
      await patchDays(token, `training_plans/${user.uid}`, nextPlanDays);
      console.log(`ZAPISANO: training_plans/${user.uid} days wyrównane do formatu ${report.dominantHistoryFormat}.`);
    }
  }
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
