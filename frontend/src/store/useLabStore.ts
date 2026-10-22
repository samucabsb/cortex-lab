import { create } from 'zustand';
import { ReviewSnapshot } from '@/types';

export interface ByokSettings {
  geminiApiKey: string;
  groqApiKey: string;
  preferredProvider?: 'gemini' | 'groq' | 'backend';
}

export interface AccessibilitySettings {
  fontScale: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reducedMotion: boolean;
}

interface LabStoreState {
  // Hydration flag (true only after client mount to prevent SSR hydration mismatch)
  hasHydrated: boolean;

  // Active Review State
  reviewId: string | null;
  snapshot: ReviewSnapshot | null;
  wizardStep: 1 | 2 | 3 | 4;

  // BYOK Settings (Bring Your Own Key)
  byok: ByokSettings;
  byokModalOpen: boolean;

  // Accessibility Settings (WCAG AA)
  a11y: AccessibilitySettings;

  // Actions
  hydrateFromStorage: () => void;
  setReviewId: (id: string | null) => void;
  setSnapshot: (snapshot: ReviewSnapshot | null) => void;
  setWizardStep: (step: 1 | 2 | 3 | 4) => void;
  setByokModalOpen: (open: boolean) => void;
  saveByokSettings: (settings: Partial<ByokSettings>) => void;
  updateA11y: (settings: Partial<AccessibilitySettings>) => void;
  resetAll: () => void;
}

const DEFAULT_BYOK: ByokSettings = {
  geminiApiKey: '',
  groqApiKey: '',
};

const DEFAULT_A11Y: AccessibilitySettings = {
  fontScale: 'normal',
  highContrast: false,
  reducedMotion: false,
};

export const useLabStore = create<LabStoreState>((set) => ({
  hasHydrated: false,
  reviewId: null,
  snapshot: null,
  wizardStep: 1,

  // Always start with deterministic SSR-safe defaults; hydrate in useEffect
  byok: DEFAULT_BYOK,
  byokModalOpen: false,
  a11y: DEFAULT_A11Y,

  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return;
    let loadedByok = DEFAULT_BYOK;
    let loadedA11y = {
      ...DEFAULT_A11Y,
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
    };

    try {
      const savedByok = localStorage.getItem('cortex_byok_keys');
      if (savedByok) {
        loadedByok = { ...DEFAULT_BYOK, ...JSON.parse(savedByok) };
      }
    } catch {
      // Ignore storage errors
    }

    try {
      const savedA11y = localStorage.getItem('cortex_a11y_settings');
      if (savedA11y) {
        loadedA11y = { ...loadedA11y, ...JSON.parse(savedA11y) };
      }
    } catch {
      // Ignore storage errors
    }

    set({
      hasHydrated: true,
      byok: loadedByok,
      a11y: loadedA11y,
    });
  },

  setReviewId: (id) => set({ reviewId: id }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setWizardStep: (step) => set({ wizardStep: step }),
  setByokModalOpen: (open) => set({ byokModalOpen: open }),

  saveByokSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.byok, ...newSettings };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cortex_byok_keys', JSON.stringify(updated));
      }
      return { byok: updated };
    });
  },

  updateA11y: (newSettings) => {
    set((state) => {
      const updated = { ...state.a11y, ...newSettings };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cortex_a11y_settings', JSON.stringify(updated));
      }
      return { a11y: updated };
    });
  },

  resetAll: () => {
    set({
      reviewId: null,
      snapshot: null,
      wizardStep: 1,
    });
  },
}));
