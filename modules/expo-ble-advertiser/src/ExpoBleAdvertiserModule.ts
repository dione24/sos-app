import { requireNativeModule } from 'expo';

export type AdvertiserSupport = {
  supported: boolean;
  enabled: boolean;
  advertising: boolean;
};

export type AdvertiserStatus = {
  advertising: boolean;
  bytes: number;
};

export default requireNativeModule<{
  isSupportedAsync(): Promise<AdvertiserSupport>;
  startAdvertisingAsync(payload: string): Promise<{ started: boolean; bytes: number }>;
  stopAdvertisingAsync(): Promise<{ stopped: boolean }>;
  getStatusAsync(): Promise<AdvertiserStatus>;
  addListener(event: 'onAdvertisingStateChanged', listener: (status: { advertising: boolean }) => void): { remove(): void };
  signPayloadAsync(payload: string): Promise<{ publicKey: string; signature: string }>;
  verifyPayloadAsync(payload: string, publicKey: string, signature: string): Promise<boolean>;
}>("ExpoBleAdvertiser");
