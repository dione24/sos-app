import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfflinePack, OfflinePackStatus } from '@maplibre/maplibre-react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppStateStatus } from 'react-native';

const mocks = vi.hoisted(() => ({ getPacks: vi.fn(), createPack: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), getSetting: vi.fn(), setSetting: vi.fn(), headers: vi.fn() }));
const appState = vi.hoisted(() => ({ currentState: 'active' as AppStateStatus, addEventListener: vi.fn() }));
vi.mock('react-native', () => ({ AppState: appState }));
vi.mock('@maplibre/maplibre-react-native', () => ({ OfflineManager: mocks }));
vi.mock('@/constants/map', () => ({ MAP_PROVIDER_READY: true, MAP_STYLE_URL: 'https://maps.example.test/style.json' }));
vi.mock('@/db/database', () => ({ getSetting: mocks.getSetting, setSetting: mocks.setSetting }));
vi.mock('../map-headers', () => ({ ensureMapHeaders: mocks.headers }));

type Listeners = { progress: (pack: OfflinePack, value: OfflinePackStatus) => void; error: (pack: OfflinePack) => void };
let callbacks: Map<string, Listeners>;
let storage: Map<string, string>;
let packs: OfflinePack[];
let db: SQLiteDatabase;
let appStateListeners: Set<(state: AppStateStatus) => void>;

function changeAppState(state: AppStateStatus) {
  appState.currentState = state;
  for (const listener of appStateListeners) listener(state);
}
const status = (state: OfflinePackStatus['state'], percentage = 0): OfflinePackStatus => ({
  id: 'pack', state, percentage, completedResourceCount: 0, completedResourceSize: 0, completedTileCount: 0, completedTileSize: 0, requiredResourceCount: 100,
});

function makePack(id = 'pack', initial = status('inactive'), legacy = false): OfflinePack {
  let value = initial;
  return {
    id, bounds: [-8.15, 12.50, -7.85, 12.75],
    metadata: legacy ? { name: 'Bamako hors ligne' } : { sosRegion: 'sos-bamako-v1' },
    status: vi.fn(async () => value),
    pause: vi.fn(async () => { value = { ...value, state: value.state === 'complete' ? 'complete' : 'inactive' }; }),
    resume: vi.fn(async () => { value = { ...value, state: value.state === 'complete' ? 'complete' : 'active' }; }),
  } as OfflinePack;
}

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  callbacks = new Map(); storage = new Map(); packs = []; db = {} as SQLiteDatabase;
  appState.currentState = 'active';
  appStateListeners = new Set();
  appState.addEventListener.mockImplementation((_event, listener: (state: AppStateStatus) => void) => {
    appStateListeners.add(listener);
    return { remove: vi.fn(() => { appStateListeners.delete(listener); }) };
  });
  mocks.getSetting.mockImplementation(async (_db, key: string) => storage.get(key) ?? null);
  mocks.setSetting.mockImplementation(async (_db, key: string, value: string) => { storage.set(key, value); });
  mocks.getPacks.mockImplementation(async () => packs);
  mocks.createPack.mockImplementation(async (_options, progress, error) => {
    const pack = makePack(); packs.push(pack); callbacks.set(pack.id, { progress, error }); return pack;
  });
  mocks.addListener.mockImplementation(async (id, progress, error) => { callbacks.set(id, { progress, error }); });
  mocks.removeListener.mockImplementation((id) => { callbacks.delete(id); });
});

