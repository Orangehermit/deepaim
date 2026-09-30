import { GUNSHOT_VOLUME } from "./shootingConfig.js";

const GUNSHOT_URL = `${import.meta.env?.BASE_URL ?? "/"}assets/audio/gunshot_pistol.wav`;

let audioContext = null;
let sfxGain = null;
let gunshotBufferPromise = null;

function getAudioContext() {
  if (audioContext != null) return audioContext;

  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (AudioContextClass == null) return null;

  try {
    const context = new AudioContextClass();
    const masterGain = context.createGain();
    const gunshotSfxGain = context.createGain();
    masterGain.connect(context.destination);
    gunshotSfxGain.gain.value = GUNSHOT_VOLUME;
    gunshotSfxGain.connect(masterGain);
    audioContext = context;
    sfxGain = gunshotSfxGain;
    return audioContext;
  } catch (error) {
    console.warn("Gunshot audio could not initialize", error);
    return null;
  }
}

export function preloadGunshot() {
  if (gunshotBufferPromise != null) return gunshotBufferPromise;

  const context = getAudioContext();
  if (context == null) return Promise.resolve(null);

  gunshotBufferPromise = Promise.resolve()
    .then(() => fetch(GUNSHOT_URL))
    .then((response) => {
      if (!response.ok) throw new Error(`Gunshot audio request failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .catch((error) => {
      console.warn("Gunshot audio could not load", error);
      return null;
    });
  return gunshotBufferPromise;
}

export function resumeGunshotAudio() {
  const context = getAudioContext();
  if (context == null || context.state !== "suspended") return Promise.resolve();

  try {
    return context.resume().catch((error) => {
      console.warn("Gunshot audio could not resume", error);
    });
  } catch (error) {
    console.warn("Gunshot audio could not resume", error);
    return Promise.resolve();
  }
}

export function playGunshot() {
  const context = getAudioContext();
  if (context == null) return;

  // Begin resume while still handling the user's interaction; loading may finish later.
  const ready = resumeGunshotAudio();
  void Promise.all([ready, preloadGunshot()])
    .then(([, buffer]) => {
      if (buffer == null || context.state !== "running") return;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(sfxGain);
      source.onended = () => source.disconnect();
      source.start();
    })
    .catch((error) => console.warn("Gunshot audio could not play", error));
}
