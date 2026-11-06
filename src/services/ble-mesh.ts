import { BleManager, ScanMode, State, type Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

import ExpoBleAdvertiser from '../../modules/expo-ble-advertiser/src/ExpoBleAdvertiserModule';
import { friendlyBleAdvertisingError, friendlyBleScanError } from '@/lib/ble-errors';
import { MESH_MESSAGE_MAX_AGE_MS } from '@/lib/mesh';
import { decodeMeshWirePacket, encodeMeshWirePacket } from '@/lib/mesh-wire';
import type { MeshMessage } from '@/types/models';

// Reserved service UUID for SOS Mali development clients. Production rollout
// must register and freeze this UUID before interoperability tests.
export const SOS_MESH_SERVICE_UUID = '91f3b100-7b45-4ca9-9a62-3bd0b1f6a223';
export const SOS_MESH_PACKET_CHARACTERISTIC_UUID = '91f3b101-7b45-4ca9-9a62-3bd0b1f6a223';
const manager = new BleManager();

export type BleScanUpdate = {
  state: 'starting' | 'active' | 'bluetooth-off' | 'denied' | 'error';
  devices: Device[];
  message?: string;
};

export async function requestBlePermissions() {
  if (Platform.OS !== 'android') return true;
  if (Number(Platform.Version) >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
    const nearbyGranted = Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
    if (!nearbyGranted) return false;

    if (
      Number(Platform.Version) >= 33
      && !(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS))
    ) {
      // Refusing notifications does not disable the relay. Android still shows
      // the foreground service in its active-apps surface.
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    return true;
  }
  return (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)) === PermissionsAndroid.RESULTS.GRANTED;
}

export async function startBleMeshScan(onUpdate: (update: BleScanUpdate) => void) {
  onUpdate({ state: 'starting', devices: [], message: 'Recherche Bluetooth en cours' });
  if (!(await requestBlePermissions())) {
    onUpdate({ state: 'denied', devices: [], message: 'Accès aux appareils proches refusé' });
    return () => undefined;
  }

  const state = await manager.state();
  if (state !== State.PoweredOn) {
    onUpdate({ state: 'bluetooth-off', devices: [], message: 'Activez le Bluetooth' });
    const subscription = manager.onStateChange((nextState) => {
      if (nextState === State.PoweredOn) {
        subscription.remove();
        void startBleMeshScan(onUpdate);
      }
    }, true);
    return () => subscription.remove();
  }

  const devices = new Map<string, Device>();
  let confirmationTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    confirmationTimer = setTimeout(() => {
      onUpdate({
        state: 'starting',
        devices: [...devices.values()],
        message: 'Aucun signal Bluetooth confirmé · le téléphone peut limiter le scan',
      });
    }, 8_000);
    await manager.startDeviceScan(
      [SOS_MESH_SERVICE_UUID],
      { allowDuplicates: false, scanMode: ScanMode.LowPower },
      (error, device) => {
        if (error) {
          if (confirmationTimer) clearTimeout(confirmationTimer);
          onUpdate({ state: 'error', devices: [...devices.values()], message: friendlyBleScanError(error.message) });
          return;
        }
        if (!device) return;
        if (confirmationTimer) clearTimeout(confirmationTimer);
        // During field tests we retain all devices to expose radio coverage. Only
        // packets bearing SOS_MESH_SERVICE_UUID are accepted by the decoder.
        devices.set(device.id, device);
        onUpdate({ state: 'active', devices: [...devices.values()] });
      },
    );
    // Android confirms registration asynchronously. Do not claim that the scan is
    // active until a callback is actually received; some HiOS firmwares log a
    // registration TimeoutException without forwarding it to React Native.
  } catch (error) {
    if (confirmationTimer) clearTimeout(confirmationTimer);
    onUpdate({
      state: 'error',
      devices: [],
      message: error instanceof Error ? friendlyBleScanError(error.message) : 'Scan Bluetooth impossible',
    });
  }

  return () => {
    if (confirmationTimer) clearTimeout(confirmationTimer);
    void manager.stopDeviceScan();
  };
}

