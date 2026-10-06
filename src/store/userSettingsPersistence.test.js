import assert from "node:assert/strict";
import test from "node:test";
import { Group, MathUtils } from "three";
import {
  createAppStore, selectRuntimeWeaponSettings, selectWeaponUnsavedChanges,
  selectRuntimeAudioSettings, selectAudioUnsavedChanges,
} from "./useAppStore.js";
import { SETTINGS_CONFIG, createInitialWeaponSettings, createInitialAudioSettings } from "../userSetting/userSettingConfig.js";
import { USER_SETTINGS_STORAGE_KEY, USER_SETTINGS_VERSION } from "../userSetting/userSettingPersistence.js";
import { applyWeaponCalibration } from "../xr/weaponCalibration.js";

function memoryStorage(initialValue) {
  const values = new Map(initialValue == null ? [] : [[USER_SETTINGS_STORAGE_KEY, initialValue]]);
  return {
    writes: [],
    getItem: (name) => values.get(name) ?? null,
    setItem(name, value) {
      this.writes.push({ name, value });
      values.set(name, value);
    },
    removeItem: (name) => values.delete(name),
  };
}

const persisted = (weaponSettings, otherState = {}) => JSON.stringify({
  state: { weaponSettings, ...otherState }, version: USER_SETTINGS_VERSION,
});
const openWeapon = (store) => {
  store.getState().setMenuOpen(true);
  store.getState().setSettingsPage("weapon");
};
const openAudio = (store) => {
  store.getState().setMenuOpen(true);
  store.getState().setSettingsPage("audio");
};
const savedValues = { pitch: 2, yaw: -3, roll: 4, xOffset: 1.5, yOffset: -2, zOffset: 2.5 };

test("first visit uses Initial and writes only Applied categories on Weapon SAVE", () => {
  const storage = memoryStorage();
  const store = createAppStore(storage);
  assert.equal(store.persist.hasHydrated(), true);
  assert.deepEqual(store.getState().weaponSettings, createInitialWeaponSettings());
  assert.equal(store.getState().saveWeaponSettings(), false);
  store.getState().toggle();
  openWeapon(store);
  for (const [key, value] of Object.entries(savedValues)) store.getState().updateWeaponDraft(key, value);
  assert.equal(selectWeaponUnsavedChanges(store.getState()), true);
  assert.equal(storage.getItem(USER_SETTINGS_STORAGE_KEY), null);
  assert.equal(storage.writes.length, 0, "menu and Draft changes must not write Initial to storage");

  assert.equal(store.getState().saveWeaponSettings(), true);
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.writes[0].name, "deepaim-user-settings");
  assert.deepEqual(JSON.parse(storage.writes[0].value), {
    state: { weaponSettings: savedValues, audioSettings: createInitialAudioSettings() }, version: 1,
  });
  assert.equal(selectWeaponUnsavedChanges(store.getState()), false);
});

test("a fresh store restores saved UI units before gun calibration without persisting runtime state", () => {
  const storage = memoryStorage(persisted(savedValues, {
    isOn: true, menuOpen: true, settingsPage: "weapon",
    weaponSettingsPreview: { ...savedValues, pitch: 25 },
    toggle: "obsolete action", hover: true, pointer: {}, saved: true, unsavedChanges: true,
  }));
  const store = createAppStore(storage);
  const state = store.getState();
  assert.deepEqual(state.weaponSettings, savedValues);
  assert.equal(state.isOn, false);
  assert.equal(state.menuOpen, false);
  assert.equal(state.settingsPage, "home");
  assert.equal(state.weaponSettingsPreview, null);
  assert.equal(typeof state.toggle, "function");
  for (const key of ["hover", "pointer", "saved", "unsavedChanges"]) assert.equal(key in state, false);
  const calibration = new Group();
  applyWeaponCalibration(calibration, selectRuntimeWeaponSettings(state));
  assert.deepEqual(calibration.position.toArray(), [0.015, -0.02, 0.025]);
  assert.deepEqual(calibration.rotation.toArray(), [
    MathUtils.degToRad(2), MathUtils.degToRad(-3), MathUtils.degToRad(4), "XYZ",
  ]);
  openWeapon(store);
  assert.deepEqual(store.getState().weaponSettingsPreview, savedValues);
  assert.equal(storage.writes.length, 0, "hydration and opening WEAPON do not rewrite saved data");
});

