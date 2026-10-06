import assert from "node:assert/strict";
import test from "node:test";
import { createAudioRuntime, startAudioSettingsSync } from "./audioManager.js";
import { BGM_TRACKS } from "./bgmTracks.js";
import { createAppStore } from "../store/useAppStore.js";
import { createStore } from "zustand/vanilla";
import { createXRAudioLifecycle } from "./xrAudioLifecycle.js";

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));
const settings = { bgmEnabled: true, bgmVolume: 0.7, gunshotVolume: 1 };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

class TestXRSession extends EventTarget {
  constructor(visibilityState = "visible") {
    super();
    this.visibilityState = visibilityState;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    super.addEventListener(type, listener);
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    super.removeEventListener(type, listener);
    this.listeners.get(type)?.delete(listener);
  }

  setVisibility(visibilityState) {
    this.visibilityState = visibilityState;
    this.dispatchEvent(new Event("visibilitychange"));
  }

  end() { this.dispatchEvent(new Event("end")); }
  listenerCount(type) { return this.listeners.get(type)?.size ?? 0; }
}

function setup({ resume, play, onMediaCreate, active = true } = {}) {
  const events = [];
  const gains = [];
  const warnings = [];
  let contextCount = 0;
  let elementCount = 0;
  let sourceCount = 0;
  const media = {
    paused: true,
    currentTime: 23,
    play() {
      events.push("play");
      if (play != null) return play(this);
      this.paused = false;
      return Promise.resolve();
    },
    pause() { events.push("pause"); this.paused = true; },
  };
  const context = {
    state: "suspended",
    destination: {},
    createGain() {
      const gain = { gain: { value: 1 }, connect(target) { this.target = target; } };
      gains.push(gain);
      return gain;
    },
    createMediaElementSource(element) {
      sourceCount++;
      assert.equal(element, media);
      return { connect(target) { assert.equal(target, gains[0]); } };
    },
    resume() {
      events.push("resume");
      if (resume != null) return resume(this);
      this.state = "running";
      return Promise.resolve();
    },
    decodeAudioData() { return Promise.resolve({}); },
  };
  const runtime = createAudioRuntime({
    initialSettings: settings,
    createContext: () => { contextCount++; return context; },
    createMediaElement: () => { elementCount++; onMediaCreate?.(); return media; },
    fetchAudio: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }),
    warn: (...args) => warnings.push(args),
  });
  if (active) runtime.start();
  return { runtime, context, media, gains, events, warnings,
    counts: () => ({ contextCount, elementCount, sourceCount }) };
}

function setupXR(h, enterVR) {
  const store = createStore(() => ({ session: undefined }));
  store.enterVR = () => {
    h.events.push("enterVR");
    return enterVR();
  };
  const lifecycle = createXRAudioLifecycle(store, {
    runtime: h.runtime,
    unlock: () => h.runtime.unlockContext(),
    warn: (...args) => h.warnings.push(args),
  });
  return { store, lifecycle };
}

test("settings sync and audio unlock cannot start BGM outside an XR entry/session", async () => {
  const h = setup({ active: false });
  const store = createAppStore();
  const cleanup = startAudioSettingsSync(store, h.runtime);
  await h.runtime.unlock();
  store.getState().setMenuOpen(true);
  store.getState().setSettingsPage("audio");
  store.getState().updateAudioDraft("bgmEnabled", false);
  store.getState().updateAudioDraft("bgmEnabled", true);
  await nextTurn();
  assert.deepEqual(h.events, ["resume"]);
  assert.equal(h.counts().elementCount, 0);
  cleanup();
});

test("preload/settings never autoplay; unlock starts resume and media play in the same synchronous call", async () => {
  const pending = deferred();
  const h = setup({ resume: (context) => pending.promise.then(() => { context.state = "running"; }) });
  h.runtime.setAudioSettings({ ...settings, bgmVolume: 0.3, gunshotVolume: 0.4 });
  await h.runtime.preloadGunshot();
  assert.deepEqual(h.events, []);
  assert.equal(h.gains[0].gain.value, 0.3);
  assert.equal(h.gains[1].gain.value, 0.4);
  const unlocked = h.runtime.unlock();
  assert.deepEqual(h.events, ["resume", "play"]);
  assert.equal(h.media.src, BGM_TRACKS[0].src);
  assert.equal(h.media.loop, true);
  assert.match(h.media.src, /assets\/audio\/bgm\/observation_zero\.mp3$/);
  pending.resolve();
  await unlocked;
});

