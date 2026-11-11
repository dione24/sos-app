import { OfflineManager, type OfflinePack, type OfflinePackStatus } from '@maplibre/maplibre-react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppState } from 'react-native';

import { MAP_PROVIDER_READY, MAP_STYLE_URL } from '@/constants/map';
import { getSetting, setSetting } from '@/db/database';
import { ensureMapHeaders } from '@/services/map-headers';

export const OFFLINE_MAP_PACK_ID_KEY = 'map_offline_pack_id_v1';
const READY_KEY = 'map_offline_ready';
const REGION_ID = 'sos-bamako-v1';
const BOUNDS: [number, number, number, number] = [-8.15, 12.50, -7.85, 12.75];

export type OfflineMapState = {
  status: 'checking' | 'unavailable' | 'missing' | 'paused' | 'downloading' | 'ready' | 'error';
  progress: number;
  packId: string | null;
};

function belongsToBamako(pack: OfflinePack, savedId: string | null) {
  const sameBounds = pack.bounds.length === 4 && pack.bounds.every((value, index) => Math.abs(value - BOUNDS[index]!) < 0.000001);
  return sameBounds && (pack.id === savedId || pack.metadata.sosRegion === REGION_ID || pack.metadata.name === 'Bamako hors ligne');
}

function progressOf(status: OfflinePackStatus) {
  return Number.isFinite(status.percentage) ? Math.max(0, Math.min(status.state === 'complete' ? 100 : 99, Math.round(status.percentage))) : 0;
}

/** Native pack identity outlives its screen. No medical or user schema changes. */
export class OfflineMapController {
  private state: OfflineMapState = { status: 'checking', progress: 0, packId: null };
  private pack: OfflinePack | null = null;
  private listeners = new Set<(state: OfflineMapState) => void>();
  private nativeListenerId: string | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private reconciling: Promise<OfflineMapState> | null = null;
  private starting: Promise<void> | null = null;
  private completing: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private epoch = 0;
  private disposed = false;

  constructor(private readonly db: SQLiteDatabase) {}

  getSnapshot = () => this.state;

