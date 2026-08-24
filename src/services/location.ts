import * as Location from 'expo-location';

import type { Coordinates } from '@/types/models';

/** Hard cap so the SOS screen never spins indefinitely waiting for a fix. */
export const EMERGENCY_POSITION_TIMEOUT_MS = 10_000;
const FRESH_LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const STALE_LAST_KNOWN_MAX_AGE_MS = 30 * 60 * 1000;

function toCoordinates(position: Location.LocationObject): Coordinates {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    ...(position.coords.accuracy == null ? {} : { accuracy: position.coords.accuracy }),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

async function readLastKnown(maxAge: number, requiredAccuracy = 500): Promise<Coordinates | null> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge, requiredAccuracy });
    return last ? toCoordinates(last) : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort emergency fix: prefer a live high-accuracy reading, never block
 * longer than EMERGENCY_POSITION_TIMEOUT_MS, then fall back to a recent cache.
 */
export async function getEmergencyPosition(): Promise<Coordinates | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  // Prefer a fresh cached fix immediately so SMS/mesh can leave with coords
  // while a live fix is still acquired when needed.
  const freshCached = await readLastKnown(FRESH_LAST_KNOWN_MAX_AGE_MS, 250);
  if (freshCached) return freshCached;

  const current = await withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    }),
    EMERGENCY_POSITION_TIMEOUT_MS,
  );
  if (current) return toCoordinates(current);

  // Timed out or failed: any recent-enough cache is better than nothing.
  return readLastKnown(STALE_LAST_KNOWN_MAX_AGE_MS, 1_000);
}