test("BGM OFF pauses at its current position, preserves volume, and reuses one context/element/source", async () => {
  const h = setup();
  await h.runtime.unlock();
  await nextTurn();
  h.runtime.setAudioSettings({ ...settings, bgmEnabled: false, bgmVolume: 0.3, gunshotVolume: 0.4 });
  assert.equal(h.media.paused, true);
  assert.equal(h.media.currentTime, 23);
  assert.equal(h.gains[0].gain.value, 0.3);
  assert.equal(h.gains[1].gain.value, 0.4);
  assert.equal(h.gains[0].target, h.context.destination);
  assert.equal(h.gains[1].target, h.context.destination);
  h.runtime.setAudioSettings({ ...settings, bgmVolume: 0.3, gunshotVolume: 0.4 });
  await nextTurn();
  assert.equal(h.media.paused, false);
  assert.equal(h.gains[0].gain.value, 0.3);
  h.runtime.setAudioSettings({ ...settings, bgmVolume: 0.8, gunshotVolume: 0.4 });
  assert.equal(h.gains[0].gain.value, 0.8);
  assert.equal(h.gains[1].gain.value, 0.4);
  h.runtime.stop();
  assert.equal(h.media.paused, true);
  h.runtime.start();
  await nextTurn();
  assert.equal(h.media.paused, false);
  await h.runtime.unlock();
  assert.deepEqual(h.counts(), { contextCount: 1, elementCount: 1, sourceCount: 1 });
});

test("late pending BGM playback cannot undo OFF or cleanup", async () => {
  for (const stop of [false, true]) {
    const pending = deferred();
    const h = setup({ play: (media) => pending.promise.then(() => { media.paused = false; }) });
    await h.runtime.unlock();
    if (stop) h.runtime.stop();
    else h.runtime.setAudioSettings({ ...settings, bgmEnabled: false });
    pending.resolve();
    await nextTurn();
    assert.equal(h.media.paused, true);
    assert.equal(h.media.currentTime, 23);
    assert.deepEqual(h.warnings, []);
  }
});

test("resume and play rejection are handled and a later user gesture retries", async () => {
  let resumeAttempts = 0;
  let playAttempts = 0;
  const h = setup({
    resume: (context) => {
      if (++resumeAttempts === 1) return Promise.reject(new Error("activation denied"));
      context.state = "running";
      return Promise.resolve();
    },
    play: (media) => {
      if (++playAttempts === 1) return Promise.reject(new Error("autoplay denied"));
      media.paused = false;
      return Promise.resolve();
    },
  });
  await h.runtime.unlock();
  await nextTurn();
  assert.equal(h.warnings.length, 2);
  assert.equal(h.media.paused, true);
  await h.runtime.unlock();
  await nextTurn();
  assert.equal(resumeAttempts, 2);
  assert.equal(playAttempts, 2);
  assert.equal(h.media.paused, false);
  assert.deepEqual(h.counts(), { contextCount: 1, elementCount: 1, sourceCount: 1 });
});

test("OFF then ON starts a new play attempt while an earlier aborted attempt settles", async () => {
  const first = deferred();
  const second = deferred();
  let attempts = 0;
  const h = setup({ play: (media) => {
    const pending = ++attempts === 1 ? first : second;
    return pending.promise.then(() => { media.paused = false; });
  } });
  await h.runtime.unlock();
  h.runtime.setAudioSettings({ ...settings, bgmEnabled: false });
  h.runtime.setAudioSettings(settings);
  assert.equal(attempts, 2);
  first.reject(new Error("aborted by pause"));
  await nextTurn();
  await h.runtime.unlock();
  assert.equal(attempts, 2);
  second.resolve();
  await nextTurn();
  assert.equal(h.media.paused, false);
  assert.deepEqual(h.warnings, []);
});

