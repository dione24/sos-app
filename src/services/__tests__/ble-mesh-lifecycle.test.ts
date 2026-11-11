import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Device } from 'react-native-ble-plx';
import type { MeshMessage } from '@/types/models';

const mocks = vi.hoisted(() => ({
  platform: { OS: 'android', Version: 33 },
  permissions: vi.fn(), check: vi.fn(), request: vi.fn(),
  state: vi.fn(), onStateChange: vi.fn(), startDeviceScan: vi.fn(), stopDeviceScan: vi.fn(),
  cancelTransaction: vi.fn(), cancelDeviceConnection: vi.fn(),
  support: vi.fn(), advertise: vi.fn(), stopAdvertising: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: mocks.platform,
  PermissionsAndroid: {
    PERMISSIONS: { BLUETOOTH_SCAN: 'scan', BLUETOOTH_CONNECT: 'connect', BLUETOOTH_ADVERTISE: 'advertise', POST_NOTIFICATIONS: 'notify', ACCESS_FINE_LOCATION: 'location' },
    RESULTS: { GRANTED: 'granted' }, requestMultiple: mocks.permissions, check: mocks.check, request: mocks.request,
  },
}));
vi.mock('react-native-ble-plx', () => ({
  State: { PoweredOn: 'on', PoweredOff: 'off' }, ScanMode: { LowPower: 'low' },
  BleManager: class {
    state = mocks.state; onStateChange = mocks.onStateChange;
    startDeviceScan = mocks.startDeviceScan; stopDeviceScan = mocks.stopDeviceScan;
    cancelTransaction = mocks.cancelTransaction; cancelDeviceConnection = mocks.cancelDeviceConnection;
  },
}));
vi.mock('../../../modules/expo-ble-advertiser/src/ExpoBleAdvertiserModule', () => ({
  default: { isSupportedAsync: mocks.support, startAdvertisingAsync: mocks.advertise, stopAdvertisingAsync: mocks.stopAdvertising },
}));

import {
  MESH_DEVICE_CACHE_LIMIT, MESH_DEVICE_CACHE_TTL_MS, MESH_DEVICE_REFRESH_MS,
  MESH_DISCONNECT_TIMEOUT_MS, MESH_READ_CONCURRENCY, MESH_READ_TIMEOUT_MS,
  MESH_READS_PER_WINDOW, MESH_READ_WINDOW_MS, SOS_MESH_SERVICE_UUID,
  readPacketFromDevice, startBleAdvertising, startBleMeshScan, stopActiveMeshScans,
  type BleScanUpdate,
} from '../ble-mesh';
import { encodeMeshWirePacket } from '@/lib/mesh-wire';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function flush() { for (let i = 0; i < 40; i += 1) await Promise.resolve(); }
const packet: MeshMessage = {
  id: '11111111-1111-4111-8111-111111111111', emergencyType: 'medical', position: null,
  createdAt: 1_800_000_000_000, hopsRemaining: 3, initialTtl: 6, severity: 'critique',
  originHash: '0123456789abcdef', originPublicKey: 'A'.repeat(124), originSignature: 'A'.repeat(96),
};
function peer(id = 'peer') {
  const device = {
    id, serviceUUIDs: [SOS_MESH_SERVICE_UUID], manufacturerData: null,
    connect: vi.fn(), requestMTU: vi.fn(), discoverAllServicesAndCharacteristics: vi.fn(),
    readCharacteristicForService: vi.fn(), cancelConnection: vi.fn(),
  };
  device.connect.mockResolvedValue(device);
  device.requestMTU.mockResolvedValue(device);
  device.discoverAllServicesAndCharacteristics.mockResolvedValue(device);
  device.readCharacteristicForService.mockResolvedValue({ value: Buffer.from(encodeMeshWirePacket(packet)).toString('base64') });
  device.cancelConnection.mockResolvedValue(device);
  return device;
}
type TestPeer = ReturnType<typeof peer>;
let radioListener: (state: string) => void;
let scanListener: (error: { message: string } | null, device: Device | null) => void;
let removeSubscription: ReturnType<typeof vi.fn>;
function discover(device: TestPeer) { scanListener(null, device as unknown as Device); }

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(packet.createdAt);
  vi.clearAllMocks();
  mocks.platform.OS = 'android'; mocks.platform.Version = 33;
  mocks.permissions.mockResolvedValue({ scan: 'granted', connect: 'granted', advertise: 'granted' });
  mocks.check.mockResolvedValue(true); mocks.request.mockResolvedValue('granted');
  mocks.state.mockResolvedValue('on');
  removeSubscription = vi.fn();
  mocks.onStateChange.mockImplementation((listener) => { radioListener = listener; return { remove: removeSubscription }; });
  mocks.startDeviceScan.mockImplementation(async (_services, _options, listener) => { scanListener = listener; });
  mocks.stopDeviceScan.mockResolvedValue(undefined);
  mocks.cancelTransaction.mockResolvedValue(undefined); mocks.cancelDeviceConnection.mockResolvedValue(undefined);
  mocks.support.mockResolvedValue({ supported: true, enabled: true, advertising: false });
  mocks.advertise.mockResolvedValue({ started: true, bytes: 400 });
  mocks.stopAdvertising.mockResolvedValue({ stopped: true });
});

