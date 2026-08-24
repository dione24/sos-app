import { describe, expect, it } from 'vitest';

import { calculateNextBeatAt, canRestartCpr, CPR_BEAT_MS, CPR_BPM, CPR_RESTART_GUARD_MS } from '../cpr';

describe('CPR metronome scheduling', () => {
  it('stays on the 110 BPM absolute cadence across five minutes of small delays', () => {
    let target = 0;
    for (let beat = 1; beat <= CPR_BPM * 5; beat += 1) {
      const processingDelay = beat % 3 === 0 ? 12 : 3;
      target = calculateNextBeatAt(target, target + processingDelay);
    }
    expect(target).toBeCloseTo(CPR_BEAT_MS * CPR_BPM * 5, 6);
  });

  it('skips missed cadence slots instead of firing catch-up bursts', () => {
    expect(calculateNextBeatAt(1_000, 5_000)).toBeCloseTo(5_000 + CPR_BEAT_MS, 6);
  });

  it('ignores the trailing release immediately after a long-press stop', () => {
    const stoppedAt = 5_000;
    const restartAvailableAt = stoppedAt + CPR_RESTART_GUARD_MS;
    expect(canRestartCpr(stoppedAt + 100, restartAvailableAt)).toBe(false);
    expect(canRestartCpr(restartAvailableAt, restartAvailableAt)).toBe(true);
  });
});
