import { describe, expect, it } from 'vitest';

import { exerciseDetails } from '@/data/exercise-details';
import { exerciseDetailsEn } from '@/data/exercise-details-en';
import { EXERCISE_INSTRUCTION_EN } from '@/data/exercise-i18n';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { planTemplates } from '@/data/planTemplates';
import { trainingPlan } from '@/data/trainingPlan';
import { localizePlanDescription } from '@/lib/plan-i18n';

const unsupportedClaims = [
  /bezpieczn\w*/iu,
  /bezpieczeństw\w*/iu,
  /chroni\w*/iu,
  /odciąż\w*/iu,
  /oszczędz\w*/iu,
  /łagodn\w*/iu,
  /\b(?:dobr\w*|idealn\w*)\s+przy\b/iu,
  /\b(?:bez|zero)\s+nacisku\s+na\s+kręgosłup\b/iu,
  /\bzastępuje\s+asekuranta\b/iu,
  /daje\s+lepsze\s+przyrosty/iu,
  /konieczn\w*\s+dla\s+zdrowia/iu,
  /maksymaln\w*\s+efekt/iu,
  /mniejsz\w*\s+obciążeni\w*/iu,
  /dla\s+zdrowia/iu,
  /zmniejsza\s+ryzyko/iu,
  /\bsafel?y\b/iu,
  /\bjoint\s+safety\b/iu,
  /\bprotects?\b/iu,
  /\bgentler\s+on\b/iu,
  /\bideal\s+for\b/iu,
  /\b(?:great|good)\s+for\s+(?:back\s+recovery|mobility\s+issues|training\s+to\s+failure)/iu,
  /\b(?:good\s+with\s+back\s+issues|shoulder\s+(?:and\s+rotator\s+cuff\s+)?health)\b/iu,
  /\b(?:avoid(?:s|ing)?\s+impingement|eas(?:e|es|ing)\s+joint\s+stress|spares?\s+(?:the\s+)?(?:joint|knees?))\b/iu,
  /\breduces?\s+(?:shin\s+splint\s+)?risk\b/iu,
  /(?:zdrowie\s+barku|mobilność\s+i\s+postawa|korekt\w*\s+asymetri\w*|świetn\w*\s+na\s+asymetri\w*)/iu,
  /\b(?:address(?:es|ing)?|fix(?:es|ing)?)\s+(?:leg\s+)?asymmetr\w*/iu,
  /(?:idealn(?:y|a|e|ym|ą|ego|emu|i)(?!\p{L})|\bperfect\b)/iu,
  /(?:świetn\w*\s+(?:stosunek|balans)|\bgreat\s+(?:results?-to-time|balance)\b)/iu,
  /(?:utrzymuje\s+mięśni\w*\s+przy\s+redukcji|\bkeeps?\s+muscle\s+during\s+a\s+cut\b)/iu,
  /\b(?:minimalna\s+objętość,?\s+maksymalny\s+efekt|minimum\s+volume,?\s+maximum\s+effect)\b/iu,
  /\b(?:najcięższy\s+plan|the\s+heaviest\s+plan)\b/iu,
  /\b(?:wymaga\s+nadwyżki\s+kalorycznej|requires?\s+a\s+calorie\s+surplus)\b/iu,
  /\b(?:bez\s+spalenia\s+regeneracji|without\s+(?:hurting|compromising)\s+recovery)\b/iu,
  /\breplaces?\s+a\s+spotter\b/iu,
  /\bwithout\s+spinal\s+compression\b/iu,
  /\bshoulder-friendly\b/iu,
  /\b(?:lower|no)\s+spinal\s+load(?:ing)?\b/iu,
  /\bsparing\s+the\s+shoulders\b/iu,
];

const userFacingExerciseCopy = [
  ...Object.entries(exerciseDetails).flatMap(([exercise, details]) => [
    ...details.steps.map((text, index) => ({ exercise, field: `steps.${index}`, text })),
    ...(details.proTip ? [{ exercise, field: 'proTip', text: details.proTip }] : []),
  ]),
  ...Object.entries(exerciseDetailsEn).flatMap(([exercise, details]) => [
    ...details.steps.map((text, index) => ({ exercise, field: `en.steps.${index}`, text })),
    ...(details.proTip ? [{ exercise, field: 'en.proTip', text: details.proTip }] : []),
  ]),
  ...Object.entries(EXERCISE_INSTRUCTION_EN).map(([exercise, text]) => ({
    exercise,
    field: 'localizedInstruction.en',
    text,
  })),
  ...exerciseLibrary.flatMap((entry) =>
    (entry.instructions ?? []).flatMap((instruction, index) => [
      { exercise: entry.name, field: `instructions.${index}.title`, text: instruction.title },
      { exercise: entry.name, field: `instructions.${index}.content`, text: instruction.content },
    ]),
  ),
  ...trainingPlan.flatMap((day) =>
    day.exercises.flatMap((exercise) =>
      exercise.instructions.flatMap((instruction, index) => [
        { exercise: exercise.name, field: `plan.instructions.${index}.title`, text: instruction.title },
        { exercise: exercise.name, field: `plan.instructions.${index}.content`, text: instruction.content },
      ]),
    ),
  ),
  ...planTemplates.flatMap((template) => [
    {
      exercise: template.name,
      field: 'planTemplate.description.canonical',
      text: template.description,
    },
    {
      exercise: template.name,
      field: 'planTemplate.description.pl',
      text: localizePlanDescription(template.id, template.description, 'pl'),
    },
    {
      exercise: template.name,
      field: 'planTemplate.description.en',
      text: localizePlanDescription(template.id, template.description, 'en'),
    },
    ...template.days.flatMap((day) =>
      day.exercises.flatMap((exercise) =>
        exercise.instructions.flatMap((instruction, index) => [
          {
            exercise: `${template.name} / ${exercise.name}`,
            field: `planTemplate.instructions.${index}.title`,
            text: instruction.title,
          },
          {
            exercise: `${template.name} / ${exercise.name}`,
            field: `planTemplate.instructions.${index}.content`,
            text: instruction.content,
          },
        ]),
      ),
    ),
  ]),
];

describe('wiarygodność treści ćwiczeń', () => {
  it('nie przedstawia nieudokumentowanych obietnic bezpieczeństwa ani rehabilitacji jako faktów', () => {
    const offenders = userFacingExerciseCopy.flatMap(({ exercise, field, text }) =>
      unsupportedClaims.some((pattern) => pattern.test(text))
        ? [`${exercise} (${field}): ${text}`]
        : [],
    );

    expect(offenders).toEqual([]);
  });
});