export function packetFromAdvertisement(device: Device): MeshMessage | null {
  const advertisesService = device.serviceUUIDs?.some((uuid) => uuid.toLowerCase() === SOS_MESH_SERVICE_UUID) ?? false;
  if (!advertisesService || !device.manufacturerData) return null;
  try {
    const bytes = Uint8Array.from(atob(device.manufacturerData), (char) => char.charCodeAt(0));
    return decodeMeshWirePacket(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function isSosMeshDevice(device: Device) {
  return device.serviceUUIDs?.some((uuid) => uuid.toLowerCase() === SOS_MESH_SERVICE_UUID) ?? false;
}

function decodePacketBase64(value: string | null): MeshMessage | null {
  if (!value) return null;
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    return decodeMeshWirePacket(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Reads the full SOS packet from the native GATT server exposed by a peer. */
export async function readPacketFromDevice(device: Device): Promise<MeshMessage | null> {
  if (!isSosMeshDevice(device)) return packetFromAdvertisement(device);
  let connected: Device | null = null;
  try {
    connected = await device.connect({ timeout: 10_000 });
    try {
      connected = await connected.requestMTU(512);
    } catch {
      // Some Android vendors negotiate the largest available MTU automatically.
    }
    connected = await connected.discoverAllServicesAndCharacteristics();
    const characteristic = await connected.readCharacteristicForService(
      SOS_MESH_SERVICE_UUID,
      SOS_MESH_PACKET_CHARACTERISTIC_UUID,
    );
    return decodePacketBase64(characteristic.value);
  } catch {
    return packetFromAdvertisement(device);
  } finally {
    if (connected) {
      try {
        await connected.cancelConnection();
      } catch {
        // The peer may have disconnected after serving the packet.
      }
    }
  }
}

/** Starts connectable BLE advertising and serves this packet through GATT. */
export async function startBleAdvertising(message: MeshMessage) {
  if (Platform.OS !== 'android') {
    return { state: 'unsupported' as const, message: 'Diffusion native disponible sur Android uniquement' };
  }
  if (!(await requestBlePermissions())) {
    return { state: 'denied' as const, message: 'Accès aux appareils proches refusé' };
  }
  if (Date.now() - message.createdAt > MESH_MESSAGE_MAX_AGE_MS) {
    return { state: 'expired' as const, message: "Cette alerte a expiré et ne peut plus être diffusée" };
  }
  try {
    const support = await ExpoBleAdvertiser.isSupportedAsync();
    if (!support.enabled) return { state: 'bluetooth-off' as const, message: 'Activez le Bluetooth' };
    if (!support.supported) return { state: 'unsupported' as const, message: 'Diffusion BLE non prise en charge par ce téléphone' };
    const { medicalSummary: _medicalSummary, ...packet } = message;
    const result = await ExpoBleAdvertiser.startAdvertisingAsync(encodeMeshWirePacket(packet));
    return { state: 'active' as const, bytes: result.bytes };
  } catch (error) {
    return {
      state: 'error' as const,
      message: error instanceof Error ? friendlyBleAdvertisingError(error.message) : 'Diffusion Bluetooth impossible',
    };
  }
}

export async function stopBleAdvertising() {
  if (Platform.OS === 'android') await ExpoBleAdvertiser.stopAdvertisingAsync();
}

export async function getBleAdvertisingStatus() {
  if (Platform.OS !== 'android') return false;
  return (await ExpoBleAdvertiser.getStatusAsync()).advertising;
}

export function observeBleAdvertising(listener: (active: boolean) => void) {
  if (Platform.OS !== 'android') return { remove() {} };
  return ExpoBleAdvertiser.addListener('onAdvertisingStateChanged', (status) => listener(status.advertising));
}