test("unsaved edits, RESET, BACK, and menu exits keep storage unchanged across reloads", () => {
  const storage = memoryStorage(persisted(savedValues));
  const original = storage.getItem(USER_SETTINGS_STORAGE_KEY);
  const store = createAppStore(storage);
  const exits = [
    () => store.getState().setSettingsPage("home"),
    () => store.getState().setSettingsPage("audio"),
    () => store.getState().toggleMenu(),
    () => store.getState().setMenuOpen(false),
  ];
  for (const exit of exits) {
    openWeapon(store);
    store.getState().updateWeaponDraft("pitch", 12);
    store.getState().resetWeaponDraft();
    assert.deepEqual(selectRuntimeWeaponSettings(store.getState()), createInitialWeaponSettings());
    exit();
    assert.equal(storage.getItem(USER_SETTINGS_STORAGE_KEY), original);
    assert.deepEqual(createAppStore(storage).getState().weaponSettings, savedValues);
  }
  assert.equal(storage.writes.length, 0);
});

test("RESET then SAVE persists Initial, and later SAVE replaces the committed snapshot", () => {
  const storage = memoryStorage(persisted(savedValues));
  const store = createAppStore(storage);
  openWeapon(store);
  store.getState().resetWeaponDraft();
  assert.equal(storage.writes.length, 0);
  store.getState().saveWeaponSettings();
  assert.equal(storage.writes.length, 1);
  assert.deepEqual(createAppStore(storage).getState().weaponSettings, createInitialWeaponSettings());
  store.getState().updateWeaponDraft("pitch", 5);
  assert.equal(storage.writes.length, 1);
  store.getState().saveWeaponSettings();
  assert.equal(storage.writes.length, 2);
  assert.equal(createAppStore(storage).getState().weaponSettings.pitch, 5);
});

test("older partial nested settings retain the current initialValue for missing keys", () => {
  const config = SETTINGS_CONFIG.weapon.zOffset;
  const original = config.initialValue;
  try {
    config.initialValue = -1.5;
    const storage = memoryStorage(persisted({ pitch: 2, yaw: -3, roll: 4 }));
    const store = createAppStore(storage);
    assert.deepEqual(store.getState().weaponSettings, {
      ...createInitialWeaponSettings(), pitch: 2, yaw: -3, roll: 4,
    });
    assert.equal(store.getState().weaponSettings.zOffset, -1.5);
    assert.equal(storage.writes.length, 0);
  } finally {
    config.initialValue = original;
  }
});

test("hydration drops unknown keys, rejects non-numbers, clamps bounds, and snaps to current steps", () => {
  const storage = memoryStorage(persisted({
    pitch: 999, yaw: -999, roll: 1.26, xOffset: -100,
    yOffset: null, zOffset: "2.5", dualWield: true, unknownSetting: 42,
  }));
  const store = createAppStore(storage);
  assert.deepEqual(store.getState().weaponSettings, {
    ...createInitialWeaponSettings(), pitch: 90, yaw: -90, roll: 1.5, xOffset: -10,
  });
  assert.equal(storage.writes.length, 0, "validation must not rewrite storage before SAVE");

  const config = SETTINGS_CONFIG.weapon.pitch;
  const originalMax = config.max;
  try {
    config.max = 30;
    assert.equal(createAppStore(storage).getState().weaponSettings.pitch, 30);
  } finally {
    config.max = originalMax;
  }
});

