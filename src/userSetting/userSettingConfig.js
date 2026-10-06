import {
  PITCH, YAW, ROLL,
  WEAPON_POSITION_OFFSET_X_M, WEAPON_POSITION_OFFSET_Y_M, WEAPON_POSITION_OFFSET_Z_M,
  DUAL_WIELD_ENABLED, GUNSHOT_VOLUME,
} from "../shooting/shootingConfig.js";

const metersToCm = (meters) => meters * 100;
const cmToMeters = (cm) => cm / 100;
const percentToGain = (percent) => percent / 100;
const gainToPercent = (gain) => gain * 100;

// Applied and Draft use UI units; calibration converts offsets through toRuntime.
export const SETTINGS_CONFIG = {
  weapon: {
    pitch: { initialValue: PITCH, min: -90, max: 90, step: 0.5, unit: "°" },
    yaw: { initialValue: YAW, min: -90, max: 90, step: 0.5, unit: "°" },
    roll: { initialValue: ROLL, min: -90, max: 90, step: 0.5, unit: "°" },
    xOffset: {
      initialValue: metersToCm(WEAPON_POSITION_OFFSET_X_M),
      min: -10, max: 10, step: 0.5, unit: "cm",
      toRuntime: cmToMeters, fromRuntime: metersToCm,
    },
    yOffset: {
      initialValue: metersToCm(WEAPON_POSITION_OFFSET_Y_M),
      min: -10, max: 10, step: 0.5, unit: "cm",
      toRuntime: cmToMeters, fromRuntime: metersToCm,
    },
    zOffset: {
      initialValue: metersToCm(WEAPON_POSITION_OFFSET_Z_M),
      min: -10, max: 10, step: 0.5, unit: "cm",
      toRuntime: cmToMeters, fromRuntime: metersToCm,
    },
    dualWield: { initialValue: DUAL_WIELD_ENABLED },
  },
  audio: {
    bgmEnabled: { initialValue: true },
    bgmVolume: {
      initialValue: 70, min: 0, max: 100, step: 10, unit: "%",
      toRuntime: percentToGain, fromRuntime: gainToPercent,
    },
    gunshotVolume: {
      initialValue: gainToPercent(GUNSHOT_VOLUME), min: 0, max: 100, step: 10, unit: "%",
      toRuntime: percentToGain, fromRuntime: gainToPercent,
    },
  },
};

export const WEAPON_NUMERIC_KEYS = ["pitch", "yaw", "roll", "xOffset", "yOffset", "zOffset"];
export const AUDIO_NUMERIC_KEYS = ["bgmVolume", "gunshotVolume"];
export const AUDIO_SETTING_KEYS = ["bgmEnabled", ...AUDIO_NUMERIC_KEYS];

// Fresh Applied/Draft state and RESET values; offsets remain in cm.
export function createInitialWeaponSettings() {
  const weapon = SETTINGS_CONFIG.weapon;
  return {
    pitch: weapon.pitch.initialValue,
    yaw: weapon.yaw.initialValue,
    roll: weapon.roll.initialValue,
    xOffset: weapon.xOffset.initialValue,
    yOffset: weapon.yOffset.initialValue,
    zOffset: weapon.zOffset.initialValue,
  };
}

// Persist and edit percentages; Audio runtime converts them to independent gains.
export function createInitialAudioSettings() {
  return Object.fromEntries(AUDIO_SETTING_KEYS.map((key) => [key, SETTINGS_CONFIG.audio[key].initialValue]));
}
