import { BleManager, ScanMode, State, type Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

import ExpoBleAdvertiser from '../../modules/expo-ble-advertiser/src/ExpoBleAdvertiserModule';
import { friendlyBleAdvertisingError, friendlyBleScanError } from '@/lib/ble-errors';
import { MESH_MESSAGE_MAX_AGE_MS } from '@/lib/mesh';
import { decodeMeshWirePacket, encodeMeshWirePacket } from '@/lib/mesh-wire';
import type { MeshMessage } from '@/types/models';

export const SOS_MESH_SERVICE_UUID = '91f3b100-7b45-4ca9-9a62-3bd0b1f6a223';
export const SOS_MESH_PACKET_CHARACTERISTIC_UUID = '91f3b101-7b45-4ca9-9a62-3bd0b1f6a223';
export const MESH_READ_TIMEOUT_MS = 10_000;
export const MESH_DISCONNECT_TIMEOUT_MS = 1_000;
export const MESH_DEVICE_CACHE_LIMIT = 32;
export const MESH_READ_QUEUE_LIMIT = 16;
export const MESH_READ_CONCURRENCY = 2;
export const MESH_DEVICE_REFRESH_MS = 30_000;
export const MESH_DEVICE_CACHE_TTL_MS = 120_000;
export const MESH_READ_WINDOW_MS = 30_000;
export const MESH_READS_PER_WINDOW = 8;

const manager = new BleManager();
let scanCommand: Promise<unknown> = Promise.resolve();
let sequence = 0;
const scanSessions = new Set<BleMeshScanSession>();
let currentScan: BleMeshScanSession | undefined;

export type BleScanUpdate = {
  state: 'starting' | 'active' | 'bluetooth-off' | 'denied' | 'error';
  devices: Device[];
  message?: string;
};

export type BleMeshScanSession = {
  /** Cancels immediately, then waits for native cleanup and existing packet handlers. */
  stop(): Promise<void>;
};

function serializeScanCommand(operation: () => Promise<unknown>) {
  const next = scanCommand.then(operation, operation);
  scanCommand = next.catch(() => undefined);
  return next;
}

async function stopNativeScan() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      manager.stopDeviceScan(),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, MESH_DISCONNECT_TIMEOUT_MS); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function requestBlePermissions(signal?: AbortSignal) {
  if (signal?.aborted) return false;
  if (Platform.OS !== 'android') return true;
  if (Number(Platform.Version) >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
    if (signal?.aborted || !Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED)) return false;
    if (Number(Platform.Version) >= 33) {
      const notificationsGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (signal?.aborted) return false;
      if (!notificationsGranted) await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    return !signal?.aborted;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return !signal?.aborted && result === PermissionsAndroid.RESULTS.GRANTED;
}

/** One scan owns its radio subscription, queue, reads and cancellation signal. */
export function startBleMeshScan(
  onUpdate: (update: BleScanUpdate) => void,
  options: { onPacket?: (packet: MeshMessage, signal: AbortSignal) => Promise<void> } = {},
): BleMeshScanSession {
  void currentScan?.stop();
  const controller = new AbortController();
  const cache = new Map<string, { device: Device; seenAt: number; readAt: number }>();
  const queue = new Map<string, Device>();
  const jobs = new Set<Promise<void>>();
  const readers = new Map<string, AbortController>();
  const readStarts: number[] = [];
  let subscription: { remove(): void } | undefined;
  let confirmationTimer: ReturnType<typeof setTimeout> | undefined;
  let budgetTimer: ReturnType<typeof setTimeout> | undefined;
  let radioState: State | undefined;
  let scanVersion = 0;
  let registered = false;
  let confirmed = false;
  let lastUpdateAt = 0;
  let stopping: Promise<void> | undefined;
  const live = () => !controller.signal.aborted;
  const devices = () => [...cache.values()].map((entry) => entry.device);
  const notify = (state: BleScanUpdate['state'], message?: string) => {
    if (live()) onUpdate({ state, devices: devices(), ...(message ? { message } : {}) });
  };
  const clearTimers = () => {
    clearTimeout(confirmationTimer);
    clearTimeout(budgetTimer);
    confirmationTimer = undefined;
    budgetTimer = undefined;
  };
  const cancelReads = () => {
    queue.clear();
    for (const reader of readers.values()) reader.abort();
  };

  function pump() {
    if (!live() || radioState !== State.PoweredOn || !options.onPacket) return;
    clearTimeout(budgetTimer);
    budgetTimer = undefined;
    const now = Date.now();
    while (readStarts.length && now - readStarts[0]! >= MESH_READ_WINDOW_MS) readStarts.shift();
    while (readers.size < MESH_READ_CONCURRENCY && queue.size && readStarts.length < MESH_READS_PER_WINDOW) {
      const [id, device] = queue.entries().next().value!;
      queue.delete(id);
      const entry = cache.get(id);
      if (!entry || now - entry.seenAt >= MESH_DEVICE_CACHE_TTL_MS) continue;
      entry.readAt = now;
      readStarts.push(now);
      const reader = new AbortController();
      readers.set(id, reader);
      const job = (async () => {
        try {
          const packet = await readPacketFromDevice(device, { signal: reader.signal });
          if (packet && live() && !reader.signal.aborted) await options.onPacket!(packet, reader.signal);
        } catch {
          notify('active', "Une alerte proche n'a pas pu être traitée. Vous pouvez rechercher à nouveau.");
        } finally { readers.delete(id); }
      })();
      jobs.add(job);
      void job.finally(() => { jobs.delete(job); pump(); });
    }
    if (queue.size && readStarts.length >= MESH_READS_PER_WINDOW) {
      budgetTimer = setTimeout(pump, Math.max(1, MESH_READ_WINDOW_MS - (Date.now() - readStarts[0]!)));
    }
  }

  function discovered(device: Device) {
    const now = Date.now();
    for (const [id, entry] of cache) {
      if (now - entry.seenAt >= MESH_DEVICE_CACHE_TTL_MS && !readers.has(id)) { cache.delete(id); queue.delete(id); }
    }
    let entry = cache.get(device.id);
    if (!entry) {
      if (cache.size >= MESH_DEVICE_CACHE_LIMIT) {
        const evict = [...cache.keys()].find((id) => !readers.has(id) && !queue.has(id));
        if (evict === undefined) return;
        cache.delete(evict);
      }
      entry = { device, seenAt: now, readAt: Number.NEGATIVE_INFINITY };
      cache.set(device.id, entry);
    } else { entry.device = device; entry.seenAt = now; }
    if (!confirmed || now - lastUpdateAt >= 1_000) {
      confirmed = true;
      lastUpdateAt = now;
      clearTimeout(confirmationTimer);
      notify('active');
    }
    if (options.onPacket && !readers.has(device.id) && !queue.has(device.id)
      && now - entry.readAt >= MESH_DEVICE_REFRESH_MS && queue.size < MESH_READ_QUEUE_LIMIT) {
      queue.set(device.id, device);
      pump();
    }
  }

  function changed(state: State) {
    if (!live() || state === radioState) return;
    radioState = state;
    const version = ++scanVersion;
    const wasRegistered = registered;
    registered = false;
    confirmed = false;
    clearTimers();
    if (state !== State.PoweredOn) {
      cancelReads();
      cache.clear();
      if (wasRegistered) void serializeScanCommand(stopNativeScan);
      notify('bluetooth-off', 'Activez le Bluetooth');
      return;
    }
    notify('starting', 'Recherche Bluetooth en cours');
    const failed = (error: unknown) => {
      if (!live() || scanVersion !== version) return;
      scanVersion += 1;
      clearTimers();
      cancelReads();
      registered = false;
      notify('error', friendlyBleScanError(error instanceof Error ? error.message : 'Bluetooth indisponible'));
      void serializeScanCommand(stopNativeScan);
    };
    void serializeScanCommand(async () => {
      if (!live() || scanVersion !== version) return;
      registered = true;
      confirmationTimer = setTimeout(() => {
        notify('starting', 'Aucun signal Bluetooth confirmé · le téléphone peut limiter le scan');
      }, 8_000);
      // Dispatch stop even when an OEM never settles the scan registration promise.
      void manager.startDeviceScan(
        [SOS_MESH_SERVICE_UUID],
        { allowDuplicates: true, scanMode: ScanMode.LowPower },
        (error, device) => {
          if (!live() || scanVersion !== version) return;
          if (error) {
            scanVersion += 1;
            clearTimers();
            cancelReads();
            registered = false;
            notify('error', friendlyBleScanError(error.message));
            void serializeScanCommand(stopNativeScan);
          } else if (device) discovered(device);
        },
      ).catch(failed);
    }).catch(failed);
  }

  const session: BleMeshScanSession = {
    stop() {
      if (stopping) return stopping;
      controller.abort();
      scanVersion += 1;
      try { subscription?.remove(); } catch { /* The manager may already have been released. */ }
      clearTimers();
      cancelReads();
      cache.clear();
      if (currentScan === session) currentScan = undefined;
      stopping = (async () => {
        await serializeScanCommand(stopNativeScan).catch(() => undefined);
        await Promise.allSettled([...jobs]);
        scanSessions.delete(session);
      })();
      return stopping;
    },
  };
  currentScan = session;
  scanSessions.add(session);
  notify('starting', 'Recherche Bluetooth en cours');
  void (async () => {
    if (!(await requestBlePermissions(controller.signal))) { notify('denied', 'Accès aux appareils proches refusé'); return; }
    if (!live()) return;
    subscription = manager.onStateChange(changed, false);
    const state = await manager.state();
    if (live() && radioState === undefined) changed(state);
  })().catch((error: unknown) => {
    notify('error', friendlyBleScanError(error instanceof Error ? error.message : 'Bluetooth indisponible'));
  });
  return session;
}

/** Does not stop a voluntary foreground advertisement. Await before deleting its DB. */
export async function stopActiveMeshScans() {
  await Promise.all([...scanSessions].map((session) => session.stop()));
}

function decodePacketBase64(value: string | null): MeshMessage | null {
  if (!value || value.length > 1_024) return null;
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    return decodeMeshWirePacket(new TextDecoder().decode(bytes));
  } catch { return null; }
}