test("store sync applies hydrated settings, Draft preview, RESET, BACK and menu-close rollback", async () => {
  const persisted = { state: { audioSettings: { bgmEnabled: true, bgmVolume: 40, gunshotVolume: 30 } }, version: 1 };
  const store = createAppStore({ getItem: () => JSON.stringify(persisted), setItem() {}, removeItem() {} });
  const h = setup();
  const cleanup = startAudioSettingsSync(store, h.runtime);
  await h.runtime.unlock();
  await nextTurn();
  assert.equal(h.gains[0].gain.value, 0.4);
  assert.equal(h.gains[1].gain.value, 0.3);
  store.getState().setMenuOpen(true);
  store.getState().setSettingsPage("audio");
  store.getState().updateAudioDraft("bgmVolume", 20);
  store.getState().updateAudioDraft("gunshotVolume", 10);
  store.getState().updateAudioDraft("bgmEnabled", false);
  assert.equal(h.media.paused, true);
  assert.equal(h.gains[0].gain.value, 0.2);
  assert.equal(h.gains[1].gain.value, 0.1);
  store.getState().resetAudioDraft();
  await nextTurn();
  assert.equal(h.gains[0].gain.value, 0.7);
  assert.equal(h.gains[1].gain.value, 1);
  assert.equal(h.media.paused, false);
  store.getState().setSettingsPage("home");
  assert.equal(h.gains[0].gain.value, 0.4);
  assert.equal(h.gains[1].gain.value, 0.3);
  store.getState().setSettingsPage("audio");
  store.getState().updateAudioDraft("bgmVolume", 80);
  store.getState().updateAudioDraft("gunshotVolume", 60);
  store.getState().saveAudioSettings();
  store.getState().setMenuOpen(false);
  assert.equal(h.gains[0].gain.value, 0.8);
  assert.equal(h.gains[1].gain.value, 0.6);
  store.getState().setMenuOpen(true);
  store.getState().setSettingsPage("audio");
  store.getState().updateAudioDraft("bgmEnabled", false);
  store.getState().updateAudioDraft("bgmVolume", 10);
  store.getState().toggleMenu();
  await nextTurn();
  assert.equal(h.media.paused, false);
  assert.equal(h.gains[0].gain.value, 0.8);
  cleanup();
  assert.equal(h.media.paused, true);
  store.setState({ audioSettings: { bgmEnabled: false, bgmVolume: 0, gunshotVolume: 0 } });
  assert.equal(h.gains[0].gain.value, 0.8);
});

test("XR exit resets BGM to the beginning; re-entry preserves preferences and one audio graph", async () => {
  const h = setup({ active: false });
  const requests = [deferred(), deferred()];
  let entries = 0;
  const { store, lifecycle } = setupXR(h, () => requests[entries++].promise);
  let writes = 0;
  const appStore = createAppStore({
    getItem: () => null,
    setItem() { writes++; },
    removeItem() {},
  });
  const disconnect = lifecycle.connect();
  const cleanupSettings = startAudioSettingsSync(appStore, h.runtime);
  const applied = appStore.getState().audioSettings;

  const entry = lifecycle.enterVR();
  assert.deepEqual(h.events, ["resume", "enterVR"]);
  assert.equal(h.counts().elementCount, 0);
  assert.equal(lifecycle.enterVR(), entry);
  assert.equal(entries, 1);
  const session = new TestXRSession();
  store.setState({ session });
  requests[0].resolve(session);
  assert.equal(await entry, session);
  assert.equal(await lifecycle.enterVR(), session);
  assert.equal(entries, 1);
  await nextTurn();
  assert.equal(h.media.paused, false);

  session.setVisibility("hidden");
  assert.equal(h.media.paused, true);
  session.setVisibility("visible");
  await nextTurn();
  assert.equal(h.media.paused, false);
  appStore.getState().setMenuOpen(true);
  appStore.getState().setSettingsPage("audio");
  appStore.getState().updateAudioDraft("bgmVolume", 20);
  assert.equal(h.gains[0].gain.value, 0.2);
  h.media.currentTime = 41;
  store.setState({ session: undefined });
  assert.equal(h.media.paused, true);
  assert.equal(h.media.currentTime, 0);

  // Neither a late Draft edit nor the XR menu-close rollback may restart BGM.
  appStore.getState().updateAudioDraft("bgmEnabled", false);
  appStore.getState().setMenuOpen(false);
  await h.runtime.unlock();
  await nextTurn();
  assert.equal(h.media.paused, true);
  assert.equal(h.gains[0].gain.value, 0.7);
  assert.equal(appStore.getState().audioSettings, applied);
  assert.equal(writes, 0);

  const reentry = lifecycle.enterVR();
  assert.equal(h.media.paused, true);
  const nextSession = new TestXRSession();
  store.setState({ session: nextSession });
  requests[1].resolve(nextSession);
  await reentry;
  await nextTurn();
  assert.equal(h.media.paused, false);
  assert.equal(h.media.currentTime, 0);
  assert.equal(h.gains[0].gain.value, 0.7);
  assert.deepEqual(h.counts(), { contextCount: 1, elementCount: 1, sourceCount: 1 });
  assert.equal(writes, 0);
  disconnect();
  cleanupSettings();
});