afterEach(async () => {
  await stopActiveMeshScans();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('scan session ownership', () => {
  it('returns cancellation immediately and never starts after a delayed permission grant', async () => {
    const permission = deferred<Record<string, string>>();
    mocks.permissions.mockReturnValueOnce(permission.promise);
    const update = vi.fn();
    const session = startBleMeshScan(update);
    await session.stop();
    permission.resolve({ scan: 'granted' });
    await flush();
    expect(mocks.state).not.toHaveBeenCalled();
    expect(mocks.startDeviceScan).not.toHaveBeenCalled();
    expect(mocks.check).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('keeps the same cleanup across Bluetooth OFF/ON transitions', async () => {
    mocks.state.mockResolvedValue('off');
    const session = startBleMeshScan(vi.fn());
    await flush();
    radioListener('on'); await flush();
    radioListener('off'); await flush();
    radioListener('on'); await flush();
    expect(mocks.startDeviceScan).toHaveBeenCalledTimes(2);
    expect(mocks.permissions).toHaveBeenCalledTimes(1);
    await session.stop();
    expect(removeSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.stopDeviceScan).toHaveBeenCalledTimes(2);
    const calls = mocks.startDeviceScan.mock.calls.length;
    radioListener('on'); await flush();
    expect(mocks.startDeviceScan).toHaveBeenCalledTimes(calls);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('dispatches stop even if native registration never settles, and bounds stop acknowledgement', async () => {
    mocks.startDeviceScan.mockReturnValue(new Promise(() => undefined));
    mocks.stopDeviceScan.mockReturnValue(new Promise(() => undefined));
    const session = startBleMeshScan(vi.fn()); await flush();
    const stopped = session.stop(); await flush();
    expect(mocks.stopDeviceScan).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(MESH_DISCONNECT_TIMEOUT_MS);
    await stopped;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores old callbacks and a late old permission when another session replaces it', async () => {
    const permission = deferred<Record<string, string>>();
    mocks.permissions.mockReturnValueOnce(permission.promise);
    const first = startBleMeshScan(vi.fn());
    const update = vi.fn();
    const second = startBleMeshScan(update);
    await flush();
    permission.resolve({ scan: 'granted' }); await flush();
    expect(mocks.startDeviceScan).toHaveBeenCalledTimes(1);
    await first.stop();
    discover(peer());
    expect(update.mock.calls.at(-1)?.[0].state).toBe('active');
    await second.stop();
  });

  it('reports a permission refusal without opening a scan or notification prompt', async () => {
    mocks.permissions.mockResolvedValue({ scan: 'denied' });
    const update = vi.fn();
    startBleMeshScan(update); await flush();
    expect(update.mock.calls.at(-1)?.[0].state).toBe('denied');
    expect(mocks.startDeviceScan).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('surfaces a registration rejection and ignores subsequent callbacks from that generation', async () => {
    mocks.startDeviceScan.mockImplementation(async (_services, _options, listener) => {
      scanListener = listener;
      throw new Error('registration failed');
    });
    const update = vi.fn();
    const onPacket = vi.fn(async () => undefined);
    startBleMeshScan(update, { onPacket }); await flush();
    expect(update.mock.calls.at(-1)?.[0].state).toBe('error');
    const count = update.mock.calls.length;
    discover(peer()); await flush();
    expect(update).toHaveBeenCalledTimes(count);
    expect(onPacket).not.toHaveBeenCalled();
  });

  it('waits for an entered packet handler to settle before global stop resolves', async () => {
    const processing = deferred<void>();
    let signal!: AbortSignal;
    const onPacket = vi.fn(async (_packet: MeshMessage, owned: AbortSignal) => { signal = owned; await processing.promise; });
    startBleMeshScan(vi.fn(), { onPacket }); await flush();
    discover(peer()); await flush();
    expect(onPacket).toHaveBeenCalledOnce();
    let stopped = false;
    const stop = stopActiveMeshScans().then(() => { stopped = true; });
    await flush();
    expect(signal.aborted).toBe(true);
    expect(stopped).toBe(false);
    processing.resolve(); await stop;
    expect(stopped).toBe(true);
    expect(mocks.stopAdvertising).not.toHaveBeenCalled();
  });
});

describe('GATT deadlines and cancellation', () => {
  it.each(['connect', 'requestMTU', 'discoverAllServicesAndCharacteristics', 'readCharacteristicForService'] as const)('bounds a stalled %s and cancels the native transaction/connection', async (stage) => {
    const device = peer();
    device[stage].mockReturnValue(new Promise(() => undefined));
    const reading = readPacketFromDevice(device as unknown as Device);
    await flush();
    await vi.advanceTimersByTimeAsync(MESH_READ_TIMEOUT_MS);
    await expect(reading).resolves.toBeNull();
    expect(mocks.cancelTransaction).toHaveBeenCalledWith(expect.stringMatching(/^sos-read-/));
    expect(mocks.cancelDeviceConnection).toHaveBeenCalledWith(device.id);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('also bounds native disconnect cleanup', async () => {
    const device = peer();
    device.connect.mockReturnValue(new Promise(() => undefined));
    mocks.cancelTransaction.mockReturnValue(new Promise(() => undefined));
    mocks.cancelDeviceConnection.mockReturnValue(new Promise(() => undefined));
    const reading = readPacketFromDevice(device as unknown as Device);
    await vi.advanceTimersByTimeAsync(MESH_READ_TIMEOUT_MS + MESH_DISCONNECT_TIMEOUT_MS);
    await expect(reading).resolves.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a permission-independent in-flight read and disconnects a late connection', async () => {
    const device = peer();
    const connecting = deferred<TestPeer>();
    device.connect.mockReturnValue(connecting.promise);
    const controller = new AbortController();
    const reading = readPacketFromDevice(device as unknown as Device, { signal: controller.signal });
    controller.abort();
    await expect(reading).resolves.toBeNull();
    connecting.resolve(device); await flush();
    expect(device.cancelConnection).toHaveBeenCalledOnce();
    expect(device.requestMTU).not.toHaveBeenCalled();
  });

  it('uses one cancellable transaction across MTU, discovery and read and decodes the real wire format', async () => {
    const device = peer();
    await expect(readPacketFromDevice(device as unknown as Device)).resolves.toEqual(packet);
    const transaction = device.requestMTU.mock.calls[0]![1];
    expect(device.discoverAllServicesAndCharacteristics).toHaveBeenCalledWith(transaction);
    expect(device.readCharacteristicForService.mock.calls[0]![2]).toBe(transaction);
    expect(mocks.cancelTransaction).toHaveBeenCalledWith(transaction);
  });
});

describe('bounded peer processing', () => {
  it('does not reread completed older peers on each new discovery', async () => {
    startBleMeshScan(vi.fn(), { onPacket: vi.fn(async () => undefined) }); await flush();
    const peers = [peer('a'), peer('b'), peer('c')];
    for (const device of peers) { discover(device); await flush(); }
    for (const device of peers) expect(device.connect).toHaveBeenCalledOnce();
    discover(peers[0]!); await flush();
    expect(peers[0]!.connect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(MESH_DEVICE_REFRESH_MS);
    discover(peers[0]!); await flush();
    expect(peers[0]!.connect).toHaveBeenCalledTimes(2);
    expect(peers[1]!.connect).toHaveBeenCalledOnce();
  });

  it('limits simultaneous reads and stops queued work on cancellation', async () => {
    startBleMeshScan(vi.fn(), { onPacket: vi.fn(async () => undefined) }); await flush();
    const peers = Array.from({ length: 100 }, (_, index) => peer(String(index)));
    for (const device of peers) { device.connect.mockReturnValue(new Promise(() => undefined)); discover(device); }
    await flush();
    expect(peers.filter((device) => device.connect.mock.calls.length)).toHaveLength(MESH_READ_CONCURRENCY);
    await stopActiveMeshScans();
    expect(peers.filter((device) => device.connect.mock.calls.length)).toHaveLength(MESH_READ_CONCURRENCY);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('enforces a read-start budget even for rotating IDs', async () => {
    startBleMeshScan(vi.fn(), { onPacket: vi.fn(async () => undefined) }); await flush();
    const peers = Array.from({ length: 100 }, (_, index) => peer(String(index)));
    for (const device of peers) discover(device);
    await flush();
    const count = () => peers.reduce((total, device) => total + device.connect.mock.calls.length, 0);
    expect(count()).toBe(MESH_READS_PER_WINDOW);
    await vi.advanceTimersByTimeAsync(MESH_READ_WINDOW_MS - 1);
    expect(count()).toBe(MESH_READS_PER_WINDOW);
    await vi.advanceTimersByTimeAsync(1);
    expect(count()).toBeLessThanOrEqual(MESH_READS_PER_WINDOW * 2);
  });

  it('bounds and expires the discovery cache', async () => {
    const updates: BleScanUpdate[] = [];
    startBleMeshScan((update) => updates.push(update)); await flush();
    for (let index = 0; index < 100; index += 1) discover(peer(String(index)));
    await vi.advanceTimersByTimeAsync(1_001);
    discover(peer('last'));
    expect(updates.at(-1)!.devices.length).toBeLessThanOrEqual(MESH_DEVICE_CACHE_LIMIT);
    await vi.advanceTimersByTimeAsync(MESH_DEVICE_CACHE_TTL_MS);
    discover(peer('new'));
    expect(updates.at(-1)!.devices).toHaveLength(1);
  });
});

describe('automatic advertisement cancellation', () => {
  it('does not start advertising after permissions resolve for an aborted relay', async () => {
    const permission = deferred<Record<string, string>>();
    mocks.permissions.mockReturnValueOnce(permission.promise);
    const controller = new AbortController();
    const advertising = startBleAdvertising(packet, { signal: controller.signal });
    controller.abort(); permission.resolve({ scan: 'granted' });
    await expect(advertising).resolves.toMatchObject({ state: 'cancelled' });
    expect(mocks.advertise).not.toHaveBeenCalled();
  });

  it('cancels only the request owned by the aborted relay', async () => {
    const started = deferred<{ started: boolean; bytes: number }>();
    mocks.advertise.mockReturnValue(started.promise);
    mocks.stopAdvertising.mockImplementation(async () => { started.reject(new Error('cancelled')); return { stopped: true }; });
    const controller = new AbortController();
    const advertising = startBleAdvertising(packet, { signal: controller.signal });
    await flush();
    const requestId = mocks.advertise.mock.calls[0]![1];
    controller.abort();
    await expect(advertising).resolves.toMatchObject({ state: 'cancelled' });
    expect(mocks.stopAdvertising).toHaveBeenCalledWith(requestId);
    expect(requestId).toMatch(/^sos-advertise-/);
  });
});
