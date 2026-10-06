import { useAppStore, selectRuntimeAudioSettings } from "../store/useAppStore.js";
import { SETTINGS_CONFIG, createInitialAudioSettings } from "../userSetting/userSettingConfig.js";
import { BGM_TRACKS } from "./bgmTracks.js";

const GUNSHOT_URL = `${import.meta.env?.BASE_URL ?? "/"}assets/audio/sfx/gunshot_pistol.wav`;
const BGM_LOOP = true;

function toRuntimeAudioSettings(settings) {
  return {
    bgmEnabled: settings.bgmEnabled,
    bgmVolume: SETTINGS_CONFIG.audio.bgmVolume.toRuntime(settings.bgmVolume),
    gunshotVolume: SETTINGS_CONFIG.audio.gunshotVolume.toRuntime(settings.gunshotVolume),
  };
}

function createBrowserAudioContext() {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return AudioContextClass == null ? null : new AudioContextClass();
}

// Dependencies are injectable so playback and failure cases can be checked without a browser.
export function createAudioRuntime({
  initialSettings = toRuntimeAudioSettings(createInitialAudioSettings()),
  createContext = createBrowserAudioContext,
  createMediaElement = () => new globalThis.Audio(),
  fetchAudio = (url) => fetch(url),
  tracks = BGM_TRACKS,
  warn = (...args) => console.warn(...args),
} = {}) {
  let settings = { ...initialSettings };
  let context = null;
  let bgmGain = null;
  let gunshotGain = null;
  let bgmElement = null;
  let bgmSource = null;
  let activated = false;
  let playbackActive = false;
  let playbackGuard = () => true;
  let resumePromise = null;
  let playPromise = null;
  let playAttempt = 0;
  let gunshotBufferPromise = null;

  function getAudioContext() {
    if (context != null) return context;
    try {
      const nextContext = createContext();
      if (nextContext == null) return null;
      const nextBgmGain = nextContext.createGain();
      const nextGunshotGain = nextContext.createGain();
      nextBgmGain.gain.value = settings.bgmVolume;
      nextGunshotGain.gain.value = settings.gunshotVolume;
      nextBgmGain.connect(nextContext.destination);
      nextGunshotGain.connect(nextContext.destination);
      context = nextContext;
      bgmGain = nextBgmGain;
      gunshotGain = nextGunshotGain;
      return context;
    } catch (error) {
      warn("Audio could not initialize", error);
      return null;
    }
  }

  function getBgmElement() {
    const currentContext = getAudioContext();
    if (currentContext == null || tracks.length === 0) return null;
    try {
      if (bgmElement == null) {
        bgmElement = createMediaElement();
        bgmElement.preload = "metadata";
        bgmElement.loop = BGM_LOOP;
        bgmElement.src = tracks[0].src;
      }
      if (bgmSource == null) {
        bgmSource = currentContext.createMediaElementSource(bgmElement);
        bgmSource.connect(bgmGain);
      }
      return bgmElement;
    } catch (error) {
      warn("BGM could not initialize", error);
      return null;
    }
  }

  function pauseBgm() {
    // Invalidate pending play promises so OFF -> ON can start a fresh attempt.
    playAttempt++;
    playPromise = null;
    bgmElement?.pause();
  }

  function canPlayBgm() {
    return activated && playbackActive && settings.bgmEnabled && playbackGuard();
  }

  function playBgm() {
    if (!canPlayBgm()) return Promise.resolve();
    if (playPromise != null) return playPromise;
    const element = getBgmElement();
    if (element == null || !element.paused) return Promise.resolve();

    const guard = playbackGuard;
    if (!canPlayBgm()) return Promise.resolve();
    const attempt = ++playAttempt;
    try {
      const result = element.play();
      playPromise = Promise.resolve(result)
        .then(() => {
          // A retired attempt must not change a newer session's valid playback.
          if (attempt !== playAttempt) {
            if (!canPlayBgm()) element.pause();
            return;
          }
          if (guard !== playbackGuard || !canPlayBgm()) element.pause();
        })
        .catch((error) => {
          // pause() can reject an outstanding play; this is an expected OFF transition.
          if (attempt === playAttempt) warn("BGM could not play", error);
        })
        .finally(() => {
          if (attempt === playAttempt) playPromise = null;
        });
      return playPromise;
    } catch (error) {
      warn("BGM could not play", error);
      return Promise.resolve();
    }
  }

  function resumeAudioContext() {
    const currentContext = getAudioContext();
    if (currentContext == null || currentContext.state === "running") return Promise.resolve();
    if (resumePromise != null) return resumePromise;
    try {
      resumePromise = Promise.resolve(currentContext.resume())
        .catch((error) => warn("Audio could not resume", error))
        .finally(() => { resumePromise = null; });
      return resumePromise;
    } catch (error) {
      warn("Audio could not resume", error);
      return Promise.resolve();
    }
  }

  function unlockContext() {
    activated = true;
    // Prepare the shared context in the user gesture without starting BGM.
    return resumeAudioContext();
  }

  function unlock() {
    const resumed = unlockContext();
    void playBgm();
    // Streaming readiness must never delay an independently decoded gunshot.
    return resumed;
  }

  function stop({ resetPosition = false } = {}) {
    playbackActive = false;
    playbackGuard = () => true;
    pauseBgm();
    if (resetPosition && bgmElement != null) bgmElement.currentTime = 0;
  }

  function start(canContinue = () => true) {
    playbackActive = true;
    playbackGuard = canContinue;
    void playBgm();
  }

  function setAudioSettings(nextSettings) {
    const enabledChanged = settings.bgmEnabled !== nextSettings.bgmEnabled;
    settings = { ...nextSettings };
    if (bgmGain != null) bgmGain.gain.value = settings.bgmVolume;
    if (gunshotGain != null) gunshotGain.gain.value = settings.gunshotVolume;
    if (!settings.bgmEnabled) pauseBgm();
    else if (enabledChanged) void playBgm();
  }

  function preloadGunshot() {
    if (gunshotBufferPromise != null) return gunshotBufferPromise;
    const currentContext = getAudioContext();
    if (currentContext == null) return Promise.resolve(null);
    gunshotBufferPromise = Promise.resolve()
      .then(() => fetchAudio(GUNSHOT_URL))
      .then((response) => {
        if (!response.ok) throw new Error(`Gunshot audio request failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => currentContext.decodeAudioData(data))
      .catch((error) => {
        warn("Gunshot audio could not load", error);
        return null;
      });
    return gunshotBufferPromise;
  }

  function playGunshot() {
    const currentContext = getAudioContext();
    if (currentContext == null) return;
    const ready = unlock();
    void Promise.all([ready, preloadGunshot()])
      .then(([, buffer]) => {
        if (buffer == null || currentContext.state !== "running") return;
        const source = currentContext.createBufferSource();
        source.buffer = buffer;
        source.connect(gunshotGain);
        source.onended = () => source.disconnect();
        source.start();
      })
      .catch((error) => warn("Gunshot audio could not play", error));
  }

  return { setAudioSettings, unlockContext, unlock, start, stop, preloadGunshot, playGunshot };
}

export const sharedAudioRuntime = createAudioRuntime();

export function syncCurrentAudioSettings() {
  sharedAudioRuntime.setAudioSettings(toRuntimeAudioSettings(selectRuntimeAudioSettings(useAppStore.getState())));
}

export function startAudioSettingsSync(store = useAppStore, runtime = sharedAudioRuntime) {
  const apply = (state) => runtime.setAudioSettings(toRuntimeAudioSettings(selectRuntimeAudioSettings(state)));
  apply(store.getState());
  const unsubscribe = store.subscribe((state, previousState) => {
    const current = selectRuntimeAudioSettings(state);
    const previous = selectRuntimeAudioSettings(previousState);
    if (current.bgmEnabled !== previous.bgmEnabled || current.bgmVolume !== previous.bgmVolume ||
        current.gunshotVolume !== previous.gunshotVolume) apply(state);
  });
  return () => {
    unsubscribe();
    runtime.stop();
  };
}

export function unlockAudio() {
  syncCurrentAudioSettings();
  return sharedAudioRuntime.unlock();
}

export function unlockAudioContext() {
  syncCurrentAudioSettings();
  return sharedAudioRuntime.unlockContext();
}
