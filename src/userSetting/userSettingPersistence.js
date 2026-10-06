import { createJSONStorage } from "zustand/middleware";
import {
  SETTINGS_CONFIG, WEAPON_NUMERIC_KEYS, AUDIO_NUMERIC_KEYS,
  createInitialWeaponSettings, createInitialAudioSettings,
} from "./userSettingConfig.js";
import { snapNumericValue } from "../ui/numericValue.js";

export const USER_SETTINGS_STORAGE_KEY = "deepaim-user-settings";
export const USER_SETTINGS_VERSION = 1;

// Add future Applied categories here; runtime and Draft state never belong here.
const partializeUserSettings = (state) => ({
  weaponSettings: state.weaponSettings,
  audioSettings: state.audioSettings,
});

function restoreWeaponSettings(saved) {
  const settings = createInitialWeaponSettings();
  if (saved == null || typeof saved !== "object" || Array.isArray(saved)) return settings;

  for (const key of WEAPON_NUMERIC_KEYS) {
    const value = saved[key];
    if (!Number.isFinite(value)) continue;
    const { min, max, step } = SETTINGS_CONFIG.weapon[key];
    settings[key] = snapNumericValue(value, min, max, step);
  }
  return settings;
}

function restoreAudioSettings(saved) {
  const settings = createInitialAudioSettings();
  if (saved == null || typeof saved !== "object" || Array.isArray(saved)) return settings;

  if (typeof saved.bgmEnabled === "boolean") settings.bgmEnabled = saved.bgmEnabled;
  for (const key of AUDIO_NUMERIC_KEYS) {
    const value = saved[key];
    if (!Number.isFinite(value)) continue;
    const { min, max, step } = SETTINGS_CONFIG.audio[key];
    settings[key] = snapNumericValue(value, min, max, step);
  }
  return settings;
}

function getBrowserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function createUserSettingsPersistOptions(storage = getBrowserStorage()) {
  const jsonStorage = storage == null ? undefined : createJSONStorage(() => storage);
  let lastAppliedSettings;

  return {
    name: USER_SETTINGS_STORAGE_KEY,
    version: USER_SETTINGS_VERSION,
    partialize: partializeUserSettings,
    storage: {
      getItem(name) {
        try {
          return jsonStorage?.getItem(name) ?? null;
        } catch {
          // Unreadable or malformed storage falls back to current Initial values.
          return null;
        }
      },
      setItem(name, value) {
        const next = value.state;
        // Persist runs after every set. Applied objects are replaced only on
        // commit, so Draft edits, RESET, BACK, and other UI actions skip writes.
        if (lastAppliedSettings != null &&
          Object.keys(next).length === Object.keys(lastAppliedSettings).length &&
          Object.keys(next).every((key) => next[key] === lastAppliedSettings[key])) return;
        lastAppliedSettings = next;
        try {
          jsonStorage?.setItem(name, value);
        } catch (error) {
          // Keep runtime settings and menu input usable if browser storage fails.
          console.warn("Deep Aim: unable to persist user settings.", error);
        }
      },
      removeItem(name) {
        try {
          jsonStorage?.removeItem(name);
        } catch (error) {
          console.warn("Deep Aim: unable to remove persisted user settings.", error);
        }
      },
    },
    merge(persistedState, currentState) {
      const merged = {
        ...currentState,
        weaponSettings: restoreWeaponSettings(persistedState?.weaponSettings),
        // Version 1 Weapon-only saves acquire Audio Initial values without
        // rewriting storage or replacing any existing saved Weapon values.
        audioSettings: restoreAudioSettings(persistedState?.audioSettings),
      };
      // Hydration supplies the baseline without rewriting browser storage.
      lastAppliedSettings = partializeUserSettings(merged);
      return merged;
    },
  };
}
