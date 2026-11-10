import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { TransformRequestManager } from '@maplibre/maplibre-react-native';
import * as Crypto from 'expo-crypto';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { migrateDatabase } from '@/db/database';
import { MAP_REQUEST_USER_AGENT } from '@/constants/map';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createBootstrapSession, readBootstrapState } from '@/lib/bootstrap';
import { useAppStore } from '@/store/app-store';
import { ThemeProvider, makeStyles, useTheme } from '@/theme';

const DATABASE_KEY_NAME = 'sos_mali_database_key_v1';

// Appliqué aussi aux ressources du pack hors ligne, avant le premier écran carte.
TransformRequestManager.addHeader({
  id: 'sos-maptiler-user-agent',
  match: '^https://api\\.maptiler\\.com/',
  name: 'User-Agent',
  value: MAP_REQUEST_USER_AGENT,
});

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
  const { colors } = useTheme();
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [checked, setChecked] = useState(false);
  const [bootstrapError, setBootstrapError] = useState(false);
  const bootstrap = useMemo(
    () => createBootstrapSession(async () => {
      const state = await readBootstrapState(db);
      if (useAppStore.getState().language !== 'fr') setLanguage('fr');
      return state;
    }),
    [db, setLanguage],
  );

  useEffect(() => {
    let mounted = true;
    void bootstrap(pathname)
      .then((destination) => {
        if (!mounted) return;
        setChecked(true);
        if (destination) router.replace(destination);
      })
      .catch(() => {
        if (mounted) setBootstrapError(true);
      });
    return () => {
      mounted = false;
    };
  }, [bootstrap, pathname, router]);

  const reducedMotion = useReducedMotion();

  if (bootstrapError) return <BootStatus label="Impossible de lire les préférences de l'appareil." error />;
  if (!checked) return <BootStatus label="Ouverture sécurisée…" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
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
      <Stack.Screen name="sources" />
    </Stack>
  );
}

function ThemedApp() {
  const { dark } = useTheme();
  const [loaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  const [databaseKey, setDatabaseKey] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    void getOrCreateDatabaseKey()
      .then(setDatabaseKey)
      .catch(() => setSetupError("Impossible d'ouvrir le stockage chiffré de l'appareil."));
  }, []);

  // Référence stable : un `onInit` recréé (ex. bascule clair/sombre) ferait
  // rouvrir la base par SQLiteProvider et démonterait les écrans en cours.
  const initDatabase = useCallback(
    (db: Parameters<typeof migrateDatabase>[0]) => migrateDatabase(db, databaseKey ?? ''),
    [databaseKey],
  );

  if (fontError || setupError) return <BootStatus label={setupError ?? 'Les polices intégrées sont indisponibles.'} error />;
  if (!loaded || !databaseKey) return <BootStatus label="Préparation de SOS Mali…" />;

  return (
    <SQLiteProvider databaseName="sos-securite-mali-secure-v2.db" onInit={initDatabase}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <BootstrapGate />
    </SQLiteProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

function BootStatus({ label, error = false }: { label: string; error?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View accessibilityRole={error ? 'alert' : undefined} accessibilityLabel={label} style={s.boot}>
      {!error ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      <Text style={[s.bootText, error && s.bootError]}>{label}</Text>
      {error ? <Text style={s.bootHint}>Redémarrez le téléphone puis réessayez. Aucune donnée non chiffrée ne sera créée.</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md, padding: t.spacing.xl, backgroundColor: t.colors.bg },
  bootText: { fontSize: 17, lineHeight: 24, color: t.colors.ink, textAlign: 'center' },
  bootError: { color: t.colors.dangerText, fontWeight: '700' },
  bootHint: { fontSize: 14, lineHeight: 20, color: t.colors.inkMuted, textAlign: 'center' },
}));
