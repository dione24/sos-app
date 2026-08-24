import { useCallback } from 'react';

import { translate, type MessageKey } from '@/i18n/messages';
import { useAppStore } from '@/store/app-store';
import type { Language } from '@/types/models';

export function useI18n() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const t = useCallback((key: MessageKey) => translate(language, key), [language]);

  return {
    language,
    setLanguage: (next: Language) => setLanguage(next),
    t,
    isBambara: language === 'bm',
  };
}
