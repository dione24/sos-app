import { Tabs, usePathname } from 'expo-router';
import { BookOpenText, House, MapPinned, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { EmergencyFab } from '@/components/EmergencyFab';
import { colors, font } from '@/constants/theme';
import { useI18n } from '@/i18n/use-i18n';

const tabIcon = (Icon: typeof House) =>
  function IconRenderer({ color, focused }: { color: import('react-native').ColorValue; focused: boolean }) {
    return <Icon color={String(color)} size={focused ? 23 : 21} strokeWidth={focused ? 2.7 : 2} />;
  };

export default function TabLayout() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.void },
          tabBarActiveTintColor: colors.alert,
          tabBarInactiveTintColor: colors.sandFaint,
          tabBarAllowFontScaling: true,
          tabBarLabelStyle: { fontFamily: font.bodyMedium, fontSize: 11, marginTop: 1 },
          tabBarStyle: {
            minHeight: 76,
            height: undefined,
            paddingTop: 8,
            paddingBottom: 12,
            borderTopColor: colors.hairline,
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

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.void } });
