import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  useAppStore, selectRuntimeWeaponSettings, selectWeaponUnsavedChanges,
  selectRuntimeAudioSettings, selectAudioUnsavedChanges,
} from "./useAppStore.js";
import { createInitialWeaponSettings, WEAPON_NUMERIC_KEYS, createInitialAudioSettings } from "../userSetting/userSettingConfig.js";

beforeEach(() => {
  useAppStore.setState({
    isOn: false, menuOpen: false, settingsPage: "home",
    weaponSettings: createInitialWeaponSettings(), weaponSettingsPreview: null,
    audioSettings: createInitialAudioSettings(), audioSettingsPreview: null,
  });
});

const state = () => useAppStore.getState();
const openWeapon = () => {
  state().setMenuOpen(true);
  state().setSettingsPage("weapon");
};
const openAudio = () => {
  state().setMenuOpen(true);
  state().setSettingsPage("audio");
};

test("closing a subpage and reopening always starts at settings home", () => {
  useAppStore.getState().setMenuOpen(false);
  useAppStore.getState().toggleMenu();
  assert.equal(useAppStore.getState().menuOpen, true);
  useAppStore.getState().setSettingsPage("weapon");
  useAppStore.getState().toggleMenu();
  assert.equal(useAppStore.getState().menuOpen, false);
  useAppStore.getState().toggleMenu();
  assert.equal(useAppStore.getState().settingsPage, "home");
  useAppStore.getState().setSettingsPage("weapon");
  useAppStore.getState().setMenuOpen(false);
  assert.equal(useAppStore.getState().settingsPage, "home");
});

test("settings navigation keeps the existing application toggle independent", () => {
  useAppStore.setState({ isOn: false });
  useAppStore.getState().toggle();
  useAppStore.getState().setMenuOpen(true);
  useAppStore.getState().setSettingsPage("weapon");
  assert.equal(useAppStore.getState().isOn, true);
  useAppStore.getState().setMenuOpen(false);
  assert.equal(useAppStore.getState().isOn, true);
});

test("entering WEAPON copies Applied; edits preview without mutating Applied or Initial", () => {
  const initial = createInitialWeaponSettings();
  state().setMenuOpen(true);
  assert.equal(state().weaponSettingsPreview, null);
  state().setSettingsPage("weapon");
  assert.deepEqual(state().weaponSettingsPreview, initial);
  assert.notEqual(state().weaponSettingsPreview, state().weaponSettings);
  assert.equal(selectWeaponUnsavedChanges(state()), false);
  state().updateWeaponDraft("pitch", 2);
  state().updateWeaponDraft("xOffset", 1.5);
  assert.deepEqual(state().weaponSettings, initial);
  assert.deepEqual(createInitialWeaponSettings(), initial);
  assert.equal(selectRuntimeWeaponSettings(state()).pitch, 2);
  assert.equal(selectRuntimeWeaponSettings(state()).xOffset, 1.5);
  assert.equal(selectWeaponUnsavedChanges(state()), true);
  state().setSettingsPage("weapon");
  assert.equal(state().weaponSettingsPreview.pitch, 2, "same-page selection retains current draft");
  state().updateWeaponDraft("pitch", initial.pitch);
  state().updateWeaponDraft("xOffset", initial.xOffset);
  assert.equal(selectWeaponUnsavedChanges(state()), false, "dirty is value comparison, not edit history");
});

test("SAVE commits all six values in one synchronous update and allows immediate further editing", () => {
  openWeapon();
  const values = [2, -3, 4, 1.5, -2, 2.5];
  WEAPON_NUMERIC_KEYS.forEach((key, index) => state().updateWeaponDraft(key, values[index]));
  const draft = state().weaponSettingsPreview;
  const updates = [];
  const unsubscribe = useAppStore.subscribe((next) => updates.push(next));
  assert.equal(state().saveWeaponSettings(), true);
  unsubscribe();
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].weaponSettings, draft);
  assert.notEqual(state().weaponSettings, draft);
  assert.equal(state().settingsPage, "weapon");
  assert.equal(selectWeaponUnsavedChanges(state()), false);
  state().updateWeaponDraft("pitch", 5);
  assert.equal(state().weaponSettings.pitch, 2);
  assert.equal(selectRuntimeWeaponSettings(state()).pitch, 5);
  assert.equal(selectWeaponUnsavedChanges(state()), true);
  state().setSettingsPage("home");
  assert.equal(state().weaponSettingsPreview, null);
  assert.equal(selectRuntimeWeaponSettings(state()).pitch, 2);
  state().setSettingsPage("weapon");
  assert.deepEqual(state().weaponSettingsPreview, draft);
});

