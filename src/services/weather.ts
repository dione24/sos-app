import * as Network from 'expo-network';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from '@/db/database';
import type { Coordinates, WeatherSnapshot } from '@/types/models';

const WEATHER_KEY = 'weather_cache_v2';
const LEGACY_WEATHER_KEY = 'weather_cache_v1';
const BAMAKO: Coordinates = { latitude: 12.6392, longitude: -8.0029 };
export const WEATHER_CACHE_MAX_AGE_MS = 15 * 60 * 1_000;
export const WEATHER_REQUEST_TIMEOUT_MS = 6_000;

type CacheEntry = { locationKey: string; snapshot: WeatherSnapshot };
type WeatherCache = { version: 2; bamako?: CacheEntry; position?: CacheEntry; latest?: 'bamako' | 'position'; legacy?: WeatherSnapshot };
const cacheReads = new WeakMap<SQLiteDatabase, Promise<WeatherCache>>();
const cacheWrites = new WeakMap<SQLiteDatabase, Promise<void>>();
const requests = new WeakMap<SQLiteDatabase, Map<string, Promise<WeatherSnapshot>>>();

function locationKey(position: Coordinates | null) {
  return position ? `position:${position.latitude},${position.longitude}` : 'bamako';
}

function isSnapshot(value: unknown): value is WeatherSnapshot {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<WeatherSnapshot>;
  return typeof item.city === 'string' && typeof item.description === 'string'
    && typeof item.temperature === 'number' && Number.isFinite(item.temperature)
    && typeof item.weatherCode === 'number' && Number.isFinite(item.weatherCode)
    && typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) && item.updatedAt > 0
    && (item.source === 'network' || item.source === 'cache')
    && (item.precipitationProbability === undefined || (Number.isFinite(item.precipitationProbability) && item.precipitationProbability >= 0 && item.precipitationProbability <= 100));
}

function isEntry(value: unknown): value is CacheEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<CacheEntry>;
  return typeof entry.locationKey === 'string' && isSnapshot(entry.snapshot);
}

async function readCache(db: SQLiteDatabase): Promise<WeatherCache> {
  const pending = cacheReads.get(db);
  if (pending) return pending;
  const task = (async (): Promise<WeatherCache> => {
    try {
      const stored = await getSetting(db, WEATHER_KEY);
      if (stored) {
        const value = JSON.parse(stored) as Partial<WeatherCache>;
        if (value.version === 2) {
          return {
            version: 2,
            ...(isEntry(value.bamako) ? { bamako: value.bamako } : {}),
            ...(isEntry(value.position) ? { position: value.position } : {}),
            ...(value.latest === 'bamako' || value.latest === 'position' ? { latest: value.latest } : {}),
          };
        }
      }
    } catch {
      // Un cache météo illisible ne bloque ni l'écran ni le dossier médical.
    }
    try {
      const stored = await getSetting(db, LEGACY_WEATHER_KEY);
      const legacy: unknown = stored ? JSON.parse(stored) : null;
      if (isSnapshot(legacy)) {
        // L'ancien format ne localisait pas « Ma position ». Ne jamais l'attribuer
        // à de nouvelles coordonnées ; il reste consultable comme dernière prévision.
        return legacy.city === 'Bamako'
          ? { version: 2, bamako: { locationKey: 'bamako', snapshot: legacy }, latest: 'bamako' }
          : { version: 2, legacy };
      }
    } catch {
      // Cache facultatif : le réseau sera essayé, puis un état indisponible explicite.
    }
    return { version: 2 };
  })();
  cacheReads.set(db, task);
  try { return await task; } finally { if (cacheReads.get(db) === task) cacheReads.delete(db); }
}

function fromCache(snapshot: WeatherSnapshot): WeatherSnapshot {
  return { ...snapshot, source: 'cache' };
}

/** Cache du lieu demandé uniquement ; aucune requête réseau. */
export async function getCachedWeather(db: SQLiteDatabase, position: Coordinates | null): Promise<WeatherSnapshot | null> {
  const cache = await readCache(db);
  const entry = position ? cache.position : cache.bamako;
  return entry?.locationKey === locationKey(position) ? fromCache(entry.snapshot) : null;
}

