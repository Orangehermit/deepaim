import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SETTINGS_CONFIG, createInitialWeaponSettings, WEAPON_NUMERIC_KEYS,
  createInitialAudioSettings, AUDIO_NUMERIC_KEYS, AUDIO_SETTING_KEYS,
} from "../userSetting/userSettingConfig.js";
import { createUserSettingsPersistOptions } from "../userSetting/userSettingPersistence.js";
import { snapNumericValue } from "../ui/numericValue.js";

const isEditingWeapon = (state) =>
  state.menuOpen && state.settingsPage === "weapon" && state.weaponSettingsPreview != null;
const isEditingAudio = (state) =>
  state.menuOpen && state.settingsPage === "audio" && state.audioSettingsPreview != null;

export const selectRuntimeWeaponSettings = (state) =>
  isEditingWeapon(state) ? state.weaponSettingsPreview : state.weaponSettings;

export const selectWeaponUnsavedChanges = (state) =>
  isEditingWeapon(state) && WEAPON_NUMERIC_KEYS.some(
    (key) => state.weaponSettingsPreview[key] !== state.weaponSettings[key],
  );

export const selectRuntimeAudioSettings = (state) =>
  isEditingAudio(state) ? state.audioSettingsPreview : state.audioSettings;

export const selectAudioUnsavedChanges = (state) =>
  isEditingAudio(state) && AUDIO_SETTING_KEYS.some(
    (key) => state.audioSettingsPreview[key] !== state.audioSettings[key],
  );

// Optional storage injection lets tests recreate a browser session independently.
export const createAppStore = (storage) => create(persist((set, get) => ({
  isOn: false,
  toggle: () => set((state) => ({ isOn: !state.isOn })),
  menuOpen: false,
  settingsPage: "home",
  // Only SAVE-committed Applied values are persisted in browser storage.
  weaponSettings: createInitialWeaponSettings(),
  audioSettings: createInitialAudioSettings(),
  // The temporary Draft also supplies runtime Preview while editing WEAPON.
  weaponSettingsPreview: null,
  audioSettingsPreview: null,
  setMenuOpen: (menuOpen) => set({
    menuOpen, settingsPage: "home", weaponSettingsPreview: null, audioSettingsPreview: null,
  }),
  toggleMenu: () => set((state) => ({
    menuOpen: !state.menuOpen, settingsPage: "home", weaponSettingsPreview: null, audioSettingsPreview: null,
  })),
  setSettingsPage: (settingsPage) => set((state) => {
    if (!state.menuOpen || state.settingsPage === settingsPage) return state;
    return {
      settingsPage,
      weaponSettingsPreview: settingsPage === "weapon" ? { ...state.weaponSettings } : null,
      audioSettingsPreview: settingsPage === "audio" ? { ...state.audioSettings } : null,
    };
  }),
  updateWeaponDraft: (key, value) => set((state) => {
    if (!isEditingWeapon(state) || !WEAPON_NUMERIC_KEYS.includes(key) || !Number.isFinite(value)) return state;
    return { weaponSettingsPreview: { ...state.weaponSettingsPreview, [key]: value } };
  }),
  resetWeaponDraft: () => set((state) => isEditingWeapon(state)
    ? { weaponSettingsPreview: createInitialWeaponSettings() }
    : state),
  saveWeaponSettings: () => {
    const state = get();
    if (!isEditingWeapon(state)) return false;
    // Commit all six values synchronously in one state update; keep editing open.
    set({ weaponSettings: { ...state.weaponSettingsPreview } });
    return true;
  },
  updateAudioDraft: (key, value) => set((state) => {
    if (!isEditingAudio(state)) return state;
    if (key === "bgmEnabled") {
      if (typeof value !== "boolean") return state;
    } else {
      if (!AUDIO_NUMERIC_KEYS.includes(key) || !Number.isFinite(value)) return state;
      const { min, max, step } = SETTINGS_CONFIG.audio[key];
      value = snapNumericValue(value, min, max, step);
    }
    return { audioSettingsPreview: { ...state.audioSettingsPreview, [key]: value } };
  }),
  resetAudioDraft: () => set((state) => isEditingAudio(state)
    ? { audioSettingsPreview: createInitialAudioSettings() }
    : state),
  saveAudioSettings: () => {
    const state = get();
    if (!isEditingAudio(state)) return false;
    set({ audioSettings: { ...state.audioSettingsPreview } });
    return true;
  },
}), createUserSettingsPersistOptions(storage)));

export const useAppStore = createAppStore();
