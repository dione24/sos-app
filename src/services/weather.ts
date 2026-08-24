import * as Network from 'expo-network';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from '@/db/database';
import type { Coordinates, WeatherSnapshot } from '@/types/models';

const WEATHER_KEY = 'weather_cache_v1';
const BAMAKO: Coordinates = { latitude: 12.6392, longitude: -8.0029 };

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

export async function loadWeather(db: SQLiteDatabase, position: Coordinates | null) {
  const cachedValue = await getSetting(db, WEATHER_KEY);
  const cached = cachedValue ? (JSON.parse(cachedValue) as WeatherSnapshot) : null;
  const network = await Network.getNetworkStateAsync();

  if (!network.isConnected || network.isInternetReachable === false) {
    if (cached) return { ...cached, source: 'cache' as const };
    return {
      city: 'Bamako',
      temperature: 28,
      description: 'Donnée météo indisponible hors ligne',
      weatherCode: -1,
      updatedAt: 0,
      source: 'fallback' as const,
    } satisfies WeatherSnapshot;
  }

  const coords = position ?? BAMAKO;
  try {
    const query = new URLSearchParams({
      latitude: String(coords.latitude),
      longitude: String(coords.longitude),
      current: 'temperature_2m,weather_code',
      hourly: 'precipitation_probability',
      forecast_days: '1',
      timezone: 'Africa/Bamako',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
    if (!response.ok) throw new Error(`Weather HTTP ${response.status}`);
    const json = (await response.json()) as {
      current: { temperature_2m: number; weather_code: number };
      hourly?: { precipitation_probability?: number[] };
    };
    const snapshot: WeatherSnapshot = {
      city: position ? 'Ma position' : 'Bamako',
      temperature: Math.round(json.current.temperature_2m),
      description: weatherLabel(json.current.weather_code),
      weatherCode: json.current.weather_code,
      updatedAt: Date.now(),
      source: 'network',
      precipitationProbability: Math.max(...(json.hourly?.precipitation_probability ?? [0])),
    };
    await setSetting(db, WEATHER_KEY, JSON.stringify(snapshot));
    return snapshot;
  } catch {
    if (cached) return { ...cached, source: 'cache' as const };
    return {
      city: 'Bamako',
      temperature: 28,
      description: 'Actualisation impossible',
      weatherCode: -1,
      updatedAt: 0,
      source: 'fallback' as const,
    } satisfies WeatherSnapshot;
  }
}
