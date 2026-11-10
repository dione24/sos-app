import { Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { IndependenceNotice } from '@/components/IndependenceNotice';
import { Screen } from '@/components/Screen';
import { SourceLink } from '@/components/SourceLink';
import { Card, Notice, SectionHeader } from '@/components/ui';
import {
  COMMUNITY_MAP_SOURCE,
  GOVERNMENT_SOURCES,
  HISTORICAL_GOVERNMENT_SOURCES,
  type GovernmentSource,
} from '@/constants/governmentSources';
import { FACILITIES } from '@/data';
import { makeStyles } from '@/theme';

function SourceCard({ source }: { source: GovernmentSource }) {
  const s = useStyles();
  return (
    <Card style={s.source}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={s.title}>{source.title}</Text>
      <Text maxFontSizeMultiplier={1.6} style={s.body}>{source.authority}</Text>
      <SourceLink label="Ouvrir la source" url={source.url} showUrl />
      <Text maxFontSizeMultiplier={1.6} style={s.body}>{source.coverage}</Text>
      {source.note ? <Text maxFontSizeMultiplier={1.6} style={s.body}>{source.note}</Text> : null}
      <Text maxFontSizeMultiplier={1.6} style={s.meta}>Page consultée le {source.lastCheckedAt.split('-').reverse().join('/')}</Text>
    </Card>
  );
}

export default function SourcesScreen() {
  const s = useStyles();
  return (
    <Screen>
      <AppHeader title="Sources et indépendance" subtitle="Origine des informations et limites" back />

      <IndependenceNotice showSourcesLink={false} />

      <Text maxFontSizeMultiplier={1.6} style={s.body}>
        Les numéros sont retranscrits à partir des publications ci-dessous. Consulter une page ne confirme pas qu'un service répond actuellement au téléphone. L'application n'assure pas elle-même les secours.
      </Text>

      <SectionHeader title="Sources officielles des numéros" />
      {GOVERNMENT_SOURCES.map((source) => <SourceCard key={source.id} source={source} />)}

      {HISTORICAL_GOVERNMENT_SOURCES.length ? (
        <>
          <SectionHeader title="Publication ancienne · contact à confirmer" />
          {HISTORICAL_GOVERNMENT_SOURCES.map((source) => <SourceCard key={source.id} source={source} />)}
        </>
      ) : null}

      <SectionHeader title="Sources de la carte" />
      <Card style={s.source}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={s.title}>{COMMUNITY_MAP_SOURCE.title}</Text>
        <Text maxFontSizeMultiplier={1.6} style={s.body}>{COMMUNITY_MAP_SOURCE.note}</Text>
        <SourceLink label="Attribution et licence OpenStreetMap" url={COMMUNITY_MAP_SOURCE.url} showUrl />
        <Text maxFontSizeMultiplier={1.6} style={s.body}>
          Les lieux proviennent d'une base communautaire, indépendante du gouvernement. Adresses, horaires et disponibilité sont à confirmer avant de vous déplacer.
        </Text>
        {FACILITIES.map((facility) => (
          <View key={facility.id}>
            <SourceLink label={facility.name} url={`https://www.openstreetmap.org/${facility.osmType}/${facility.osmId}`} />
          </View>
        ))}
      </Card>

      <Notice text="Les références ci-dessus sont intégrées à l'application et restent lisibles hors connexion. Ouvrir un site source nécessite une connexion Internet." />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  source: { gap: t.spacing.xs },
  title: { ...t.text.bodyStrong },
  body: { ...t.text.caption },
  meta: { ...t.text.caption, color: t.colors.inkFaint },
}));
