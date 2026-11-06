/** Shim web de `react-native-ble-plx` (captures uniquement) : Bluetooth non pris en charge. */
export enum State {
  Unknown = 'Unknown',
  Unsupported = 'Unsupported',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn',
}

export enum ScanMode {
  LowPower = 0,
  Balanced = 1,
  LowLatency = 2,
}

export type Device = {
  id: string;
  name: string | null;
  serviceUUIDs?: string[] | null;
  manufacturerData?: string | null;
};

export class BleManager {
  async state() {
    return State.Unsupported;
  }

  onStateChange(_listener: (state: State) => void, _emitCurrent?: boolean) {
    return { remove() {} };
  }

  startDeviceScan(_uuids: string[] | null, _options: unknown, _listener: unknown) {}

  stopDeviceScan() {}

  async connectToDevice(): Promise<never> {
    throw new Error('Bluetooth indisponible sur le web');
  }

  async cancelDeviceConnection() {}

  destroy() {}
}
