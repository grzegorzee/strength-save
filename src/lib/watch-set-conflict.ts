import type { SetData } from '@/types';
import type { WatchSetLoggedEvent } from '@/lib/watch-bridge';

const sameSetValue = (left: SetData | undefined, right: SetData): boolean => !!left
  && left.reps === right.reps
  && left.weight === right.weight
  && left.completed === right.completed
  && !!left.isWarmup === !!right.isWarmup
  && left.durationSec === right.durationSec
  && left.distanceM === right.distanceM
  && left.assistWeight === right.assistWeight;

/** Stempluje wyłącznie realnie zmienione serie wspólną wersją protokołu v1. */
export const stampChangedWatchSets = (
  previous: SetData[] | undefined,
  next: SetData[],
  at: number,
  eventId = `phone-${at}`,
): SetData[] => next.map((set, index) => {
  const old = previous?.[index];
  if (sameSetValue(old, set)) return old?.updatedAt ? {
    ...set,
    updatedAt: old.updatedAt,
    ...(old.updatedEventId && { updatedEventId: old.updatedEventId }),
  } : set;
  return { ...set, updatedAt: at, updatedEventId: eventId };
});

export const mergeWatchSetEvent = (
  current: SetData[],
  event: WatchSetLoggedEvent,
): { sets: SetData[]; applied: boolean } => {
  if (event.setIndex < 0 || event.setIndex >= current.length) return { sets: current, applied: false };
  const existing = current[event.setIndex];
  const incomingEventId = event.eventId ?? event.id ?? `legacy-${event.type}-${event.at}`;
  const existingAt = existing.updatedAt ?? 0;
  if (existingAt > event.at
    || (existingAt === event.at && (existing.updatedEventId ?? '').localeCompare(incomingEventId) >= 0)) {
    return { sets: current, applied: false };
  }
  return {
    applied: true,
    sets: current.map((set, index) => index === event.setIndex ? {
      ...set,
      reps: event.reps,
      weight: event.weight,
      completed: event.completed,
      updatedAt: event.at,
      updatedEventId: incomingEventId,
      ...(event.durationSec !== undefined && { durationSec: event.durationSec }),
      ...(event.distanceM !== undefined && { distanceM: event.distanceM }),
      ...(event.assistWeight !== undefined && { assistWeight: event.assistWeight }),
    } : set),
  };
};
