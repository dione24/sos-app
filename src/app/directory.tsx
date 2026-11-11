import PhoneCall from 'lucide-react-native/icons/phone-call';
import Search from 'lucide-react-native/icons/search';
import SearchX from 'lucide-react-native/icons/search-x';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { IndependenceNotice } from '@/components/IndependenceNotice';
import { Screen } from '@/components/Screen';
import { SourceLink } from '@/components/SourceLink';
import { Divider, EmptyState, ListGroup, SectionHeader } from '@/components/ui';
import { EMERGENCY_NUMBERS } from '@/data';
import { confirmCall } from '@/services/phone';
import { makeStyles, useTheme } from '@/theme';
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
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matchesSearch(item: EmergencyNumber, query: string) {
  if (!query) return true;
  const searchable = [item.number, item.dialNumber, item.name, item.description, item.scope, categoryLabels[item.category]].join(' ');
  return normalizeSearch(searchable).includes(query);
}

function NumberRow({ item }: { item: EmergencyNumber }) {
  const s = useStyles();
  const { colors } = useTheme();
  const needsVerification = item.status === 'needs_field_verification';
  const urgent = item.category === 'urgence';
  return (
    <View style={s.row}>
      <View style={s.numberBox}>
        <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} maxFontSizeMultiplier={1.2} style={[s.number, urgent && s.numberUrgent]}>
          {item.number}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={s.category}>{categoryLabels[item.category]}</Text>
      </View>
      <View style={s.copy}>
        <Text maxFontSizeMultiplier={1.4} style={s.name}>{item.name}</Text>
        <Text maxFontSizeMultiplier={1.5} style={s.description}>{item.description}</Text>
        <View style={s.scopeRow}>
          {needsVerification ? <TriangleAlert size={14} color={colors.warningText} /> : null}
          <Text maxFontSizeMultiplier={1.4} style={[s.scope, needsVerification && s.scopePending]}>
            {needsVerification ? 'Contact à confirmer' : item.scope}
          </Text>
        </View>
        <SourceLink label={`Source : ${item.sourceLabel}`} url={item.sourceUrl} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Appeler ${item.name} au ${item.number}`}
        onPress={() => confirmCall(item.dialNumber, item.name)}
        style={({ pressed }) => [s.call, urgent && s.callUrgent, pressed && s.callPressed]}
      >
        <PhoneCall size={22} color={urgent ? colors.onColor : colors.primaryText} />
      </Pressable>
    </View>
  );
}

function NumberGroup({ items }: { items: EmergencyNumber[] }) {
  return (
    <ListGroup>
      {items.map((item, index) => (
        <View key={item.number}>
          {index > 0 ? <Divider inset /> : null}
          <NumberRow item={item} />
        </View>
      ))}
    </ListGroup>
  );
}

export default function DirectoryScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const query = normalizeSearch(search);
  const visible = useMemo(() => EMERGENCY_NUMBERS.filter((item) => matchesSearch(item, query)), [query]);
  const urgent = visible.filter((item) => item.category === 'urgence');
  const useful = visible.filter((item) => ['orientation', 'assistance', 'signalement'].includes(item.category));
  const alternatives = visible.filter((item) => item.category === 'alternative');
  const services = visible.filter((item) => item.category === 'service');

  return (
    <Screen>
      <AppHeader title="Numéros utiles" subtitle={`Mali · ${EMERGENCY_NUMBERS.length} contacts, disponibles sans connexion`} back />

      <IndependenceNotice />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Appeler la Protection Civile au 122"
        onPress={() => confirmCall('122', 'Protection Civile')}
        style={({ pressed }) => [s.priority, pressed && s.priorityPressed]}
      >
        <View style={s.priorityCopy}>
          <Text maxFontSizeMultiplier={1.2} style={s.priorityNumber}>122</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.priorityTitle}>Danger immédiat ou victime</Text>
          <Text maxFontSizeMultiplier={1.5} style={s.priorityText}>Accident, incendie, noyade, inondation ou secours à personne.</Text>
        </View>
        <View style={s.priorityCall}>
          <PhoneCall size={26} color={colors.onColor} />
        </View>
      </Pressable>

      <View style={s.searchBox}>
        <Search size={22} color={colors.inkFaint} />
        <TextInput
          accessibilityLabel="Rechercher un numéro ou un service"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          maxFontSizeMultiplier={1.5}
          onChangeText={setSearch}
          placeholder="Police, santé, eau, électricité…"
          placeholderTextColor={colors.inkFaint}
          returnKeyType="search"
          selectionColor={colors.primary}
          style={s.searchInput}
          value={search}
        />
      </View>

      {urgent.length ? <><SectionHeader title="Urgences nationales" aside="numéros courts" /><NumberGroup items={urgent} /></> : null}
      {useful.length ? <><SectionHeader title="Santé et assistance" /><NumberGroup items={useful} /></> : null}
      {alternatives.length ? <><SectionHeader title="Autres lignes de secours" /><NumberGroup items={alternatives} /></> : null}
      {services.length ? <><SectionHeader title="Eau et électricité" /><NumberGroup items={services} /></> : null}

      {visible.length === 0 ? (
        <EmptyState icon={<SearchX size={28} color={colors.inkMuted} />} title="Aucun contact trouvé" text="Essayez par exemple « police », « eau », « santé » ou un numéro." />
      ) : null}

      <Text maxFontSizeMultiplier={1.6} style={s.note}>
        Gardez votre calme. Donnez d'abord votre position, un repère visible, la nature du danger et le nombre de personnes concernées. N'appelez jamais une ligne d'urgence pour un test non planifié.
      </Text>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  priority: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.dangerBg,
    borderWidth: 1,
    borderColor: t.colors.dangerBorder,
  },
  priorityPressed: { opacity: 0.85 },
  priorityCopy: { flex: 1, gap: 2 },
  priorityNumber: { fontFamily: 'DMSans_700Bold', fontSize: 40, lineHeight: 46, letterSpacing: -0.5, color: t.colors.dangerText },
  priorityTitle: { ...t.text.bodyStrong },
  priorityText: { ...t.text.caption },
  priorityCall: { width: t.hit.action, height: t.hit.action, borderRadius: t.hit.action / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.sos },
  searchBox: {
    minHeight: t.hit.action,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  searchInput: { flex: 1, minHeight: t.hit.action - 2, fontFamily: 'DMSans_400Regular', fontSize: 16, color: t.colors.ink, paddingVertical: t.spacing.sm },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm },
  numberBox: { width: 96, gap: 2 },
  number: { fontFamily: 'DMSans_700Bold', fontSize: 20, lineHeight: 26, color: t.colors.ink },
  numberUrgent: { color: t.colors.dangerText },
  category: { ...t.text.caption, fontSize: 13, lineHeight: 18, color: t.colors.inkFaint },
  copy: { flex: 1, gap: 2 },
  name: { ...t.text.bodyStrong, fontSize: 15, lineHeight: 20 },
  description: { ...t.text.caption },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scope: { ...t.text.caption, fontSize: 13, lineHeight: 18, color: t.colors.inkFaint },
  scopePending: { color: t.colors.warningText },
  call: { width: t.hit.control, height: t.hit.control, borderRadius: t.hit.control / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primaryBg, borderWidth: 1, borderColor: t.colors.primaryBorder },
  callUrgent: { backgroundColor: t.colors.sos, borderColor: t.colors.sos },
  callPressed: { opacity: 0.75 },
  note: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center', paddingHorizontal: t.spacing.sm },
}));
