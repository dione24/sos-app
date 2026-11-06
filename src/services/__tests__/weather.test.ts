import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSetting: vi.fn(), setSetting: vi.fn(), network: vi.fn() }));
vi.mock('expo-network', () => ({ getNetworkStateAsync: mocks.network }));
vi.mock('@/db/database', () => ({ getSetting: mocks.getSetting, setSetting: mocks.setSetting }));

import { getCachedWeather, getLastCachedWeather, loadWeather, WEATHER_CACHE_MAX_AGE_MS, WEATHER_REQUEST_TIMEOUT_MS } from '../weather';
import type { WeatherSnapshot } from '@/types/models';
import type { SQLiteDatabase } from 'expo-sqlite';

const NOW = 1_800_000_000_000;
const position = { latitude: 16.7666, longitude: -3.0026 };
const otherPosition = { latitude: 13.437, longitude: -6.256 };
const snapshot = (overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot => ({ city: 'Bamako', temperature: 29, description: 'Ciel dégagé', weatherCode: 0, updatedAt: NOW - 60_000, source: 'network', precipitationProbability: 10, ...overrides });
const entry = (value: WeatherSnapshot, coords: typeof position | null = null) => ({ locationKey: coords ? `position:${coords.latitude},${coords.longitude}` : 'bamako', snapshot: value });
const response = () => ({ ok: true, json: async () => ({ current: { temperature_2m: 31.2, weather_code: 2 }, hourly: { precipitation_probability: [10, 30, 20] } }) });
let storage: Map<string, string>;
let db: SQLiteDatabase;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  storage = new Map();
  db = {} as SQLiteDatabase;
  mocks.getSetting.mockImplementation(async (_db, key: string) => storage.get(key) ?? null);
  mocks.setSetting.mockImplementation(async (_db, key: string, value: string) => { storage.set(key, value); });
  mocks.network.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  fetchMock = vi.fn().mockImplementation(async () => response());
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function putCache(value: WeatherSnapshot, coords: typeof position | null = null) {
  const slot = coords ? 'position' : 'bamako';
  storage.set('weather_cache_v2', JSON.stringify({ version: 2, [slot]: entry(value, coords), latest: slot }));
}

describe('weather loading without unnecessary network waits', () => {
  it('returns a matching fresh cache without asking the network', async () => {
    const cached = snapshot(); putCache(cached);
    const results = await Promise.all([loadWeather(db, null), loadWeather(db, null), loadWeather(db, null)]);
    expect(results).toEqual(Array(3).fill({ ...cached, source: 'cache' }));
    expect(mocks.network).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forces a real refresh when the user requests it, even with a fresh cache', async () => {
    putCache(snapshot());
    const actual = await loadWeather(db, null, { forceRefresh: true });
    expect(actual).toMatchObject({ city: 'Bamako', temperature: 31, source: 'network', updatedAt: NOW, precipitationProbability: 30 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('deduplicates simultaneous refreshes for the same database and place', async () => {
    await Promise.all([loadWeather(db, null), loadWeather(db, null), loadWeather(db, null, { forceRefresh: true })]);
    expect(mocks.network).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not let a simultaneous cache read swallow an explicit refresh', async () => {
    putCache(snapshot());
    const [cached, fresh] = await Promise.all([loadWeather(db, null), loadWeather(db, null, { forceRefresh: true })]);
    expect(cached.source).toBe('cache');
    expect(fresh.source).toBe('network');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps requests and saved caches distinct for Bamako and a precise location', async () => {
    await Promise.all([loadWeather(db, null), loadWeather(db, position)]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await getCachedWeather(db, null)).toMatchObject({ city: 'Bamako' });
    expect(await getCachedWeather(db, position)).toMatchObject({ city: 'Ma position' });
    expect(await getCachedWeather(db, otherPosition)).toBeNull();
  });

  it('does not share in-flight data between databases', async () => {
    await Promise.all([loadWeather(db, null), loadWeather({} as SQLiteDatabase, null)]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns stale matching data with its original timestamp when offline', async () => {
    const cached = snapshot({ updatedAt: NOW - WEATHER_CACHE_MAX_AGE_MS - 1 }); putCache(cached);
    mocks.network.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    expect(await loadWeather(db, null)).toEqual({ ...cached, source: 'cache' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never shows a previous location as the requested location when offline', async () => {
    putCache(snapshot({ city: 'Ma position' }), position);
    mocks.network.mockResolvedValue({ isConnected: false });
    expect(await loadWeather(db, otherPosition)).toMatchObject({ source: 'fallback', city: 'Ma position', updatedAt: 0 });
    expect(await loadWeather(db, null)).toMatchObject({ source: 'fallback', city: 'Bamako', updatedAt: 0 });
  });

  it('reads a legacy Bamako cache while preserving its age', async () => {
    const cached = snapshot(); storage.set('weather_cache_v1', JSON.stringify(cached));
    expect(await getCachedWeather(db, null)).toEqual({ ...cached, source: 'cache' });
    expect(await loadWeather(db, null)).toMatchObject({ source: 'cache', updatedAt: cached.updatedAt });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps an old unlocated forecast as a preview, without attributing it to new coordinates', async () => {
    const old = snapshot({ city: 'Ma position' }); storage.set('weather_cache_v1', JSON.stringify(old));
    expect(await getLastCachedWeather(db)).toEqual({ ...old, source: 'cache' });
    expect(await getCachedWeather(db, position)).toBeNull();
    expect(await getCachedWeather(db, null)).toBeNull();
  });

  it('ignores a corrupt cache and fetches a valid forecast', async () => {
    storage.set('weather_cache_v2', '{invalid'); storage.set('weather_cache_v1', 'null');
    expect(await loadWeather(db, null)).toMatchObject({ source: 'network', temperature: 31 });
  });

  it('caps a hung fetch and aborts it, then returns the matching cache', async () => {
    const cached = snapshot({ updatedAt: NOW - WEATHER_CACHE_MAX_AGE_MS - 1 }); putCache(cached);
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, options: { signal: AbortSignal }) => { signal = options.signal; return new Promise(() => {}); });
    const pending = loadWeather(db, null);
    await vi.advanceTimersByTimeAsync(WEATHER_REQUEST_TIMEOUT_MS);
    expect(await pending).toEqual({ ...cached, source: 'cache' });
    expect(signal?.aborted).toBe(true);
  });

  it('includes JSON body parsing in the timeout and allows a later retry', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    const pending = loadWeather(db, null);
    await vi.advanceTimersByTimeAsync(WEATHER_REQUEST_TIMEOUT_MS);
    expect(await pending).toMatchObject({ source: 'fallback', updatedAt: 0 });
    fetchMock.mockImplementation(async () => response());
    expect(await loadWeather(db, null)).toMatchObject({ source: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caps network-status lookup too, instead of leaving the screen loading forever', async () => {
    mocks.network.mockImplementation(() => new Promise(() => {}));
    const pending = loadWeather(db, null);
    await vi.advanceTimersByTimeAsync(WEATHER_REQUEST_TIMEOUT_MS);
    expect(await pending).toMatchObject({ source: 'fallback', updatedAt: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not replace a cached forecast with malformed network data', async () => {
    const cached = snapshot(); putCache(cached);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ current: { temperature_2m: null } }) });
    expect(await loadWeather(db, null, { forceRefresh: true })).toEqual({ ...cached, source: 'cache' });
  });

  it('still displays received data if optional cache persistence fails', async () => {
    mocks.setSetting.mockRejectedValue(new Error('disk unavailable'));
    expect(await loadWeather(db, null)).toMatchObject({ source: 'network', temperature: 31 });
  });

  it('does not invent a rain probability when the provider omits it', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ current: { temperature_2m: 30, weather_code: 0 } }) });
    expect((await loadWeather(db, null)).precipitationProbability).toBeUndefined();
  });
});
