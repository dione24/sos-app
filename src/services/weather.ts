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
type CacheSlot = 'bamako' | 'position';
const pendingCache = new WeakMap<SQLiteDatabase, { entries: Partial<Record<CacheSlot, CacheEntry>>; latest: CacheSlot }>();
const writeBases = new WeakMap<SQLiteDatabase, WeatherCache>();
const generations = new WeakMap<SQLiteDatabase, number>();
const requestControllers = new WeakMap<SQLiteDatabase, Set<AbortController>>();
const generationOf = (db: SQLiteDatabase) => generations.get(db) ?? 0;

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
  const generation = generationOf(db);
  const slot = position ? 'position' : 'bamako';
  const queued = pendingCache.get(db)?.entries[slot];
  if (queued?.locationKey === locationKey(position)) return fromCache(queued.snapshot);
  const cache = await readCache(db);
  if (generation !== generationOf(db)) return null;
  const entry = pendingCache.get(db)?.entries[slot] ?? cache[slot];
  return entry?.locationKey === locationKey(position) ? fromCache(entry.snapshot) : null;
}

/** À afficher avec son lieu et son âge pendant la recherche GPS, jamais comme une nouvelle position. */
export async function getLastCachedWeather(db: SQLiteDatabase): Promise<WeatherSnapshot | null> {
  const generation = generationOf(db);
  const queued = pendingCache.get(db);
  if (queued?.entries[queued.latest]) return fromCache(queued.entries[queued.latest]!.snapshot);
  const cache = await readCache(db);
  if (generation !== generationOf(db)) return null;
  const latest = pendingCache.get(db);
  const snapshot = (latest ? latest.entries[latest.latest]?.snapshot : null) ?? (cache.latest ? cache[cache.latest]?.snapshot : null) ?? cache.legacy;
  return snapshot ? fromCache(snapshot) : null;
}

async function saveCache(db: SQLiteDatabase, position: Coordinates | null, snapshot: WeatherSnapshot, generation: number) {
  if (generation !== generationOf(db)) return;
  const slot: CacheSlot = position ? 'position' : 'bamako';
  const entry = { locationKey: locationKey(position), snapshot };
  const pending = pendingCache.get(db) ?? { entries: {}, latest: slot };
  pending.entries[slot] = entry;
  pending.latest = slot;
  pendingCache.set(db, pending);
  const previous = cacheWrites.get(db) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(async () => {
    if (generation !== generationOf(db)) return;
    const cache = writeBases.get(db) ?? await readCache(db);
    if (generation !== generationOf(db)) return;
    // Deux entrées maximum : Bamako et la dernière position autorisée. Stockage
    // chiffré existant ; aucune donnée médicale ni migration n'est modifiée.
    const updated: WeatherCache = { version: 2, ...(cache.bamako ? { bamako: cache.bamako } : {}), ...(cache.position ? { position: cache.position } : {}), [slot]: entry, latest: slot };
    await setSetting(db, WEATHER_KEY, JSON.stringify(updated));
    if (generation === generationOf(db)) writeBases.set(db, updated);
  });
  cacheWrites.set(db, task);
  try { await task; } finally {
    if (cacheWrites.get(db) === task) { cacheWrites.delete(db); writeBases.delete(db); }
    if (pending.entries[slot] === entry) delete pending.entries[slot];
    if (!pending.entries.bamako && !pending.entries.position && pendingCache.get(db) === pending) pendingCache.delete(db);
    else if (!pending.entries[pending.latest]) pending.latest = pending.entries.position ? 'position' : 'bamako';
  }
}

/** Optional persistence stays ordered; callers never need this to display a forecast. */
export async function flushWeatherCache(db: SQLiteDatabase): Promise<void> {
  await cacheWrites.get(db)?.catch(() => undefined);
}

/** Call and await before clearing SQLite: abort requests, then drain existing writes. */
export async function invalidateWeather(db: SQLiteDatabase): Promise<void> {
  generations.set(db, generationOf(db) + 1);
  for (const controller of requestControllers.get(db) ?? []) controller.abort();
  requestControllers.delete(db);
  requests.delete(db);
  pendingCache.delete(db);
  cacheReads.delete(db);
  await flushWeatherCache(db);
  writeBases.delete(db);
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

async function requestWeather(position: Coordinates | null, controller: AbortController): Promise<WeatherSnapshot> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Weather request timeout')); }, WEATHER_REQUEST_TIMEOUT_MS);
  });
  let rejectAbort!: (error: Error) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(new Error('Weather request cancelled'));
  controller.signal.addEventListener('abort', onAbort, { once: true });
  if (controller.signal.aborted) onAbort();
  try {
    return await Promise.race([
      (async () => {
        if (controller.signal.aborted) throw new Error('Weather request cancelled');
        const network = await Network.getNetworkStateAsync();
        if (controller.signal.aborted) throw new Error('Weather request cancelled');
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
      aborted,
    ]);
  } finally { if (timer) clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort); }
}

export async function loadWeather(db: SQLiteDatabase, position: Coordinates | null, options: { forceRefresh?: boolean } = {}): Promise<WeatherSnapshot> {
  const generation = generationOf(db);
  const cached = await getCachedWeather(db, position);
  if (generation !== generationOf(db)) return unavailable(position, 'Prévision indisponible');
  const age = cached ? Date.now() - cached.updatedAt : Infinity;
  if (!options.forceRefresh && cached && age >= 0 && age < WEATHER_CACHE_MAX_AGE_MS) return cached;

  let active = requests.get(db);
  if (!active) { active = new Map(); requests.set(db, active); }
  const key = locationKey(position);
  const pending = active.get(key);
  if (pending) return pending;
  const controller = new AbortController();
  let controllers = requestControllers.get(db);
  if (!controllers) { controllers = new Set(); requestControllers.set(db, controllers); }
  controllers.add(controller);
  const task = (async () => {
    try {
      const snapshot = await requestWeather(position, controller);
      if (generation !== generationOf(db)) return unavailable(position, 'Prévision indisponible');
      // Une écriture du cache refusée ne doit pas masquer une prévision reçue.
      void saveCache(db, position, snapshot, generation).catch(() => undefined);
      return snapshot;
    } catch {
      return (generation === generationOf(db) ? cached : null) ?? unavailable(position, 'Actualisation impossible ou réseau indisponible');
    }
  })();
  active.set(key, task);
  try { return await task; } finally {
    if (active.get(key) === task) active.delete(key);
    controllers.delete(controller);
    if (controllers.size === 0 && requestControllers.get(db) === controllers) requestControllers.delete(db);
  }
}