test("XR end during pending entry/play cannot be undone by either late completion", async () => {
  const pendingPlay = deferred();
  const pendingEntry = deferred();
  const h = setup({ active: false, play: (media) => pendingPlay.promise.then(() => { media.paused = false; }) });
  const { store, lifecycle } = setupXR(h, () => pendingEntry.promise);
  const disconnect = lifecycle.connect();
  const entry = lifecycle.enterVR();
  assert.equal(h.counts().elementCount, 0);
  const session = new TestXRSession();
  store.setState({ session });
  session.end();
  store.setState({ session: undefined });
  assert.equal(h.media.paused, true);
  pendingPlay.resolve();
  pendingEntry.resolve(session);
  await entry;
  await nextTurn();
  assert.equal(h.media.paused, true);
  assert.equal(h.media.currentTime, 0);
  assert.equal(h.events.filter((event) => event === "play").length, 1);
  assert.deepEqual(h.warnings, []);
  disconnect();
});

test("rejected XR entry never starts BGM and permits a later successful entry", async () => {
  const first = deferred();
  const second = deferred();
  const h = setup({ active: false });
  let entries = 0;
  const { store, lifecycle } = setupXR(h, () => (++entries === 1 ? first : second).promise);
  const disconnect = lifecycle.connect();
  const entry = lifecycle.enterVR();
  assert.equal(h.media.paused, true);
  assert.equal(h.counts().elementCount, 0);
  const error = new Error("XR permission denied");
  first.reject(error);
  assert.equal(await entry, undefined);
  assert.equal(h.media.paused, true);
  assert.equal(h.media.currentTime, 23);
  assert.equal(h.gains[0].gain.value, 0.7);
  assert.deepEqual(h.warnings, [["VR could not start", error]]);

  const retry = lifecycle.enterVR();
  assert.equal(h.counts().elementCount, 0);
  const session = new TestXRSession();
  store.setState({ session });
  second.resolve(session);
  await retry;
  await nextTurn();
  assert.equal(h.media.paused, false);
  assert.equal(h.media.currentTime, 23);
  assert.equal(entries, 2);
  disconnect();
});

test("synchronous XR failure and entry without a session also stop BGM", async () => {
  for (const throws of [false, true]) {
    const h = setup({ active: false });
    const { lifecycle } = setupXR(h, () => {
      if (throws) throw new Error("XR unavailable");
      return Promise.resolve(undefined);
    });
    const disconnect = lifecycle.connect();
    await lifecycle.enterVR();
    await nextTurn();
    assert.equal(h.media.paused, true);
    assert.equal(h.counts().elementCount, 0);
    assert.equal(h.warnings.length, throws ? 1 : 0);
    disconnect();
  }
});