describe('offline map identity and lifecycle', () => {
  it('reconciles an old ready flag with a missing native pack instead of trusting it', async () => {
    storage.set('map_offline_ready', '1');
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db);
    expect(await controller.reconcile()).toMatchObject({ status: 'missing', packId: null });
    expect(storage.get('map_offline_ready')).toBe('0');
    expect(mocks.headers.mock.invocationCallOrder[0]).toBeLessThan(mocks.getPacks.mock.invocationCallOrder[0]!);
  });

  it('adopts a complete legacy named pack without deleting data or creating another region', async () => {
    packs.push(makePack('legacy', status('complete', 100), true));
    const { getOfflineMapController, OFFLINE_MAP_PACK_ID_KEY } = await import('../offline-map');
    expect(await getOfflineMapController(db).reconcile()).toMatchObject({ status: 'ready', packId: 'legacy' });
    expect(storage.get(OFFLINE_MAP_PACK_ID_KEY)).toBe('legacy'); expect(storage.get('map_offline_ready')).toBe('1');
    expect(mocks.createPack).not.toHaveBeenCalled();
  });

  it('prefers an existing complete region over an incomplete saved identity', async () => {
    storage.set('map_offline_pack_id_v1', 'partial');
    packs.push(makePack('partial'), makePack('complete', status('complete', 100)));
    const { getOfflineMapController } = await import('../offline-map');
    expect(await getOfflineMapController(db).reconcile()).toMatchObject({ status: 'ready', packId: 'complete' });
  });

  it('never declares 99 percent or an active 100 percent to be complete', async () => {
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await controller.start(); const pack = packs[0]!;
    callbacks.get(pack.id)!.progress(pack, status('active', 99.9));
    expect(controller.getSnapshot().status).toBe('downloading'); expect(storage.get('map_offline_ready')).toBe('0');
    callbacks.get(pack.id)!.progress(pack, status('active', 100));
    expect(controller.getSnapshot().status).toBe('downloading');
    expect(controller.getSnapshot().progress).toBe(99);
    callbacks.get(pack.id)!.progress(pack, status('complete', 100));
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe('ready'));
    expect(storage.get('map_offline_ready')).toBe('1'); expect(mocks.removeListener).toHaveBeenCalledWith(pack.id);
    unsubscribe();
  });

  it('pauses and detaches on unmount, then resumes the same identity', async () => {
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); let unsubscribe = controller.subscribe(() => {});
    await controller.start(); const pack = packs[0]!; const oldListener = callbacks.get(pack.id)!;
    unsubscribe(); await Promise.resolve();
    expect(pack.pause).toHaveBeenCalled(); expect(callbacks.has(pack.id)).toBe(false);
    oldListener.progress(pack, status('complete', 100));
    expect(controller.getSnapshot().status).toBe('paused');
    unsubscribe = controller.subscribe(() => {}); await controller.start();
    expect(mocks.createPack).toHaveBeenCalledOnce(); expect(pack.resume).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it.each(['inactive', 'background'] as const)('pauses on %s even while its screen stays subscribed, then requires explicit resume', async (state) => {
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await controller.start(); const pack = packs[0]!; const oldListener = callbacks.get(pack.id)!;
    changeAppState(state);
    expect(pack.pause).toHaveBeenCalledOnce();
    expect(callbacks.has(pack.id)).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({ status: 'paused', packId: pack.id });
    oldListener.progress(pack, status('complete', 100));
    await controller.start();
    expect(pack.resume).toHaveBeenCalledOnce();
    expect(storage.get('map_offline_ready')).toBe('0');
    changeAppState('active');
    expect(pack.resume).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().status).toBe('paused');
    await controller.start();
    expect(pack.resume).toHaveBeenCalledTimes(2);
    expect(mocks.createPack).toHaveBeenCalledOnce();
    unsubscribe(); expect(appStateListeners.size).toBe(0);
  });

  it('pauses late native creation after backgrounding and retains the pack for later resume', async () => {
    let finishCreation!: (pack: OfflinePack) => void;
    mocks.createPack.mockReturnValue(new Promise<OfflinePack>((resolve) => { finishCreation = resolve; }));
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    const pending = controller.start(); await vi.waitFor(() => expect(mocks.createPack).toHaveBeenCalledOnce());
    changeAppState('background'); const pack = makePack('background-late'); packs.push(pack); finishCreation(pack); await pending;
    expect(pack.pause).toHaveBeenCalledOnce(); expect(pack.resume).not.toHaveBeenCalled();
    expect(storage.get('map_offline_pack_id_v1')).toBe(pack.id);
    expect(storage.get('map_offline_ready')).toBe('0');
    changeAppState('active'); await controller.start();
    expect(pack.resume).toHaveBeenCalledOnce(); expect(mocks.createPack).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('shares one AppState listener and removes it on privacy disposal', async () => {
    const { getOfflineMapController, disposeOfflineMap } = await import('../offline-map');
    const controller = getOfflineMapController(db);
    const unsubscribe = controller.subscribe(() => {}); controller.subscribe(() => {});
    expect(appStateListeners.size).toBe(1);
    unsubscribe(); expect(appStateListeners.size).toBe(1);
    await disposeOfflineMap(db); expect(appStateListeners.size).toBe(0);
  });

  it('pauses and detaches a failing download, then retries the existing pack', async () => {
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await controller.start(); const pack = packs[0]!; callbacks.get(pack.id)!.error(pack);
    expect(controller.getSnapshot().status).toBe('error'); expect(pack.pause).toHaveBeenCalled();
    expect(callbacks.has(pack.id)).toBe(false);
    await controller.start(); expect(mocks.createPack).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().status).toBe('downloading'); unsubscribe();
  });

  it('pauses a pack that is created after its screen leaves and preserves its identity', async () => {
    let finishCreation!: (pack: OfflinePack) => void;
    mocks.createPack.mockReturnValue(new Promise<OfflinePack>((resolve) => { finishCreation = resolve; }));
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    const pending = controller.start(); await vi.waitFor(() => expect(mocks.createPack).toHaveBeenCalledOnce());
    unsubscribe(); const pack = makePack('late'); finishCreation(pack); await pending;
    expect(pack.pause).toHaveBeenCalledOnce(); expect(mocks.removeListener).toHaveBeenCalledWith('late');
    expect(storage.get('map_offline_pack_id_v1')).toBe('late'); expect(storage.get('map_offline_ready')).toBe('0');
  });

  it('does not overwrite completion with an incomplete flag if completion races creation', async () => {
    mocks.createPack.mockImplementation(async (_options, progress) => {
      const pack = makePack('fast', status('complete', 100)); packs.push(pack); progress(pack, status('complete', 100)); return pack;
    });
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await controller.start();
    expect(controller.getSnapshot().status).toBe('ready'); expect(storage.get('map_offline_ready')).toBe('1');
    unsubscribe();
  });

  it('shares simultaneous start calls and never creates multiple packs', async () => {
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await Promise.all([controller.start(), controller.start(), controller.start()]);
    expect(mocks.createPack).toHaveBeenCalledOnce(); unsubscribe();
  });

  it('does not claim ready when persisting the complete state fails', async () => {
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await controller.start(); const pack = packs[0]!;
    mocks.setSetting.mockRejectedValue(new Error('disk busy'));
    callbacks.get(pack.id)!.progress(pack, status('complete', 100));
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe('error'));
    expect(storage.get('map_offline_ready')).toBe('0'); expect(pack.pause).toHaveBeenCalled(); unsubscribe();
  });

  it('pauses an orphan active region during reconciliation and keeps its bytes', async () => {
    const pack = makePack('orphan', status('active', 40)); packs.push(pack);
    const { getOfflineMapController } = await import('../offline-map');
    expect(await getOfflineMapController(db).reconcile()).toMatchObject({ status: 'paused', progress: 40, packId: 'orphan' });
    expect(pack.pause).toHaveBeenCalledOnce(); expect(mocks.createPack).not.toHaveBeenCalled();
  });

  it('privacy disposal prevents a late created pack or callback from repopulating settings', async () => {
    let finishCreation!: (pack: OfflinePack) => void;
    mocks.createPack.mockReturnValue(new Promise<OfflinePack>((resolve) => { finishCreation = resolve; }));
    const { getOfflineMapController, disposeOfflineMap } = await import('../offline-map');
    const controller = getOfflineMapController(db); controller.subscribe(() => {});
    const pending = controller.start(); await vi.waitFor(() => expect(mocks.createPack).toHaveBeenCalledOnce());
    const lateProgress = mocks.createPack.mock.calls[0]![1] as Listeners['progress'];
    await disposeOfflineMap(db); storage.clear(); const writesBefore = mocks.setSetting.mock.calls.length;
    const pack = makePack('late-private'); finishCreation(pack); await pending;
    lateProgress(pack, status('complete', 100)); await Promise.resolve();
    expect(pack.pause).toHaveBeenCalledOnce(); expect(storage.size).toBe(0);
    expect(mocks.setSetting).toHaveBeenCalledTimes(writesBefore);
    expect(getOfflineMapController(db)).not.toBe(controller);
  });

  it('privacy disposal waits for an engaged write, skipping the remaining writes before clearing SQL', async () => {
    let release!: () => void;
    mocks.setSetting.mockImplementationOnce(async (_db, key: string, value: string) => {
      await new Promise<void>((resolve) => { release = resolve; }); storage.set(key, value);
    });
    const { getOfflineMapController, disposeOfflineMap } = await import('../offline-map');
    const controller = getOfflineMapController(db); const checking = controller.reconcile();
    await vi.waitFor(() => expect(mocks.setSetting).toHaveBeenCalledOnce());
    let finished = false;
    const deleting = disposeOfflineMap(db).then(() => { finished = true; storage.clear(); });
    await Promise.resolve(); expect(finished).toBe(false);
    release(); await deleting; await checking;
    expect(mocks.setSetting).toHaveBeenCalledOnce(); expect(storage.size).toBe(0);
  });

  it('a native reconciliation resolving after privacy deletion cannot create settings again', async () => {
    let deliver!: (value: OfflinePack[]) => void;
    mocks.getPacks.mockReturnValue(new Promise((resolve) => { deliver = resolve; }));
    const { getOfflineMapController, disposeOfflineMap } = await import('../offline-map');
    const controller = getOfflineMapController(db); const pending = controller.reconcile();
    await disposeOfflineMap(db); storage.clear(); deliver([makePack('old', status('complete', 100))]);
    await pending; expect(storage.size).toBe(0); expect(mocks.setSetting).not.toHaveBeenCalled();
  });

  it('keeps a matching region on a transient native status error instead of creating another', async () => {
    const pack = makePack('saved'); packs.push(pack); storage.set('map_offline_pack_id_v1', pack.id);
    vi.mocked(pack.status).mockRejectedValueOnce(new Error('native busy'));
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await controller.start();
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', packId: 'saved' });
    expect(mocks.createPack).not.toHaveBeenCalled();
    await controller.start(); expect(pack.resume).toHaveBeenCalledOnce(); expect(mocks.createPack).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('does not create a new region when the native inventory is temporarily unreadable', async () => {
    mocks.getPacks.mockRejectedValueOnce(new Error('inventory busy'));
    const { getOfflineMapController } = await import('../offline-map');
    const controller = getOfflineMapController(db); const unsubscribe = controller.subscribe(() => {});
    await controller.start(); expect(controller.getSnapshot().status).toBe('error');
    expect(mocks.createPack).not.toHaveBeenCalled();
    await controller.start(); expect(mocks.createPack).toHaveBeenCalledOnce(); unsubscribe();
  });
});