export function isSosMeshDevice(device: Device) {
  return device.serviceUUIDs?.some((uuid) => uuid.toLowerCase() === SOS_MESH_SERVICE_UUID) ?? false;
}

export function packetFromAdvertisement(device: Device): MeshMessage | null {
  return isSosMeshDevice(device) ? decodePacketBase64(device.manufacturerData) : null;
}

/** The deadline includes connect, MTU, discovery and read; cleanup has its own small cap. */
export async function readPacketFromDevice(device: Device, options: { signal?: AbortSignal } = {}): Promise<MeshMessage | null> {
  if (options.signal?.aborted) return null;
  if (!isSosMeshDevice(device)) return packetFromAdvertisement(device);
  const controller = new AbortController();
  const transaction = `sos-read-${++sequence}`;
  const cancelled = () => { if (controller.signal.aborted) throw new Error('BLE read cancelled'); };
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, MESH_READ_TIMEOUT_MS);
  let rejectCancelled!: (error: Error) => void;
  const cancellation = new Promise<never>((_resolve, reject) => { rejectCancelled = reject; });
  const onAbort = () => rejectCancelled(new Error('BLE read cancelled'));
  controller.signal.addEventListener('abort', onAbort, { once: true });
  const work = (async () => {
    let connected = await device.connect({ timeout: MESH_READ_TIMEOUT_MS });
    if (controller.signal.aborted) { void connected.cancelConnection().catch(() => undefined); cancelled(); }
    try { connected = await connected.requestMTU(512, transaction); } catch { cancelled(); }
    cancelled();
    connected = await connected.discoverAllServicesAndCharacteristics(transaction);
    cancelled();
    const characteristic = await connected.readCharacteristicForService(SOS_MESH_SERVICE_UUID, SOS_MESH_PACKET_CHARACTERISTIC_UUID, transaction);
    cancelled();
    return decodePacketBase64(characteristic.value);
  })();
  try {
    return await Promise.race([work, cancellation]);
  } catch {
    return controller.signal.aborted ? null : packetFromAdvertisement(device);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', onAbort);
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled([manager.cancelTransaction(transaction), manager.cancelDeviceConnection(device.id)]),
      new Promise<void>((resolve) => { cleanupTimer = setTimeout(resolve, MESH_DISCONNECT_TIMEOUT_MS); }),
    ]);
    clearTimeout(cleanupTimer);
  }
}

