import { useRouter } from 'expo-router';
import { Info } from 'lucide-react-native';

import { Button, Notice } from '@/components/ui';
import { GOVT_INDEPENDENCE_NOTICE } from '@/constants/governmentSources';
import { useTheme } from '@/theme';

/** Information publique visible sans ouvrir les réglages ni un lien externe. */
export function IndependenceNotice({ showSourcesLink = true }: { showSourcesLink?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Notice
      icon={<Info size={20} color={colors.infoText} />}
      tone="info"
      text={GOVT_INDEPENDENCE_NOTICE}
    >
      {showSourcesLink ? (
        <Button
          label="Sources officielles et indépendance"
          accessibilityHint="Consulter les références et leurs limites dans l'application"
          onPress={() => router.push('/sources')}
          variant="ghost"
          size="md"
        />
      ) : null}
    </Notice>
  );
}
