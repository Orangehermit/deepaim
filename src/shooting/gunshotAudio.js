import { sharedAudioRuntime, syncCurrentAudioSettings, unlockAudio } from "../audio/audioManager.js";

export function preloadGunshot() {
  syncCurrentAudioSettings();
  return sharedAudioRuntime.preloadGunshot();
}

// Kept for existing callers; all sounds now unlock the same AudioContext.
export const resumeGunshotAudio = unlockAudio;

export function playGunshot() {
  // Also read effective settings here when no mounted App subscription is present.
  syncCurrentAudioSettings();
  sharedAudioRuntime.playGunshot();
}
