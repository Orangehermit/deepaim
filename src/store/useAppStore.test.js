import assert from "node:assert/strict";
import test from "node:test";
import { useAppStore } from "./useAppStore.js";

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