test("App cleanup during XR entry blocks late playback and session notifications", async () => {
  const pendingPlay = deferred();
  const pendingEntry = deferred();
  const h = setup({ active: false, play: (media) => pendingPlay.promise.then(() => { media.paused = false; }) });
  const { store, lifecycle } = setupXR(h, () => pendingEntry.promise);
  const disconnect = lifecycle.connect();
  const entry = lifecycle.enterVR();
  const session = new TestXRSession();
  store.setState({ session });
  disconnect();
  session.setVisibility("hidden");
  session.setVisibility("visible");
  pendingEntry.resolve(session);
  pendingPlay.resolve();
  await entry;
  await nextTurn();
  h.runtime.setAudioSettings({ ...settings, bgmEnabled: false });
  h.runtime.setAudioSettings(settings);
  await nextTurn();
  assert.equal(h.media.paused, true);
  assert.equal(h.media.currentTime, 23);
  assert.deepEqual(h.warnings, []);
});

test("hidden and visible-blurred pause the same XR session and visible resumes from its position", async () => {
  for (const initialVisibility of ["hidden", "visible-blurred"]) {
    const h = setup({ active: false });
    const session = new TestXRSession(initialVisibility);
    const { store, lifecycle } = setupXR(h, () => Promise.resolve(session));
    const disconnect = lifecycle.connect();
    const entry = lifecycle.enterVR();
    store.setState({ session });
    await entry;
    assert.equal(h.counts().elementCount, 0);
    session.setVisibility("visible");
    await nextTurn();
    assert.equal(h.media.paused, false);
    h.media.currentTime = 57;
    for (const visibility of ["hidden", "visible-blurred"]) {
      session.setVisibility(visibility);
      assert.equal(h.media.paused, true);
      assert.equal(h.media.currentTime, 57);
      h.runtime.setAudioSettings({ ...settings, bgmVolume: 0.3 });
      await h.runtime.unlock();
      assert.equal(h.media.paused, true);
      session.setVisibility("visible");
      await nextTurn();
      assert.equal(h.media.paused, false);
      assert.equal(h.media.currentTime, 57);
      assert.equal(h.gains[0].gain.value, 0.3);
    }
    assert.deepEqual(h.counts(), { contextCount: 1, elementCount: 1, sourceCount: 1 });
    disconnect();
  }
});

test("BGM OFF blocks session start, visibility recovery and a new session", async () => {
  const h = setup({ active: false });
  h.runtime.setAudioSettings({ ...settings, bgmEnabled: false });
  const first = new TestXRSession();
  const { store, lifecycle } = setupXR(h, () => Promise.resolve(first));
  const disconnect = lifecycle.connect();
  const entry = lifecycle.enterVR();
  store.setState({ session: first });
  await entry;
  first.setVisibility("hidden");
  first.setVisibility("visible");
  assert.equal(h.counts().elementCount, 0);
  first.end();
  const second = new TestXRSession();
  store.setState({ session: second });
  second.setVisibility("visible-blurred");
  second.setVisibility("visible");
  await nextTurn();
  assert.equal(h.counts().elementCount, 0);
  assert.equal(h.events.includes("play"), false);
  h.runtime.setAudioSettings(settings);
  await nextTurn();
  assert.equal(h.media.paused, false);
  disconnect();
});

test("ended and replaced sessions cannot resume or interfere with a newer session", async () => {
  const h = setup({ active: false });
  const first = new TestXRSession();
  const { store, lifecycle } = setupXR(h, () => Promise.resolve(first));
  const disconnect = lifecycle.connect();
  const entry = lifecycle.enterVR();
  store.setState({ session: first });
  await entry;
  const staleVisibility = [...first.listeners.get("visibilitychange")][0];
  first.end();
  assert.equal(h.media.paused, true);
  assert.equal(h.media.currentTime, 0);
  assert.equal(first.listenerCount("end"), 0);
  assert.equal(first.listenerCount("visibilitychange"), 0);
  first.setVisibility("hidden");
  first.setVisibility("visible");
  staleVisibility();
  assert.equal(h.media.paused, true);

  const second = new TestXRSession();
  store.setState({ session: second });
  await nextTurn();
  assert.equal(h.media.paused, false);
  staleVisibility();
  first.end();
  assert.equal(h.media.paused, false);
  h.media.currentTime = 12;
  const third = new TestXRSession();
  store.setState({ session: third });
  assert.equal(h.media.currentTime, 0);
  assert.equal(second.listenerCount("end"), 0);
  assert.equal(second.listenerCount("visibilitychange"), 0);
  second.setVisibility("hidden");
  second.end();
  assert.equal(h.media.paused, false);
  disconnect();
  assert.equal(third.listenerCount("end"), 0);
  assert.equal(third.listenerCount("visibilitychange"), 0);
});

