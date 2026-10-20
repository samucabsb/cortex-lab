import { create } from 'zustand';
import { ReviewSnapshot } from '@/types';

export interface ByokSettings {
  geminiApiKey: string;
  groqApiKey: string;
  preferredProvider?: 'gemini' | 'groq' | 'backend';
}

interface LabStoreState {
  // Active Review State
  reviewId: string | null;
  snapshot: ReviewSnapshot | null;
  wizardStep: 1 | 2 | 3 | 4;

  // BYOK Settings (Bring Your Own Key)
  byok: ByokSettings;
  byokModalOpen: boolean;

  // Actions
  setReviewId: (id: string | null) => void;
  setSnapshot: (snapshot: ReviewSnapshot | null) => void;
  setWizardStep: (step: 1 | 2 | 3 | 4) => void;
  setByokModalOpen: (open: boolean) => void;
  saveByokSettings: (settings: Partial<ByokSettings>) => void;
  resetAll: () => void;
}

const getInitialByokSettings = (): ByokSettings => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('cortex_byok_keys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to empty
      }
    }
  }
  return {
    geminiApiKey: '',
    groqApiKey: '',
  };
};

export const useLabStore = create<LabStoreState>((set) => ({
  reviewId: null,
  snapshot: null,
  wizardStep: 1,

  byok: getInitialByokSettings(),
  byokModalOpen: false,

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

  resetAll: () => {
    set({
      reviewId: null,
      snapshot: null,
      wizardStep: 1,
    });
  },
}));