test("RESET previews Initial only; BACK restores last Applied, RESET plus SAVE commits Initial", () => {
  openWeapon();
  state().updateWeaponDraft("pitch", 8);
  state().updateWeaponDraft("zOffset", -3);
  state().saveWeaponSettings();
  const applied = state().weaponSettings;
  state().resetWeaponDraft();
  assert.deepEqual(selectRuntimeWeaponSettings(state()), createInitialWeaponSettings());
  assert.equal(state().weaponSettings, applied);
  assert.equal(selectWeaponUnsavedChanges(state()), true);
  state().setSettingsPage("home");
  assert.equal(selectRuntimeWeaponSettings(state()), applied);
  state().setSettingsPage("weapon");
  assert.deepEqual(state().weaponSettingsPreview, applied);
  state().resetWeaponDraft();
  state().saveWeaponSettings();
  state().setSettingsPage("home");
  assert.deepEqual(selectRuntimeWeaponSettings(state()), createInitialWeaponSettings());
});

test("BACK, category changes, B/Y close, and XR session close discard draft and reopen from Applied", () => {
  const exits = [
    () => state().setSettingsPage("home"),
    () => state().setSettingsPage("audio"),
    () => state().toggleMenu(),
    () => state().setMenuOpen(false),
  ];
  for (const exit of exits) {
    openWeapon();
    state().updateWeaponDraft("yaw", 6);
    state().saveWeaponSettings();
    state().updateWeaponDraft("yaw", 12);
    exit();
    assert.equal(state().weaponSettingsPreview, null);
    assert.equal(selectRuntimeWeaponSettings(state()).yaw, 6);
    assert.equal(selectWeaponUnsavedChanges(state()), false);
    openWeapon();
    assert.equal(state().weaponSettingsPreview.yaw, 6);
  }
});

test("draft actions outside WEAPON are inert, and invalid keys/values never enter calibration", () => {
  const initial = state().weaponSettings;
  state().setSettingsPage("weapon");
  state().updateWeaponDraft("pitch", 10);
  state().resetWeaponDraft();
  assert.equal(state().saveWeaponSettings(), false);
  assert.equal(state().weaponSettingsPreview, null);
  assert.equal(state().weaponSettings, initial);
  openWeapon();
  state().updateWeaponDraft("dualWield", 1);
  state().updateWeaponDraft("pitch", NaN);
  state().updateWeaponDraft("yaw", Infinity);
  assert.deepEqual(state().weaponSettingsPreview, createInitialWeaponSettings());
});

test("entering AUDIO copies Applied and previews edits; BGM OFF retains its volume", () => {
  const initial = createInitialAudioSettings();
  openAudio();
  assert.deepEqual(state().audioSettingsPreview, initial);
  assert.notEqual(state().audioSettingsPreview, state().audioSettings);
  assert.equal(selectAudioUnsavedChanges(state()), false);
  state().updateAudioDraft("bgmVolume", 40);
  state().updateAudioDraft("bgmEnabled", false);
  state().updateAudioDraft("gunshotVolume", 30);
  assert.deepEqual(selectRuntimeAudioSettings(state()), {
    bgmEnabled: false, bgmVolume: 40, gunshotVolume: 30,
  });
  assert.deepEqual(state().audioSettings, initial);
  assert.deepEqual(createInitialAudioSettings(), initial);
  state().setSettingsPage("audio");
  assert.equal(state().audioSettingsPreview.bgmVolume, 40, "same-page selection retains Audio draft");
  state().updateAudioDraft("bgmEnabled", true);
  assert.equal(selectRuntimeAudioSettings(state()).bgmVolume, 40, "ON restores playback at the retained volume");
  assert.equal(selectAudioUnsavedChanges(state()), true);
  for (const [key, value] of Object.entries(initial)) state().updateAudioDraft(key, value);
  assert.equal(selectAudioUnsavedChanges(state()), false);
});

