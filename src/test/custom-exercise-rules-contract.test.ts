import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRACKING_TYPES } from '@/lib/set-tracking';
import { categoryLabels } from '@/data/exerciseLibrary';

// 2026-09-29: formularz własnego ćwiczenia dostał typ bodyweight_loaded, a reguły
// Firestore (validCustomExerciseShape) nadal go odrzucały: zapis kończył się
// PERMISSION_DENIED. Zamknięte listy w regułach muszą być równe listom klienta.
const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
const shape = rules.slice(rules.indexOf('function validCustomExerciseShape()'));
const shapeBody = shape.slice(0, shape.indexOf('\n    }'));

const listAfter = (marker: string): string[] => {
  const start = shapeBody.indexOf(marker);
  const open = shapeBody.indexOf('[', start);
  const close = shapeBody.indexOf(']', open);
  return [...shapeBody.slice(open, close).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
};

describe('custom_exercises rules match client lists', () => {
  it('tracking whitelist equals TRACKING_TYPES', () => {
    expect(listAfter('request.resource.data.tracking in')).toEqual([...TRACKING_TYPES].sort());
  });

  it('category whitelist equals categoryLabels keys', () => {
    expect(listAfter('request.resource.data.category in')).toEqual(Object.keys(categoryLabels).sort());
  });
});