test("missing, malformed, or unusable persisted data safely starts from Initial", () => {
  for (const value of [
    "not JSON", "null", "{}", "[]", persisted(null), persisted([]), persisted("obsolete"),
    '{"state":{"weaponSettings":{"pitch":1e999}},"version":1}',
  ]) {
    const storage = memoryStorage(value);
    const store = createAppStore(storage);
    assert.equal(store.persist.hasHydrated(), true);
    assert.deepEqual(store.getState().weaponSettings, createInitialWeaponSettings());
    assert.equal(storage.writes.length, 0);
    openWeapon(store);
    store.getState().updateWeaponDraft("pitch", 2);
    store.getState().saveWeaponSettings();
    assert.equal(createAppStore(storage).getState().weaponSettings.pitch, 2);
  }
});

test("unavailable storage does not break SAVE, Preview, or immediate further editing", (t) => {
  const warning = t.mock.method(console, "warn", () => {});
  const storage = {
    getItem() { throw new Error("Storage denied"); },
    setItem() { throw new Error("Storage full"); },
    removeItem() { throw new Error("Storage denied"); },
  };
  const store = createAppStore(storage);
  openWeapon(store);
  store.getState().updateWeaponDraft("pitch", 2);
  assert.equal(store.getState().saveWeaponSettings(), true);
  assert.equal(store.getState().weaponSettings.pitch, 2);
  assert.equal(warning.mock.calls.length, 1);
  store.getState().updateWeaponDraft("pitch", 2.5);
  assert.equal(selectRuntimeWeaponSettings(store.getState()).pitch, 2.5);
  assert.equal(store.getState().weaponSettings.pitch, 2);
  assert.equal(warning.mock.calls.length, 1, "Draft edits do not retry storage writes");
});

test("Audio SAVE persists three Applied UI values with existing Weapon and restores them on reload", () => {
  const storage = memoryStorage(persisted(savedValues));
  const store = createAppStore(storage);
  assert.deepEqual(store.getState().audioSettings, createInitialAudioSettings());
  assert.deepEqual(store.getState().weaponSettings, savedValues, "adding Audio retains version 1 Weapon saves");
  assert.equal(store.getState().audioSettingsPreview, null);
  assert.equal(store.getState().saveAudioSettings(), false);
  openAudio(store);
  const audio = { bgmEnabled: false, bgmVolume: 40, gunshotVolume: 20 };
  for (const [key, value] of Object.entries(audio)) store.getState().updateAudioDraft(key, value);
  assert.equal(selectAudioUnsavedChanges(store.getState()), true);
  assert.equal(storage.writes.length, 0);
  assert.equal(store.getState().saveAudioSettings(), true);
  assert.equal(storage.writes.length, 1);
  assert.deepEqual(JSON.parse(storage.writes[0].value), {
    state: { weaponSettings: savedValues, audioSettings: audio }, version: 1,
  });
  const reloaded = createAppStore(storage);
  assert.deepEqual(reloaded.getState().audioSettings, audio);
  assert.deepEqual(reloaded.getState().weaponSettings, savedValues);
  assert.deepEqual(selectRuntimeAudioSettings(reloaded.getState()), audio);
  assert.equal(reloaded.getState().audioSettingsPreview, null);
  openAudio(reloaded);
  assert.deepEqual(reloaded.getState().audioSettingsPreview, audio);
  assert.equal(storage.writes.length, 1, "reload and entering AUDIO never rewrite saved data");
});

