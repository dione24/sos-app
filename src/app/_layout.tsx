import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import * as Crypto from 'expo-crypto';
import { isLoaded, useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { migrateDatabase } from '@/db/database';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createBootstrapSession, readBootstrapState } from '@/lib/bootstrap';
import { useAppStore } from '@/store/app-store';
import { ThemeProvider, makeStyles, useTheme } from '@/theme';

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
  const { colors, dark } = useTheme();
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
        // Native Stack owns the focused screen's system bars on Android.
        statusBarStyle: dark ? 'light' : 'dark',
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
  // Android release embeds these exact families through the font plugin. The
  // runtime fallback keeps web, iOS and older native development clients usable.
  const [loaded, fontError] = useFonts(Platform.OS === 'android' && isLoaded('DMSans_400Regular')
    ? {}
    : { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  const [databaseKey, setDatabaseKey] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    void getOrCreateDatabaseKey()
      .then(setDatabaseKey)
      .catch(() => setSetupError("Impossible d'ouvrir le stockage chiffré de l'appareil."));
  }, []);

  // Référence stable : un `onInit` recréé (ex. bascule clair/sombre) ferait
  // rouvrir la base par SQLiteProvider et démonterait les écrans en cours.
  const initDatabase = useCallback(
    async (db: Parameters<typeof migrateDatabase>[0]) => {
      await migrateDatabase(db, databaseKey ?? '');
      setDatabaseReady(true);
    },
    [databaseKey],
  );
  const onDatabaseError = useCallback(() => {
    // The provider calls onError while rendering: defer the parent state write.
    void Promise.resolve().then(() => setSetupError("Impossible d'ouvrir le stockage chiffré de l'appareil."));
  }, []);

  if (fontError || setupError) return <BootStatus label={setupError ?? 'Les polices intégrées sont indisponibles.'} error />;
  if (!databaseKey) return <BootStatus label="Préparation de Nafalan…" />;

  return (
    <View style={{ flex: 1 }}>
      <SQLiteProvider databaseName="sos-securite-mali-secure-v2.db" onInit={initDatabase} onError={onDatabaseError}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {loaded ? <BootstrapGate /> : <BootStatus label="Préparation de l’affichage…" />}
      </SQLiteProvider>
      {!databaseReady ? <View style={{ position: 'absolute', inset: 0 }}><BootStatus label="Ouverture sécurisée…" /></View> : null}
    </View>
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
