import assert from "node:assert/strict";
import test from "node:test";
import { SETTINGS_CONFIG, createInitialWeaponSettings, createInitialAudioSettings, AUDIO_NUMERIC_KEYS } from "./userSettingConfig.js";
import { GUNSHOT_VOLUME } from "../shooting/shootingConfig.js";

test("offsets convert positive and negative UI centimeters to runtime meters and back", () => {
  for (const key of ["xOffset", "yOffset", "zOffset"]) {
    const config = SETTINGS_CONFIG.weapon[key];
    assert.equal(config.toRuntime(2.5), 0.025);
    assert.equal(config.fromRuntime(-0.025), -2.5);
    for (const value of [-10, -2.5, 0, 0.5, 10]) {
      assert.ok(Math.abs(config.fromRuntime(config.toRuntime(value)) - value) < 1e-9);
    }
  }
});

test("editing current settings cannot mutate the initial or reset state", () => {
  const expected = createInitialWeaponSettings();
  const edited = createInitialWeaponSettings();
  edited.pitch += 10;
  edited.xOffset -= 2.5;
  const reset = createInitialWeaponSettings();
  assert.notStrictEqual(reset, edited);
  assert.deepEqual(reset, expected);
  reset.yaw += 5;
  assert.deepEqual(createInitialWeaponSettings(), expected);
});

test("RESET takes a fresh initialValue from the definition without a separate reset constant", () => {
  const pitchConfig = SETTINGS_CONFIG.weapon.pitch;
  const original = pitchConfig.initialValue;
  try {
    pitchConfig.initialValue = -12.5;
    assert.equal(createInitialWeaponSettings().pitch, -12.5);
  } finally {
    pitchConfig.initialValue = original;
  }
});

test("Audio volumes share percent bounds and steps and convert independently to runtime gain", () => {
  assert.deepEqual(createInitialAudioSettings(), {
    bgmEnabled: true, bgmVolume: 70, gunshotVolume: GUNSHOT_VOLUME * 100,
  });
  for (const key of AUDIO_NUMERIC_KEYS) {
    const config = SETTINGS_CONFIG.audio[key];
    assert.deepEqual([config.min, config.max, config.step, config.unit], [0, 100, 10, "%"]);
    assert.equal(config.toRuntime(0), 0);
    assert.equal(config.toRuntime(100), 1);
    assert.equal(config.toRuntime(70), 0.7);
    assert.equal(config.fromRuntime(0.3), 30);
  }
});

test("Audio Initial values remain independent of edits and follow the settings definition", () => {
  const config = SETTINGS_CONFIG.audio.bgmVolume;
  const original = config.initialValue;
  try {
    config.initialValue = 40;
    const edited = createInitialAudioSettings();
    edited.bgmEnabled = false;
    edited.bgmVolume = 0;
    assert.deepEqual(createInitialAudioSettings(), {
      bgmEnabled: true, bgmVolume: 40, gunshotVolume: GUNSHOT_VOLUME * 100,
    });
  } finally {
    config.initialValue = original;
  }
});