test("unsaved Audio RESET, BACK, category changes and menu exits neither persist nor leak Draft", () => {
  const audio = { bgmEnabled: false, bgmVolume: 20, gunshotVolume: 40 };
  const storage = memoryStorage(persisted(savedValues, { audioSettings: audio }));
  const original = storage.getItem(USER_SETTINGS_STORAGE_KEY);
  const store = createAppStore(storage);
  const exits = [
    () => store.getState().setSettingsPage("home"),
    () => store.getState().setSettingsPage("weapon"),
    () => store.getState().toggleMenu(),
    () => store.getState().setMenuOpen(false),
  ];
  for (const exit of exits) {
    openAudio(store);
    store.getState().updateAudioDraft("bgmEnabled", true);
    store.getState().updateAudioDraft("bgmVolume", 90);
    store.getState().resetAudioDraft();
    assert.deepEqual(selectRuntimeAudioSettings(store.getState()), createInitialAudioSettings());
    exit();
    assert.deepEqual(selectRuntimeAudioSettings(store.getState()), audio);
    assert.equal(store.getState().audioSettingsPreview, null);
    assert.equal(storage.getItem(USER_SETTINGS_STORAGE_KEY), original);
    assert.deepEqual(createAppStore(storage).getState().audioSettings, audio);
    assert.deepEqual(store.getState().weaponSettings, savedValues);
  }
  assert.equal(storage.writes.length, 0);
});

test("Audio RESET plus SAVE persists Initial and later Weapon SAVE preserves Applied Audio", () => {
  const storage = memoryStorage(persisted(savedValues, {
    audioSettings: { bgmEnabled: false, bgmVolume: 20, gunshotVolume: 10 },
  }));
  const store = createAppStore(storage);
  openAudio(store);
  store.getState().resetAudioDraft();
  assert.equal(storage.writes.length, 0);
  store.getState().saveAudioSettings();
  assert.equal(storage.writes.length, 1);
  assert.deepEqual(createAppStore(storage).getState().audioSettings, createInitialAudioSettings());
  store.getState().updateAudioDraft("bgmVolume", 40);
  store.getState().saveAudioSettings();
  const audio = store.getState().audioSettings;
  openWeapon(store);
  store.getState().updateWeaponDraft("pitch", 5);
  store.getState().saveWeaponSettings();
  assert.equal(storage.writes.length, 3);
  const reloaded = createAppStore(storage);
  assert.deepEqual(reloaded.getState().audioSettings, audio);
  assert.equal(reloaded.getState().weaponSettings.pitch, 5);
  assert.equal(reloaded.getState().weaponSettings.yaw, savedValues.yaw);
});

test("Audio hydration supplements partial legacy values, validates types, and filters runtime objects", () => {
  const initial = createInitialAudioSettings();
  const cases = [
    [{ bgmEnabled: false }, { ...initial, bgmEnabled: false }],
    [{ bgmEnabled: "false", bgmVolume: null, gunshotVolume: "30" }, initial],
    [{ bgmEnabled: false, bgmVolume: 999, gunshotVolume: -99 },
      { bgmEnabled: false, bgmVolume: 100, gunshotVolume: 0 }],
    [{ bgmVolume: 36, gunshotVolume: 64 }, { ...initial, bgmVolume: 40, gunshotVolume: 60 }],
    [null, initial], [[], initial], ["obsolete", initial],
  ];
  for (const [savedAudio, expected] of cases) {
    const storage = memoryStorage(persisted(savedValues, {
      audioSettings: savedAudio != null && typeof savedAudio === "object" && !Array.isArray(savedAudio)
        ? { ...savedAudio, currentTime: 120, trackIndex: 2, gainNode: {}, audioContext: {} }
        : savedAudio,
      audioSettingsPreview: { bgmEnabled: true, bgmVolume: 90, gunshotVolume: 0 },
      bgmPlayer: {}, currentTrack: 4,
    }));
    const store = createAppStore(storage);
    assert.deepEqual(store.getState().audioSettings, expected);
    assert.deepEqual(store.getState().weaponSettings, savedValues);
    assert.equal(store.getState().audioSettingsPreview, null);
    assert.equal("bgmPlayer" in store.getState(), false);
    assert.equal("currentTrack" in store.getState(), false);
    assert.equal(storage.writes.length, 0);
  }
  const storage = memoryStorage('{"state":{"audioSettings":{"bgmVolume":1e999}},"version":1}');
  assert.deepEqual(createAppStore(storage).getState().audioSettings, initial);
});