test("reconnecting never duplicates listeners and old cleanup cannot stop the new binding", async () => {
  const h = setup({ active: false });
  const session = new TestXRSession();
  const { store, lifecycle } = setupXR(h, () => Promise.resolve(session));
  const disconnectFirst = lifecycle.connect();
  const entry = lifecycle.enterVR();
  store.setState({ session });
  await entry;
  const disconnectSecond = lifecycle.connect();
  assert.equal(session.listenerCount("end"), 1);
  assert.equal(session.listenerCount("visibilitychange"), 1);
  disconnectFirst();
  assert.equal(h.media.paused, false);
  session.setVisibility("hidden");
  assert.equal(h.media.paused, true);
  session.setVisibility("visible");
  await nextTurn();
  assert.equal(h.media.paused, false);
  session.end();
  assert.equal(h.media.paused, true);
  disconnectSecond();
  assert.equal(session.listenerCount("end"), 0);
  assert.equal(session.listenerCount("visibilitychange"), 0);
  assert.equal(h.media.paused, true);
  const disconnectThird = lifecycle.connect();
  assert.equal(h.media.paused, true);
  assert.equal(session.listenerCount("visibilitychange"), 0);
  disconnectThird();
});

test("XR store clearing session before the audio end listener still retires and cleans up that session", async () => {
  const h = setup({ active: false });
  const session = new TestXRSession();
  const { store, lifecycle } = setupXR(h, () => Promise.resolve(session));
  const libraryEnd = () => store.setState({ session: undefined });
  session.addEventListener("end", libraryEnd);
  const disconnect = lifecycle.connect();
  const entry = lifecycle.enterVR();
  store.setState({ session });
  await entry;
  session.end();
  assert.equal(h.media.paused, true);
  assert.equal(h.media.currentTime, 0);
  assert.equal(session.listenerCount("end"), 1);
  assert.equal(session.listenerCount("visibilitychange"), 0);
  store.setState({ session });
  session.setVisibility("visible");
  assert.equal(h.media.paused, true);
  assert.equal(session.listenerCount("visibilitychange"), 0);
  disconnect();
  session.removeEventListener("end", libraryEnd);
});

test("BGM rechecks the session just before play and ignores old play completion in a new session", async () => {
  const endedDuringSetup = new TestXRSession();
  const h = setup({ active: false, onMediaCreate: () => endedDuringSetup.end() });
  const xr = setupXR(h, () => Promise.resolve(endedDuringSetup));
  const disconnect = xr.lifecycle.connect();
  const entry = xr.lifecycle.enterVR();
  xr.store.setState({ session: endedDuringSetup });
  await entry;
  assert.equal(h.counts().elementCount, 1);
  assert.equal(h.events.includes("play"), false);
  assert.equal(h.media.paused, true);
  disconnect();

  const pending = [deferred(), deferred()];
  let plays = 0;
  const next = setup({ active: false, play: (media) => pending[plays++].promise.then(() => { media.paused = false; }) });
  const first = new TestXRSession();
  const { store, lifecycle } = setupXR(next, () => Promise.resolve(first));
  const cleanup = lifecycle.connect();
  const firstEntry = lifecycle.enterVR();
  store.setState({ session: first });
  await firstEntry;
  first.end();
  const second = new TestXRSession();
  store.setState({ session: second });
  assert.equal(plays, 2);
  pending[1].resolve();
  await nextTurn();
  assert.equal(next.media.paused, false);
  pending[0].resolve();
  await nextTurn();
  assert.equal(next.media.paused, false);
  assert.deepEqual(next.warnings, []);
  cleanup();
});
