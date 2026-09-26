import { create } from "zustand";

export const useAppStore = create((set) => ({
  isOn: false,
  toggle: () => set((state) => ({ isOn: !state.isOn })),
}));
