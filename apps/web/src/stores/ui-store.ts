import { create } from "zustand";

interface UiStore {
  commandPaletteOpen: boolean;
  operatorOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setOperatorOpen: (open: boolean) => void;
  toggleOperator: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  commandPaletteOpen: false,
  operatorOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setOperatorOpen: (open) => set({ operatorOpen: open }),
  toggleOperator: () => set((s) => ({ operatorOpen: !s.operatorOpen })),
}));
