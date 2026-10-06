import assert from "node:assert/strict";
import test from "node:test";
import { createAudioRuntime } from "../audio/audioManager.js";
import { GUNSHOT_VOLUME } from "./shootingConfig.js";
import { useAppStore } from "../store/useAppStore.js";

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

test("rapid shots use one decoded buffer and independent overlapping sources while BGM play remains pending", async () => {
  const decodedBuffer = {};
  const sources = [];
  const gains = [];
  let contexts = 0;
  let fetches = 0;
  let decodes = 0;
  let resumes = 0;
  let finishDecode;
  let bgmPlays = 0;
  const context = {
    state: "suspended",
    destination: {},
    createGain() {
      const gain = { gain: { value: 1 }, connect(target) { this.target = target; } };
      gains.push(gain);
      return gain;
    },
    createMediaElementSource() { return { connect() {} }; },
    decodeAudioData() {
      decodes++;
      return new Promise((resolve) => { finishDecode = resolve; });
    },
    resume() {
      resumes++;
      this.state = "running";
      return Promise.resolve();
    },
    createBufferSource() {
      const source = {
        connect(target) { this.target = target; },
        start() { this.started = true; },
        disconnect() { this.disconnected = true; },
      };
      sources.push(source);
      return source;
    },
  };
  const audio = createAudioRuntime({
    createContext: () => { contexts++; return context; },
    createMediaElement: () => ({
      paused: true,
      play() { bgmPlays++; return new Promise(() => {}); },
      pause() {},
    }),
    fetchAudio: async (url) => {
      assert.match(url, /assets\/audio\/sfx\/gunshot_pistol\.wav$/);
      fetches++;
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
    },
  });
  const firstLoad = audio.preloadGunshot();
  assert.equal(audio.preloadGunshot(), firstLoad);
  await nextTurn();
  audio.start();
  await audio.unlock();
  for (let shot = 0; shot < 4; shot++) audio.playGunshot();
  assert.equal(sources.length, 0);
  finishDecode(decodedBuffer);
  await firstLoad;
  await nextTurn();

  assert.equal(contexts, 1);
  assert.equal(fetches, 1);
  assert.equal(decodes, 1);
  assert.equal(resumes, 1);
  assert.equal(bgmPlays, 1);
  assert.equal(gains[1].gain.value, GUNSHOT_VOLUME);
  assert.equal(gains[1].target, context.destination);
  assert.equal(sources.length, 4);
  for (const source of sources) {
    assert.equal(source.buffer, decodedBuffer);
    assert.equal(source.target, gains[1]);
    assert.equal(source.started, true);
    assert.equal(source.disconnected, undefined);
  }
  sources[0].onended();
  assert.equal(sources[0].disconnected, true);
  assert.equal(sources[1].disconnected, undefined);
  audio.setAudioSettings({ bgmEnabled: true, bgmVolume: 0.7, gunshotVolume: 0.4 });
  audio.playGunshot();
  await nextTurn();
  assert.equal(sources.length, 5);
  assert.equal(sources[4].target.gain.value, 0.4);
});

test("failed audio loading does not throw from a shot", async () => {
  let sources = 0;
  let fetches = 0;
  const warnings = [];
  const audio = createAudioRuntime({
    initialSettings: { bgmEnabled: false, bgmVolume: 0.7, gunshotVolume: 1 },
    createContext: () => ({
      state: "running",
      destination: {},
      createGain() { return { gain: { value: 1 }, connect() {} }; },
      createBufferSource() { sources++; return {}; },
    }),
    fetchAudio: async () => {
      fetches++;
      throw new Error("network unavailable");
    },
    warn: (...args) => warnings.push(args),
  });
  assert.doesNotThrow(() => {
    audio.playGunshot();
    audio.playGunshot();
  });
  await nextTurn();
  assert.equal(fetches, 1);
  assert.equal(sources, 0);
  assert.equal(warnings.length, 1);
});

test("shooting API reads Applied volume without a mounted settings subscription", async (t) => {
  const originalAudioContext = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  const previousState = useAppStore.getState();
  t.after(() => {
    globalThis.AudioContext = originalAudioContext;
    globalThis.fetch = originalFetch;
    useAppStore.setState(previousState);
  });
  const gains = [];
  const sources = [];
  globalThis.AudioContext = class {
    constructor() { this.state = "suspended"; this.destination = {}; }
    createGain() {
      const gain = { gain: { value: 1 }, connect() {} };
      gains.push(gain);
      return gain;
    }
    resume() { this.state = "running"; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({}); }
    createBufferSource() {
      const source = { connect(target) { this.target = target; }, start() {}, disconnect() {} };
      sources.push(source);
      return source;
    }
  };
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
  useAppStore.setState({
    menuOpen: false,
    audioSettings: { bgmEnabled: false, bgmVolume: 70, gunshotVolume: 60 },
  });
  const { preloadGunshot, resumeGunshotAudio, playGunshot } = await import("./gunshotAudio.js");
  await preloadGunshot();
  await resumeGunshotAudio();
  playGunshot();
  await nextTurn();
  assert.equal(gains[1].gain.value, 0.6);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].target, gains[1]);
  useAppStore.setState({ audioSettings: { bgmEnabled: false, bgmVolume: 70, gunshotVolume: 40 } });
  playGunshot();
  await nextTurn();
  assert.equal(gains[1].gain.value, 0.4);
  assert.equal(sources.length, 2);
});