/** Starts a voluntary advertisement, or an automatic relay owned by an abortable scan. */
export async function startBleAdvertising(message: MeshMessage, options: { signal?: AbortSignal } = {}) {
  if (Platform.OS !== 'android') return { state: 'unsupported' as const, message: 'Diffusion native disponible sur Android uniquement' };
  const cancelled = () => ({ state: 'cancelled' as const, message: 'Partage interrompu' });
  if (options.signal?.aborted) return cancelled();
  try {
    if (!(await requestBlePermissions(options.signal))) {
      return options.signal?.aborted ? cancelled() : { state: 'denied' as const, message: 'Accès aux appareils proches refusé' };
    }
    if (Date.now() - message.createdAt > MESH_MESSAGE_MAX_AGE_MS) return { state: 'expired' as const, message: 'Cette alerte a expiré et ne peut plus être diffusée' };
    const support = await ExpoBleAdvertiser.isSupportedAsync();
    if (options.signal?.aborted) return cancelled();
    if (!support.enabled) return { state: 'bluetooth-off' as const, message: 'Activez le Bluetooth' };
    if (!support.supported) return { state: 'unsupported' as const, message: 'Diffusion BLE non prise en charge par ce téléphone' };
    const requestId = `sos-advertise-${Date.now()}-${++sequence}`;
    const abort = () => { void ExpoBleAdvertiser.stopAdvertisingAsync(requestId).catch(() => undefined); };
    options.signal?.addEventListener('abort', abort, { once: true });
    try {
      if (options.signal?.aborted) return cancelled();
      const { medicalSummary: _medicalSummary, ...packet } = message;
      const result = await ExpoBleAdvertiser.startAdvertisingAsync(encodeMeshWirePacket(packet), requestId);
      if (options.signal?.aborted) { await ExpoBleAdvertiser.stopAdvertisingAsync(requestId); return cancelled(); }
      return { state: 'active' as const, bytes: result.bytes };
    } finally { options.signal?.removeEventListener('abort', abort); }
  } catch (error) {
    if (options.signal?.aborted) return cancelled();
    return { state: 'error' as const, message: error instanceof Error ? friendlyBleAdvertisingError(error.message) : 'Diffusion Bluetooth impossible' };
  }
}

export async function stopBleAdvertising() {
  if (Platform.OS === 'android') await ExpoBleAdvertiser.stopAdvertisingAsync(null);
}

export async function getBleAdvertisingStatus() {
  if (Platform.OS !== 'android') return false;
  return (await ExpoBleAdvertiser.getStatusAsync()).advertising;
}

export function observeBleAdvertising(listener: (active: boolean) => void) {
  if (Platform.OS !== 'android') return { remove() {} };
  return ExpoBleAdvertiser.addListener('onAdvertisingStateChanged', (status) => listener(status.advertising));
}
