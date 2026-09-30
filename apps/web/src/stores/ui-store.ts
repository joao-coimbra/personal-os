import { create } from "zustand";

export interface OperatorDraft {
  bullets?: string[];
  heading: string;
  paragraphs: string[];
}

interface UiStore {
  clearOperatorDraft: () => void;
  closeOperator: () => void;
  commandPaletteOpen: boolean;
  operatorDraft: OperatorDraft | null;
  operatorOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setOperatorDraft: (draft: OperatorDraft | null) => void;
  setOperatorOpen: (open: boolean) => void;
  toggleOperator: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  clearOperatorDraft: () => set({ operatorDraft: null }),
  closeOperator: () => set({ operatorOpen: false }),
  commandPaletteOpen: false,
  operatorDraft: null,
  operatorOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setOperatorDraft: (draft) => set({ operatorDraft: draft }),
  setOperatorOpen: (open) => set({ operatorOpen: open }),
  toggleOperator: () => set((s) => ({ operatorOpen: !s.operatorOpen })),
}));
