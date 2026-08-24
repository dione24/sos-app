import { create } from 'zustand';

import type { Coordinates, Language } from '@/types/models';

type AppState = {
  language: Language;
  lastPosition: Coordinates | null;
  setLanguage: (language: Language) => void;
  setLastPosition: (position: Coordinates | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  language: 'fr',
  lastPosition: null,
  setLanguage: (language) => set({ language }),
  setLastPosition: (lastPosition) => set({ lastPosition }),
}));
