import { Tabs, usePathname } from 'expo-router';
import { BookOpenText, House, MapPinned, UserRound } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmergencyFab } from '@/components/EmergencyFab';
import { useI18n } from '@/i18n/use-i18n';
import { font, makeStyles, useTheme } from '@/theme';

const tabIcon = (Icon: typeof House) =>
  function IconRenderer({ color, focused }: { color: import('react-native').ColorValue; focused: boolean }) {
    return <Icon color={String(color)} size={24} strokeWidth={focused ? 2.4 : 2} />;
  };

export default function TabLayout() {
  const s = useStyles();
  const { colors } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return (
    <View style={s.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bg },
          tabBarActiveTintColor: colors.primaryText,
          tabBarInactiveTintColor: colors.inkFaint,
          tabBarAllowFontScaling: true,
          tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 12, marginTop: 2 },
          tabBarStyle: {
            height: 64 + Math.max(insets.bottom, 8),
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopColor: colors.border,
            borderTopWidth: 1,
            backgroundColor: colors.surface,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs_home'), tabBarIcon: tabIcon(House) }} />
        <Tabs.Screen name="guides" options={{ title: t('tabs_guides'), tabBarIcon: tabIcon(BookOpenText) }} />
        <Tabs.Screen name="map" options={{ title: t('tabs_map'), tabBarIcon: tabIcon(MapPinned) }} />
        <Tabs.Screen name="mesh" options={{ href: null, title: t('tabs_mesh') }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs_profile'), tabBarIcon: tabIcon(UserRound) }} />
      </Tabs>
      {pathname !== '/' && pathname !== '/mesh' ? <EmergencyFab /> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({ container: { flex: 1, backgroundColor: t.colors.bg } }));