/** À afficher avec son lieu et son âge pendant la recherche GPS, jamais comme une nouvelle position. */
export async function getLastCachedWeather(db: SQLiteDatabase): Promise<WeatherSnapshot | null> {
  const cache = await readCache(db);
  const snapshot = (cache.latest ? cache[cache.latest]?.snapshot : null) ?? cache.legacy;
  return snapshot ? fromCache(snapshot) : null;
}

async function saveCache(db: SQLiteDatabase, position: Coordinates | null, snapshot: WeatherSnapshot) {
  const previous = cacheWrites.get(db) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(async () => {
    const cache = await readCache(db);
    const slot = position ? 'position' : 'bamako';
    // Deux entrées maximum : Bamako et la dernière position autorisée. Stockage
    // chiffré existant ; aucune donnée médicale ni migration n'est modifiée.
    const updated: WeatherCache = { version: 2, ...(cache.bamako ? { bamako: cache.bamako } : {}), ...(cache.position ? { position: cache.position } : {}), [slot]: { locationKey: locationKey(position), snapshot }, latest: slot };
    await setSetting(db, WEATHER_KEY, JSON.stringify(updated));
  });
  cacheWrites.set(db, task);
  try { await task; } finally { if (cacheWrites.get(db) === task) cacheWrites.delete(db); }
}

function weatherLabel(code: number) {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 3) return 'Partiellement nuageux';
  if (code <= 48) return 'Brume';
  if (code <= 67) return 'Pluie';
  if (code <= 77) return 'Précipitations';
  if (code <= 82) return 'Averses';
  if (code <= 99) return 'Orage';
  return 'Conditions variables';
}

function unavailable(position: Coordinates | null, description: string): WeatherSnapshot {
  return { city: position ? 'Ma position' : 'Bamako', temperature: 0, description, weatherCode: -1, updatedAt: 0, source: 'fallback' };
}

async function requestWeather(position: Coordinates | null): Promise<WeatherSnapshot> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Weather request timeout')); }, WEATHER_REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      (async () => {
        const network = await Network.getNetworkStateAsync();
        if (!network.isConnected || network.isInternetReachable === false) throw new Error('Weather offline');
        const coords = position ?? BAMAKO;
        const query = new URLSearchParams({ latitude: String(coords.latitude), longitude: String(coords.longitude), current: 'temperature_2m,weather_code', hourly: 'precipitation_probability', forecast_days: '1', timezone: 'Africa/Bamako' });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Weather HTTP ${response.status}`);
        const json = (await response.json()) as { current?: { temperature_2m?: number; weather_code?: number }; hourly?: { precipitation_probability?: unknown[] } };
        const temperature = json.current?.temperature_2m;
        const weatherCode = json.current?.weather_code;
        if (typeof temperature !== 'number' || !Number.isFinite(temperature) || typeof weatherCode !== 'number' || !Number.isFinite(weatherCode)) throw new Error('Invalid weather data');
        const rainValues = json.hourly?.precipitation_probability;
        const rain = (Array.isArray(rainValues) ? rainValues : []).filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100);
        return {
          city: position ? 'Ma position' : 'Bamako', temperature: Math.round(temperature), description: weatherLabel(weatherCode), weatherCode, updatedAt: Date.now(), source: 'network',
          ...(rain.length ? { precipitationProbability: Math.max(...rain) } : {}),
        } satisfies WeatherSnapshot;
      })(),
      timeout,
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function loadWeather(db: SQLiteDatabase, position: Coordinates | null, options: { forceRefresh?: boolean } = {}): Promise<WeatherSnapshot> {
  const cached = await getCachedWeather(db, position);
  const age = cached ? Date.now() - cached.updatedAt : Infinity;
  if (!options.forceRefresh && cached && age >= 0 && age < WEATHER_CACHE_MAX_AGE_MS) return cached;

  let active = requests.get(db);
  if (!active) { active = new Map(); requests.set(db, active); }
  const key = locationKey(position);
  const pending = active.get(key);
  if (pending) return pending;
  const task = (async () => {
    try {
      const snapshot = await requestWeather(position);
      // Une écriture du cache refusée ne doit pas masquer une prévision reçue.
      try { await saveCache(db, position, snapshot); } catch { /* Cache facultatif. */ }
      return snapshot;
    } catch {
      return cached ?? unavailable(position, 'Actualisation impossible ou réseau indisponible');
    }
  })();
  active.set(key, task);
  try { return await task; } finally { if (active.get(key) === task) active.delete(key); }
}
