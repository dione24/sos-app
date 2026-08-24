import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import * as Crypto from 'expo-crypto';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { getProfile, getSetting, migrateDatabase, setSetting } from '@/db/database';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAppStore } from '@/store/app-store';

const DATABASE_KEY_NAME = 'sos_mali_database_key_v1';

async function getOrCreateDatabaseKey() {
  const saved = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (saved) return saved;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

function BootstrapGate() {
  const db = useSQLiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const [profile, skipped, language] = await Promise.all([
        getProfile(db),
        getSetting(db, 'onboarding_skipped'),
        getSetting(db, 'language'),
      ]);
      if (!mounted) return;
      if (language === 'bm') {
        setLanguage('fr');
        await setSetting(db, 'language', 'fr');
      } else if (language === 'fr') {
        setLanguage('fr');
      }
      setChecked(true);
      if (!profile && skipped !== '1' && pathname !== '/onboarding') {
        router.replace('/onboarding');
      }
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [db, pathname, router, setLanguage]);

  const reducedMotion = useReducedMotion();

  if (!checked) return <BootStatus label="Ouverture sécurisée…" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.void },
        animation: reducedMotion ? 'none' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="sos" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="guide/[id]" />
      <Stack.Screen name="cpr" />
      <Stack.Screen name="directory" />
      <Stack.Screen name="weather" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const [databaseKey, setDatabaseKey] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    void getOrCreateDatabaseKey()
      .then(setDatabaseKey)
      .catch(() => setSetupError("Impossible d'ouvrir le stockage chiffré de l'appareil."));
  }, []);

  if (fontError || setupError) return <BootStatus label={setupError ?? 'Les polices intégrées sont indisponibles.'} error />;
  if (!loaded || !databaseKey) return <BootStatus label="Préparation de SOS Mali…" />;

  return (
    <SQLiteProvider databaseName="sos-securite-mali-secure-v2.db" onInit={(db) => migrateDatabase(db, databaseKey)}>
      <StatusBar style="dark" />
      <BootstrapGate />
    </SQLiteProvider>
  );
}

function BootStatus({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <View accessibilityRole={error ? 'alert' : undefined} accessibilityLabel={label} style={styles.boot}>
      {!error ? <ActivityIndicator color={colors.amber} size="large" /> : null}
      <Text style={[styles.bootText, error && styles.bootError]}>{label}</Text>
      {error ? <Text style={styles.bootHint}>Redémarrez le téléphone puis réessayez. Aucune donnée non chiffrée ne sera créée.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28, backgroundColor: colors.void },
  bootText: { color: colors.sand, fontSize: 17, textAlign: 'center' },
  bootError: { color: colors.alertLight, fontWeight: '700' },
  bootHint: { color: colors.sandMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
