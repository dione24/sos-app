import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

let reported = false;

/** No identifiers or medical data: just a local timing milestone. */
export async function reportAppReady() {
  if (reported) return;
  performance.mark?.('sos:content-ready');
  if (Platform.OS !== 'android') { reported = true; return; }
  try {
    const native = requireOptionalNativeModule<{ reportFullyDrawnAsync(): Promise<boolean> }>('SosAppReadiness');
    reported = await native?.reportFullyDrawnAsync() ?? false;
  } catch {
    // A diagnostic must never prevent the emergency routes from opening.
  }
}
