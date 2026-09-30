import assert from "node:assert/strict";
import test from "node:test";
import { GUNSHOT_VOLUME } from "./shootingConfig.js";

let moduleId = 0;
const loadModule = () => import(`./gunshotAudio.js?test=${++moduleId}`);
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

test("rapid shots use one decoded buffer and independent overlapping sources", async (t) => {
  const originalAudioContext = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.AudioContext = originalAudioContext;
    globalThis.fetch = originalFetch;
  });

  const decodedBuffer = {};
  const sources = [];
  const gains = [];
  let contexts = 0;
  let fetches = 0;
  let decodes = 0;
  let resumes = 0;
  let finishDecode;

  globalThis.AudioContext = class {
    constructor() {
      contexts++;
      this.state = "suspended";
      this.destination = {};
    }
    createGain() {
      const gain = { gain: { value: 1 }, connect: (target) => { gain.target = target; } };
      gains.push(gain);
      return gain;
    }
    decodeAudioData() {
      decodes++;
      return new Promise((resolve) => { finishDecode = resolve; });
    }
    resume() {
      resumes++;
      this.state = "running";
      return Promise.resolve();
    }
    createBufferSource() {
      const source = {
        connect(target) { this.target = target; },
        start() { this.started = true; },
        disconnect() { this.disconnected = true; },
      };
      sources.push(source);
      return source;
    }
  };
  globalThis.fetch = async () => {
    fetches++;
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
  };

  const { preloadGunshot, playGunshot, resumeGunshotAudio } = await loadModule();
  const firstLoad = preloadGunshot();
  assert.equal(preloadGunshot(), firstLoad);
  await nextTurn();
  await resumeGunshotAudio();
  for (let shot = 0; shot < 4; shot++) playGunshot();
  assert.equal(sources.length, 0);
  finishDecode(decodedBuffer);
  await firstLoad;
  await nextTurn();

  assert.equal(contexts, 1);
  assert.equal(fetches, 1);
  assert.equal(decodes, 1);
  assert.equal(resumes, 1);
  assert.equal(gains[1].gain.value, GUNSHOT_VOLUME);
  assert.equal(gains[1].target, gains[0]);
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
});

test("failed audio loading does not throw from a shot", async (t) => {
  const originalAudioContext = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  t.after(() => {
    globalThis.AudioContext = originalAudioContext;
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  });

  let sources = 0;
  let fetches = 0;
  const warnings = [];
  globalThis.AudioContext = class {
    constructor() {
      this.state = "running";
      this.destination = {};
    }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    createBufferSource() { sources++; return {}; }
  };
  globalThis.fetch = async () => {
    fetches++;
    throw new Error("network unavailable");
  };
  console.warn = (...args) => warnings.push(args);

  const { playGunshot } = await loadModule();
  assert.doesNotThrow(() => {
    playGunshot();
    playGunshot();
  });
  await nextTurn();
  assert.equal(fetches, 1);
  assert.equal(sources, 0);
  assert.equal(warnings.length, 1);
});
