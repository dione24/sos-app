import { PhoneCall, Search, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Badge, Card, SectionTitle } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { EMERGENCY_NUMBERS } from '@/data';
import { confirmCall } from '@/services/phone';
import type { EmergencyNumber } from '@/types/models';

const categoryLabels: Record<EmergencyNumber['category'], string> = {
  urgence: 'Urgence',
  orientation: 'Santé',
  assistance: 'Assistance',
  signalement: 'Signalement',
  alternative: 'Autre ligne',
  service: 'Service utile',
};

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function matchesSearch(item: EmergencyNumber, query: string) {
  if (!query) return true;
  const searchable = [item.number, item.dialNumber, item.name, item.description, item.scope, categoryLabels[item.category]]
    .join(' ');
  return normalizeSearch(searchable).includes(query);
}

function NumberRow({ item, last }: { item: EmergencyNumber; last: boolean }) {
  const needsVerification = item.status === 'needs_field_verification';
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowTop}>
        <View style={styles.numberBox}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.number, needsVerification && styles.numberPending]}
          >
            {item.number}
          </Text>
          <Text style={styles.category}>{categoryLabels[item.category]}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.scopeRow}>
            {needsVerification ? <TriangleAlert size={12} color={colors.amber} /> : null}
            <Text style={[styles.scope, needsVerification && styles.scopePending]}>
              {needsVerification ? 'Contact à confirmer' : item.scope}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Appeler ${item.name} au ${item.number}`}
          onPress={() => confirmCall(item.dialNumber, item.name)}
          style={({ pressed }) => [
            styles.call,
            item.category === 'urgence' && styles.callUrgent,
            needsVerification && styles.callPending,
            pressed && styles.callPressed,
          ]}
        >
          <PhoneCall size={20} color={colors.black} />
        </Pressable>
      </View>
    </View>
  );
}

function NumberGroup({ items }: { items: EmergencyNumber[] }) {
  return (
    <Card style={styles.card}>
      {items.map((item, index) => <NumberRow key={item.number} item={item} last={index === items.length - 1} />)}
    </Card>
  );
}

export default function DirectoryScreen() {
  const [search, setSearch] = useState('');
  const query = normalizeSearch(search);
  const visible = useMemo(
    () => EMERGENCY_NUMBERS.filter((item) => matchesSearch(item, query)),
    [query],
  );
  const urgent = visible.filter((item) => item.category === 'urgence');
  const useful = visible.filter((item) => ['orientation', 'assistance', 'signalement'].includes(item.category));
  const alternatives = visible.filter((item) => item.category === 'alternative');
  const services = visible.filter((item) => item.category === 'service');

  return (
    <Screen>
      <AppHeader title="Numéros utiles" eyebrow="Mali" back action={<Badge label={`${EMERGENCY_NUMBERS.length} contacts`} />} />

      <Card style={styles.priorityCard}>
        <Text style={styles.priorityNumber}>122</Text>
        <View style={styles.priorityCopy}>
          <Text style={styles.priorityTitle}>Danger immédiat ou victime</Text>
          <Text style={styles.priorityText}>Accident, incendie, noyade, inondation ou secours à personne.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Appeler la Protection Civile au 122" onPress={() => confirmCall('122', 'Protection Civile')} style={styles.priorityCall}>
          <PhoneCall size={23} color={colors.black} />
        </Pressable>
      </Card>

      <View style={styles.searchBox}>
        <Search size={21} color={colors.sandMuted} />
        <TextInput
          accessibilityLabel="Rechercher un numéro ou un service"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          maxFontSizeMultiplier={1.5}
          onChangeText={setSearch}
          placeholder="Police, santé, eau, électricité…"
          placeholderTextColor={colors.sandFaint}
          returnKeyType="search"
          selectionColor={colors.alert}
          style={styles.searchInput}
          value={search}
        />
      </View>

      {urgent.length ? <><SectionTitle title="Urgences nationales" aside="numéros courts" /><NumberGroup items={urgent} /></> : null}
      {useful.length ? <><SectionTitle title="Santé et assistance" /><NumberGroup items={useful} /></> : null}
      {alternatives.length ? <><SectionTitle title="Autres lignes de secours" /><NumberGroup items={alternatives} /></> : null}
      {services.length ? <><SectionTitle title="Eau et électricité" /><NumberGroup items={services} /></> : null}

      {visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucun contact trouvé</Text>
          <Text style={styles.emptyText}>Essayez par exemple « police », « eau », « santé » ou un numéro.</Text>
        </Card>
      ) : null}

      <Text style={styles.note}>Gardez votre calme. Donnez d'abord votre position, un repère visible, la nature du danger et le nombre de personnes concernées. N'appelez jamais une ligne d'urgence pour un test non planifié.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  priorityCard: { minHeight: 108, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.alertDark, borderColor: '#FFD2C9' },
  priorityNumber: { fontFamily: font.display, fontSize: 36, color: colors.alertLight },
  priorityCopy: { flex: 1 },
  priorityTitle: { fontFamily: font.bodyBold, fontSize: 14, color: colors.sand },
  priorityText: { ...type.small, fontSize: 12, lineHeight: 17, marginTop: 3 },
  priorityCall: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.alert },
  searchBox: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface },
  searchInput: { flex: 1, minHeight: 52, fontFamily: font.body, fontSize: 16, color: colors.sand, paddingVertical: spacing.sm },
  card: { paddingVertical: 0 },
  row: { paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowTop: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numberBox: { width: 108 },
  number: { fontFamily: font.display, fontSize: 18, color: colors.amber },
  numberPending: { color: colors.amberLight },
  category: { ...type.eyebrow, fontSize: 11, color: colors.sandFaint },
  copy: { flex: 1 },
  name: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  description: { ...type.small, fontSize: 12, lineHeight: 17, marginTop: 2 },
  scopeRow: { minHeight: 16, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  scope: { flex: 1, fontFamily: font.bodyMedium, fontSize: 11, color: colors.sandMuted },
  scopePending: { color: colors.amberLight },
  call: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  callUrgent: { backgroundColor: colors.alert },
  callPending: { backgroundColor: colors.amber },
  callPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  emptyCard: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyTitle: { fontFamily: font.bodyBold, fontSize: 16, color: colors.sand },
  emptyText: { ...type.small, textAlign: 'center' },
  note: { ...type.small, textAlign: 'center', paddingHorizontal: spacing.md, fontSize: 11, lineHeight: 16 },
});
