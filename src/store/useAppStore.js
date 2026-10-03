import { create } from "zustand";

export const useAppStore = create((set) => ({
  isOn: false,
  toggle: () => set((state) => ({ isOn: !state.isOn })),
  menuOpen: false,
  settingsPage: "home",
  setMenuOpen: (menuOpen) => set({ menuOpen, settingsPage: "home" }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen, settingsPage: "home" })),
  setSettingsPage: (settingsPage) => set({ settingsPage }),
}));
