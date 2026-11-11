import * as Location from 'expo-location';

import type { Coordinates } from '@/types/models';

export const EMERGENCY_POSITION_TIMEOUT_MS = 10_000;
export const POSITION_FRESH_MAX_AGE_MS = 5 * 60 * 1_000;
const STALE_LAST_KNOWN_MAX_AGE_MS = 30 * 60 * 1_000;
const LIVE_POSITION_MAX_AGE_MS = 10_000;

export function isFreshPosition(position: Coordinates | null | undefined, maxAge = POSITION_FRESH_MAX_AGE_MS): position is Coordinates {
  if (!position || !Number.isFinite(position.timestamp)) return false;
  const age = Date.now() - position.timestamp!;
  return age >= 0 && age < maxAge;
}

function toCoordinates(position: Location.LocationObject, maxAge: number): Coordinates | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  const result: Coordinates = {
    latitude, longitude, timestamp: position.timestamp,
    ...(accuracy == null || !Number.isFinite(accuracy) || accuracy < 0 ? {} : { accuracy }),
  };
  return isFreshPosition(result, maxAge) ? result : null;
}

type Acquisition = {
  promise: Promise<Coordinates | null>;
  resolve: (position: Coordinates | null) => void;
  clients: Set<object>;
  timer: ReturnType<typeof setTimeout>;
  subscription: Location.LocationSubscription | null;
  fallback: Coordinates | null;
  finished: boolean;
};

let acquisition: Acquisition | null = null;
const fallbackOf = (task: Acquisition) => isFreshPosition(task.fallback, STALE_LAST_KNOWN_MAX_AGE_MS) ? task.fallback : null;

/** Used before privacy deletion; late native callbacks cannot restore a position. */
export function cancelAllPositionRequests() {
  if (acquisition) finish(acquisition, null);
}

function finish(task: Acquisition, position: Coordinates | null) {
  if (task.finished) return;
  task.finished = true;
  clearTimeout(task.timer);
  try { task.subscription?.remove(); } catch { /* A cleanup error must not strand consumers. */ }
  task.subscription = null;
  if (acquisition === task) acquisition = null;
  task.resolve(position);
}

async function acquire(task: Acquisition) {
  if (task.finished) return;
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (task.finished) return;
    if (!permission.granted) { finish(task, null); return; }

    // One cache read supplies both the immediate fresh fix and the bounded fallback.
    try {
      const cached = await Location.getLastKnownPositionAsync({ maxAge: STALE_LAST_KNOWN_MAX_AGE_MS, requiredAccuracy: 1_000 });
      if (task.finished) return;
      task.fallback = cached ? toCoordinates(cached, STALE_LAST_KNOWN_MAX_AGE_MS) : null;
      if (isFreshPosition(task.fallback) && task.fallback.accuracy !== undefined && task.fallback.accuracy <= 250) {
        finish(task, task.fallback);
        return;
      }
    } catch { /* A missing cache does not prevent a live high-accuracy request. */ }
    if (task.finished) return;

    // A watch can be removed on timeout/unmount, unlike a one-shot promise race.
    // Keep the SOS precision requirement unchanged for every shared consumer.
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: true },
      (value) => {
        const position = toCoordinates(value, LIVE_POSITION_MAX_AGE_MS);
        if (position) finish(task, position);
      },
      () => finish(task, fallbackOf(task)),
    );
    // Registration can finish after a timeout or even after its first callback.
    if (task.finished) subscription.remove();
    else task.subscription = subscription;
  } catch {
    finish(task, fallbackOf(task));
  }
}

function createAcquisition(): Acquisition {
  let resolve!: Acquisition['resolve'];
  const promise = new Promise<Coordinates | null>((done) => { resolve = done; });
  const task: Acquisition = {
    promise, resolve, clients: new Set(), subscription: null, fallback: null, finished: false,
    timer: setTimeout(() => finish(task, fallbackOf(task)), EMERGENCY_POSITION_TIMEOUT_MS),
  };
  acquisition = task;
  // Register the first consumer before starting asynchronous native work.
  void Promise.resolve().then(() => acquire(task));
  return task;
}

/** Shared, high-accuracy foreground fix. The last cancelling consumer stops GPS. */
export function getEmergencyPosition(options: { signal?: AbortSignal } = {}): Promise<Coordinates | null> {
  const { signal } = options;
  if (signal?.aborted) return Promise.resolve(null);
  const task = acquisition ?? createAcquisition();
  const client = {};
  task.clients.add(client);
  return new Promise((resolve) => {
    let settled = false;
    const done = (position: Coordinates | null) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', cancel);
      task.clients.delete(client);
      resolve(position);
      if (!task.finished && task.clients.size === 0) finish(task, null);
    };
    const cancel = () => done(null);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    void task.promise.then(done);
  });
}
