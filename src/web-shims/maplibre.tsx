/** Shim web de `@maplibre/maplibre-react-native` (captures uniquement). */
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

export function Map({ children, style }: { children?: ReactNode; style?: ViewStyle; mapStyle?: string }) {
  return <View style={style}>{children}</View>;
}

export function Camera(_props: unknown) {
  return null;
}

export function Marker({ children }: { children?: ReactNode; id?: string; lngLat?: [number, number]; onPress?: () => void }) {
  return <>{children}</>;
}

export const OfflineManager = {
  async createPack(
    _options: unknown,
    _onProgress?: unknown,
    onError?: (pack: unknown, error: { message: string }) => void,
  ) {
    onError?.(null, { message: 'Carte hors ligne indisponible sur le web' });
    return { async resume() {} };
  },
};
