/** Shim web du module natif `expo-ble-advertiser` (captures uniquement). */
export type AdvertiserSupport = { supported: boolean; enabled: boolean; advertising: boolean };
export type AdvertiserStatus = { advertising: boolean; bytes: number };

export default {
  async isSupportedAsync(): Promise<AdvertiserSupport> {
    return { supported: false, enabled: false, advertising: false };
  },
  async startAdvertisingAsync(_payload: string) {
    return { started: false, bytes: 0 };
  },
  async stopAdvertisingAsync() {
    return { stopped: true };
  },
  async getStatusAsync(): Promise<AdvertiserStatus> {
    return { advertising: false, bytes: 0 };
  },
  async signPayloadAsync(_payload: string) {
    return { publicKey: '', signature: '' };
  },
  async verifyPayloadAsync(_payload: string, _publicKey: string, _signature: string) {
    return false;
  },
};
