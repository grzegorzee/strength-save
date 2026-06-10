import { describe, expect, it } from 'vitest';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { exerciseDetails } from '@/data/exercise-details';
import { exerciseDetailsEn } from '@/data/exercise-details-en';
import { localizeExerciseInstruction } from '@/data/exercise-i18n';
import { trainingPlan } from '@/data/trainingPlan';

describe('exercise i18n and static data', () => {
  it('does not duplicate a canonical EN instruction for custom tips', () => {
    const first = 'Custom setup cue: keep two fingers of space.';
    const second = 'Custom tempo cue: lower for three seconds.';

    expect(localizeExerciseInstruction('Wyciskanie sztangi na ławce płaskiej', first, 'en')).toBe(first);
    expect(localizeExerciseInstruction('Wyciskanie sztangi na ławce płaskiej', second, 'en')).toBe(second);
  });

  it('translates canonical library instructions when the original text matches', () => {
    const yRaise = exerciseLibrary.find(e => e.name === 'Wznosy bokiem leżąc (Y-Raise)');
    expect(yRaise?.instructions?.[0]?.content).toBeTruthy();
    expect(localizeExerciseInstruction(yRaise!.name, yRaise!.instructions![0].content, 'en'))
      .toContain('chest-down');
  });

  it('default plan uses the canonical flat barbell bench press library entry', () => {
    const names = trainingPlan.flatMap(day => day.exercises.map(ex => ex.name));
    expect(names).toContain('Wyciskanie sztangi na ławce płaskiej');
    expect(names).not.toContain('Wyciskanie sztangi/hantli (Płasko)');
    expect(exerciseLibrary.some(ex => ex.name === 'Wyciskanie sztangi na ławce płaskiej')).toBe(true);
  });

  it('Y-Raise technique is consistent across library and detail data', () => {
    const libraryTip = exerciseLibrary.find(e => e.name === 'Wznosy bokiem leżąc (Y-Raise)')?.instructions?.[0]?.content ?? '';
    const planTip = trainingPlan.flatMap(day => day.exercises)
      .find(ex => ex.name === 'Wznosy bokiem leżąc (Y-Raise)')?.instructions.map(i => i.content).join(' ') ?? '';

    expect(libraryTip).toContain('przodem');
    expect(planTip).toContain('przodem');
    expect(exerciseDetails['Wznosy bokiem leżąc (Y-Raise)'].steps[0]).toContain('brzuchem');
    expect(exerciseDetailsEn['Wznosy bokiem leżąc (Y-Raise)'].steps[0]).toContain('chest-down');
    expect(`${libraryTip} ${planTip}`).not.toMatch(/bokiem|plecach/i);
  });
});
