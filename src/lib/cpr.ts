export const CPR_BPM = 110;
export const CPR_BEAT_MS = 60_000 / CPR_BPM;
export const CPR_RESTART_GUARD_MS = 1_200;

export function canRestartCpr(now: number, restartAvailableAt: number) {
  return now >= restartAvailableAt;
}

/** Keeps the metronome aligned to its absolute cadence without producing a
 * burst of catch-up beats after Android pauses the JS thread. */
export function calculateNextBeatAt(previousTarget: number, now: number, interval = CPR_BEAT_MS) {
  const scheduled = previousTarget + interval;
  return scheduled <= now ? now + interval : scheduled;
}