  subscribe(listener: (state: OfflineMapState) => void) {
    if (this.disposed) return () => {};
    this.listeners.add(listener);
    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener('change', (state) => {
        // A focused route can stay mounted when Android is locked or sent Home.
        // Keep the pack for an explicit resume, never restart on foregrounding.
        if (state !== 'active') void this.pause().catch(() => undefined);
      });
    }
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
      // Downloads are explicitly foreground work; retain their bytes for resume.
      if (this.listeners.size === 0) {
        this.appStateSubscription?.remove();
        this.appStateSubscription = null;
        void this.pause().catch(() => undefined);
      }
    };
  }

  private publish(state: OfflineMapState) {
    if (this.disposed) return;
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }

  private persist(packId: string | null, ready: boolean) {
    if (this.disposed) return Promise.resolve();
    const task = this.writes.catch(() => undefined).then(async () => {
      if (this.disposed) return;
      await setSetting(this.db, OFFLINE_MAP_PACK_ID_KEY, packId ?? '');
      if (this.disposed) return;
      await setSetting(this.db, READY_KEY, ready ? '1' : '0');
    });
    this.writes = task;
    return task;
  }

  private detach() {
    if (this.nativeListenerId) OfflineManager.removeListener(this.nativeListenerId);
    this.nativeListenerId = null;
  }

  reconcile(): Promise<OfflineMapState> {
    if (this.disposed) return Promise.resolve(this.state);
    if (this.reconciling) return this.reconciling;
    if (this.state.status === 'downloading' || this.completing) return Promise.resolve(this.state);
    const task = (async () => {
      try {
        if (!MAP_PROVIDER_READY || typeof OfflineManager.getPacks !== 'function') {
          this.publish({ status: 'unavailable', progress: 0, packId: null });
          return this.state;
        }
        ensureMapHeaders();
        const [savedId, packs] = await Promise.all([getSetting(this.db, OFFLINE_MAP_PACK_ID_KEY), OfflineManager.getPacks()]);
        if (this.disposed) return this.state;
        const candidates = packs.filter((pack) => belongsToBamako(pack, savedId));
        const inspected = await Promise.all(candidates.map(async (pack) => {
          try { return { pack, status: await pack.status() }; } catch { return null; }
        }));
        if (this.disposed) return this.state;
        const valid = inspected.filter((value): value is NonNullable<typeof value> => value !== null);
        // Prefer an already complete region, including the legacy named pack.
        valid.sort((a, b) => Number(b.status.state === 'complete') - Number(a.status.state === 'complete') || Number(b.pack.id === savedId) - Number(a.pack.id === savedId));
        const chosen = valid[0];
        if (!chosen && candidates.length) {
          // A transient status error is not proof that the region is missing.
          this.pack = candidates.find((pack) => pack.id === savedId) ?? candidates[0]!;
          await this.persist(this.pack.id, false);
          this.publish({ status: 'error', progress: 0, packId: this.pack.id });
          return this.state;
        }
        this.pack = chosen?.pack ?? null;
        if (!chosen) {
          await this.persist(null, false);
          this.publish({ status: 'missing', progress: 0, packId: null });
        } else {
          const ready = chosen.status.state === 'complete';
          // An orphan active pack is paused until an explicit resume owns it.
          if (!ready && chosen.status.state === 'active') await chosen.pack.pause();
          await this.persist(chosen.pack.id, ready);
          this.publish({ status: ready ? 'ready' : 'paused', progress: ready ? 100 : progressOf(chosen.status), packId: chosen.pack.id });
        }
      } catch {
        this.publish({ status: 'error', progress: this.state.progress, packId: this.pack?.id ?? null });
      }
      return this.state;
    })();
    this.reconciling = task;
    void task.finally(() => { if (this.reconciling === task) this.reconciling = null; });
    return task;
  }

  private async complete(pack: OfflinePack) {
    this.detach();
    await this.persist(pack.id, true);
    if (this.pack?.id === pack.id) this.publish({ status: 'ready', progress: 100, packId: pack.id });
  }

  private failed(pack: OfflinePack | null, epoch: number) {
    if (this.disposed || epoch !== this.epoch) return;
    this.epoch += 1;
    if (pack) this.pack = pack;
    this.detach();
    if (pack) {
      void pack.pause().catch(() => undefined);
      void this.persist(pack.id, false).catch(() => undefined);
    }
    this.publish({ status: 'error', progress: this.state.progress, packId: pack?.id ?? null });
  }

  private onProgress(pack: OfflinePack, status: OfflinePackStatus, epoch: number) {
    if (this.disposed || epoch !== this.epoch) return;
    this.pack = pack;
    this.nativeListenerId = pack.id;
    if (status.state === 'complete') {
      if (this.completing) return;
      const task = this.complete(pack).catch(() => this.failed(pack, epoch));
      this.completing = task;
      void task.finally(() => { if (this.completing === task) this.completing = null; });
    } else {
      this.publish({ status: 'downloading', progress: progressOf(status), packId: pack.id });
    }
  }

  start(): Promise<void> {
    if (this.disposed || AppState.currentState !== 'active') return Promise.resolve();
    if (this.starting) return this.starting;
    if (this.state.status === 'downloading') return Promise.resolve();
    const epoch = ++this.epoch;
    const task = (async () => {
      await this.reconcile();
      if (epoch !== this.epoch || this.state.status === 'ready' || this.state.status === 'error' || this.state.status === 'unavailable' || !MAP_STYLE_URL) return;
      this.publish({ status: 'downloading', progress: this.state.progress, packId: this.pack?.id ?? null });
      let pack = this.pack;
      if (!pack) {
        pack = await OfflineManager.createPack(
          { mapStyle: MAP_STYLE_URL, bounds: [...BOUNDS], minZoom: 9, maxZoom: 15, metadata: { sosRegion: REGION_ID, name: 'Bamako hors ligne' } },
          (value, status) => this.onProgress(value, status, epoch),
          (value) => this.failed(value, epoch),
        );
        if (epoch !== this.epoch) {
          if (!this.disposed) this.pack = pack;
          OfflineManager.removeListener(pack.id);
          await pack.pause();
          await this.persist(pack.id, false);
          return;
        }
        this.pack = pack;
        this.nativeListenerId = pack.id;
        if (this.completing) { await this.completing; return; }
        if (this.getSnapshot().status === 'ready') return;
        await this.persist(pack.id, false);
      } else {
        this.nativeListenerId = pack.id;
        await OfflineManager.addListener(pack.id, (value, status) => this.onProgress(value, status, epoch), (value) => this.failed(value, epoch));
      }
      if (epoch !== this.epoch) { this.detach(); await pack.pause(); return; }
      if (this.completing) { await this.completing; return; }
      const status = await pack.status();
      if (status.state === 'complete') await this.complete(pack);
      else if (epoch === this.epoch) await pack.resume();
    })().catch(() => this.failed(this.pack, epoch));
    this.starting = task;
    void task.finally(() => { if (this.starting === task) this.starting = null; });
    return task;
  }

  async pause() {
    this.epoch += 1;
    this.detach();
    if (this.state.status === 'ready' || this.state.status === 'unavailable') return;
    const pack = this.pack;
    this.publish({ status: pack ? 'paused' : 'missing', progress: this.state.progress, packId: pack?.id ?? null });
    if (pack) {
      try { await pack.pause(); }
      catch { this.publish({ status: 'error', progress: this.state.progress, packId: pack.id }); }
    }
  }

  /** Privacy boundary: no callback or late native creation may persist after this. */
  async dispose() {
    this.disposed = true;
    this.listeners.clear();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    await this.pause().catch(() => undefined);
    await this.writes.catch(() => undefined);
  }
}

const controllers = new WeakMap<SQLiteDatabase, OfflineMapController>();
export function getOfflineMapController(db: SQLiteDatabase) {
  let controller = controllers.get(db);
  if (!controller) { controller = new OfflineMapController(db); controllers.set(db, controller); }
  return controller;
}

export async function disposeOfflineMap(db: SQLiteDatabase) {
  const controller = controllers.get(db);
  if (!controller) return;
  await controller.dispose();
  if (controllers.get(db) === controller) controllers.delete(db);
}