test("Audio SAVE atomically commits all three fields and permits immediate further preview", () => {
  openAudio();
  const values = { bgmEnabled: false, bgmVolume: 20, gunshotVolume: 60 };
  for (const [key, value] of Object.entries(values)) state().updateAudioDraft(key, value);
  const draft = state().audioSettingsPreview;
  const updates = [];
  const unsubscribe = useAppStore.subscribe((next) => updates.push(next));
  assert.equal(state().saveAudioSettings(), true);
  unsubscribe();
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].audioSettings, values);
  assert.notEqual(state().audioSettings, draft);
  assert.equal(state().settingsPage, "audio");
  assert.equal(selectAudioUnsavedChanges(state()), false);
  state().updateAudioDraft("bgmVolume", 50);
  assert.equal(selectRuntimeAudioSettings(state()).bgmVolume, 50);
  assert.equal(state().audioSettings.bgmVolume, 20);
  state().setSettingsPage("home");
  assert.deepEqual(selectRuntimeAudioSettings(state()), values);
  state().setSettingsPage("audio");
  assert.deepEqual(state().audioSettingsPreview, values);
});

test("Audio RESET previews Initial, BACK restores Applied, and RESET plus SAVE commits Initial", () => {
  openAudio();
  state().updateAudioDraft("bgmEnabled", false);
  state().updateAudioDraft("bgmVolume", 20);
  state().updateAudioDraft("gunshotVolume", 30);
  state().saveAudioSettings();
  const applied = state().audioSettings;
  state().resetAudioDraft();
  assert.deepEqual(selectRuntimeAudioSettings(state()), createInitialAudioSettings());
  assert.equal(state().audioSettings, applied);
  assert.equal(selectAudioUnsavedChanges(state()), true);
  state().setSettingsPage("home");
  assert.equal(selectRuntimeAudioSettings(state()), applied);
  state().setSettingsPage("audio");
  assert.deepEqual(state().audioSettingsPreview, applied);
  state().resetAudioDraft();
  state().saveAudioSettings();
  state().setSettingsPage("home");
  assert.deepEqual(selectRuntimeAudioSettings(state()), createInitialAudioSettings());
});

test("Audio BACK, category switches, B/Y close, and XR close discard preview and restore Applied", () => {
  const applied = { bgmEnabled: false, bgmVolume: 30, gunshotVolume: 40 };
  const exits = [
    () => state().setSettingsPage("home"),
    () => state().setSettingsPage("weapon"),
    () => state().toggleMenu(),
    () => state().setMenuOpen(false),
  ];
  for (const exit of exits) {
    openAudio();
    for (const [key, value] of Object.entries(applied)) state().updateAudioDraft(key, value);
    state().saveAudioSettings();
    state().updateAudioDraft("bgmEnabled", true);
    state().updateAudioDraft("bgmVolume", 90);
    exit();
    assert.equal(state().audioSettingsPreview, null);
    assert.deepEqual(selectRuntimeAudioSettings(state()), applied);
    assert.equal(selectAudioUnsavedChanges(state()), false);
    openAudio();
    assert.deepEqual(state().audioSettingsPreview, applied);
  }
});

test("category switching never leaks unsaved settings into the other category runtime", () => {
  openWeapon();
  state().updateWeaponDraft("pitch", 7);
  state().setSettingsPage("audio");
  assert.equal(state().weaponSettingsPreview, null);
  assert.deepEqual(selectRuntimeWeaponSettings(state()), createInitialWeaponSettings());
  state().updateAudioDraft("bgmEnabled", false);
  state().updateAudioDraft("bgmVolume", 10);
  state().setSettingsPage("weapon");
  assert.equal(state().audioSettingsPreview, null);
  assert.deepEqual(selectRuntimeAudioSettings(state()), createInitialAudioSettings());
  assert.deepEqual(state().weaponSettingsPreview, createInitialWeaponSettings());
});

test("Audio actions validate types and snap/clamp percentages; actions outside AUDIO are inert", () => {
  const initial = state().audioSettings;
  state().setSettingsPage("audio");
  state().updateAudioDraft("bgmVolume", 10);
  state().resetAudioDraft();
  assert.equal(state().saveAudioSettings(), false);
  assert.equal(state().audioSettingsPreview, null);
  assert.equal(state().audioSettings, initial);
  openAudio();
  for (const [key, value] of [
    ["bgmEnabled", 1], ["bgmEnabled", "false"], ["bgmVolume", NaN],
    ["bgmVolume", Infinity], ["gunshotVolume", "20"], ["unknown", 10],
  ]) state().updateAudioDraft(key, value);
  assert.deepEqual(state().audioSettingsPreview, createInitialAudioSettings());
  state().updateAudioDraft("bgmVolume", 37);
  assert.equal(state().audioSettingsPreview.bgmVolume, 40);
  state().updateAudioDraft("bgmVolume", -25);
  assert.equal(state().audioSettingsPreview.bgmVolume, 0);
  state().updateAudioDraft("gunshotVolume", 145);
  assert.equal(state().audioSettingsPreview.gunshotVolume, 100);
});
