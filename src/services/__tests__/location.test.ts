import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationObject } from 'expo-location';

const mocks = vi.hoisted(() => ({ permission: vi.fn(), lastKnown: vi.fn(), watch: vi.fn() }));
vi.mock('expo-location', () => ({
  Accuracy: { High: 4 }, requestForegroundPermissionsAsync: mocks.permission,
  getLastKnownPositionAsync: mocks.lastKnown, watchPositionAsync: mocks.watch,
}));

const NOW = 1_800_000_000_000;
const fix = (age = 0, accuracy = 12): LocationObject => ({
  timestamp: NOW - age,
  coords: { latitude: 12.64, longitude: -8.0, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
});
let onFix: (position: LocationObject) => void;
let onError: (message: string) => void;
let remove: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  remove = vi.fn();
  mocks.permission.mockResolvedValue({ granted: true });
  mocks.lastKnown.mockResolvedValue(null);
  mocks.watch.mockImplementation(async (_options, success, error) => { onFix = success; onError = error; return { remove }; });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('shared cancellable foreground location', () => {
  it('shares one high-accuracy acquisition and preserves the native fix timestamp', async () => {
    const { getEmergencyPosition } = await import('../location');
    const first = getEmergencyPosition(); const second = getEmergencyPosition();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.permission).toHaveBeenCalledOnce();
    expect(mocks.watch).toHaveBeenCalledOnce();
    expect(mocks.watch.mock.calls[0]?.[0]).toMatchObject({ accuracy: 4 });
    onFix(fix(1_000));
    expect(await first).toEqual(await second);
    expect(await first).toMatchObject({ timestamp: NOW - 1_000, accuracy: 12 });
    expect(remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels one consumer without stopping another consumer GPS request', async () => {
    const { getEmergencyPosition } = await import('../location');
    const controller = new AbortController();
    const first = getEmergencyPosition({ signal: controller.signal }); const second = getEmergencyPosition();
    await vi.advanceTimersByTimeAsync(0); controller.abort();
    expect(await first).toBeNull(); expect(remove).not.toHaveBeenCalled();
    onFix(fix()); expect(await second).toMatchObject({ latitude: 12.64 });
    expect(remove).toHaveBeenCalledOnce();
  });

  it('removes the native watch when the last screen cancels', async () => {
    const { getEmergencyPosition } = await import('../location');
    const controller = new AbortController(); const pending = getEmergencyPosition({ signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0); controller.abort();
    expect(await pending).toBeNull(); expect(remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses a fresh accurate cache without starting GPS', async () => {
    mocks.lastKnown.mockResolvedValue(fix(60_000, 30));
    const { getEmergencyPosition } = await import('../location');
    expect(await getEmergencyPosition()).toMatchObject({ timestamp: NOW - 60_000 });
    expect(mocks.watch).not.toHaveBeenCalled();
  });

  it('stops GPS at the deadline and returns an explicitly old fallback', async () => {
    mocks.lastKnown.mockResolvedValue(fix(10 * 60_000, 300));
    const { getEmergencyPosition, EMERGENCY_POSITION_TIMEOUT_MS, isFreshPosition } = await import('../location');
    const pending = getEmergencyPosition(); await vi.advanceTimersByTimeAsync(EMERGENCY_POSITION_TIMEOUT_MS);
    const result = await pending;
    expect(result?.timestamp).toBe(NOW - 10 * 60_000); expect(isFreshPosition(result)).toBe(false);
    expect(remove).toHaveBeenCalledOnce();
  });

  it('bounds a hung permission lookup and ignores its late resolution', async () => {
    let grant!: (value: { granted: boolean }) => void;
    mocks.permission.mockReturnValue(new Promise((resolve) => { grant = resolve; }));
    const { getEmergencyPosition, EMERGENCY_POSITION_TIMEOUT_MS } = await import('../location');
    const pending = getEmergencyPosition(); await vi.advanceTimersByTimeAsync(EMERGENCY_POSITION_TIMEOUT_MS);
    expect(await pending).toBeNull(); grant({ granted: true }); await vi.advanceTimersByTimeAsync(0);
    expect(mocks.lastKnown).not.toHaveBeenCalled(); expect(mocks.watch).not.toHaveBeenCalled();
  });

  it('bounds a hung native cache lookup too', async () => {
    mocks.lastKnown.mockReturnValue(new Promise(() => {}));
    const { getEmergencyPosition, EMERGENCY_POSITION_TIMEOUT_MS } = await import('../location');
    const pending = getEmergencyPosition(); await vi.advanceTimersByTimeAsync(EMERGENCY_POSITION_TIMEOUT_MS);
    expect(await pending).toBeNull(); expect(mocks.watch).not.toHaveBeenCalled();
  });

  it('cleans up a native subscription that registers after cancellation', async () => {
    let register!: (value: { remove: typeof remove }) => void;
    mocks.watch.mockReturnValue(new Promise((resolve) => { register = resolve; }));
    const { getEmergencyPosition } = await import('../location');
    const controller = new AbortController(); const pending = getEmergencyPosition({ signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0); controller.abort(); expect(await pending).toBeNull();
    register({ remove }); await vi.advanceTimersByTimeAsync(0); expect(remove).toHaveBeenCalledOnce();
  });

  it('cleans up when the first fix arrives before registration finishes', async () => {
    mocks.watch.mockImplementation(async (_options, success) => { success(fix()); return { remove }; });
    const { getEmergencyPosition } = await import('../location');
    expect(await getEmergencyPosition()).toMatchObject({ timestamp: NOW });
    await vi.advanceTimersByTimeAsync(0); expect(remove).toHaveBeenCalledOnce();
  });

  it('rejects stale/future live events and finishes on a fresh fix', async () => {
    const { getEmergencyPosition } = await import('../location');
    const pending = getEmergencyPosition(); await vi.advanceTimersByTimeAsync(0);
    onFix(fix(40 * 60_000)); onFix(fix(60_000)); onFix(fix(-1_000)); expect(remove).not.toHaveBeenCalled();
    onFix(fix()); expect(await pending).toMatchObject({ timestamp: NOW });
  });

  it('handles a native error without leaving GPS running', async () => {
    const { getEmergencyPosition } = await import('../location');
    const pending = getEmergencyPosition(); await vi.advanceTimersByTimeAsync(0); onError('unavailable');
    expect(await pending).toBeNull(); expect(remove).toHaveBeenCalledOnce();
  });

  it('does not label legacy, expired or future coordinates as fresh', async () => {
    const { isFreshPosition, POSITION_FRESH_MAX_AGE_MS } = await import('../location');
    const coordinates = { latitude: 12, longitude: -8 };
    expect(isFreshPosition(coordinates)).toBe(false);
    expect(isFreshPosition({ ...coordinates, timestamp: NOW - POSITION_FRESH_MAX_AGE_MS })).toBe(false);
    expect(isFreshPosition({ ...coordinates, timestamp: NOW + 1 })).toBe(false);
    expect(isFreshPosition({ ...coordinates, timestamp: NOW - 1 })).toBe(true);
  });

  it('does no native work when already aborted or permission denied', async () => {
    const { getEmergencyPosition } = await import('../location');
    const controller = new AbortController(); controller.abort();
    expect(await getEmergencyPosition({ signal: controller.signal })).toBeNull();
    expect(mocks.permission).not.toHaveBeenCalled();
    mocks.permission.mockResolvedValue({ granted: false });
    expect(await getEmergencyPosition()).toBeNull(); expect(mocks.watch).not.toHaveBeenCalled();
  });

  it('privacy cancellation stops all consumers and does not restart from a late callback', async () => {
    const { getEmergencyPosition, cancelAllPositionRequests } = await import('../location');
    const first = getEmergencyPosition(); const second = getEmergencyPosition();
    await vi.advanceTimersByTimeAsync(0); cancelAllPositionRequests();
    expect(await first).toBeNull(); expect(await second).toBeNull(); expect(remove).toHaveBeenCalledOnce();
    onFix(fix()); expect(vi.getTimerCount()).toBe(0);
  });

  it('privacy cancellation before native work starts never opens a permission request', async () => {
    const { getEmergencyPosition, cancelAllPositionRequests } = await import('../location');
    const pending = getEmergencyPosition(); cancelAllPositionRequests();
    expect(await pending).toBeNull(); await vi.advanceTimersByTimeAsync(0);
    expect(mocks.permission).not.toHaveBeenCalled();
  });

  it('does not return a fallback that expired while waiting for the live fix', async () => {
    mocks.lastKnown.mockResolvedValue(fix(30 * 60_000 - 1_000, 300));
    const { getEmergencyPosition, EMERGENCY_POSITION_TIMEOUT_MS } = await import('../location');
    const pending = getEmergencyPosition(); await vi.advanceTimersByTimeAsync(EMERGENCY_POSITION_TIMEOUT_MS);
    expect(await pending).toBeNull(); expect(remove).toHaveBeenCalledOnce();
  });
});
