import {
  TRIGGER_FIRE_THRESHOLD,
  TRIGGER_IDLE_THRESHOLD,
  TRIGGER_RELEASE_TRAVEL,
  TRIGGER_REPULL_TRAVEL,
} from "./shootingConfig.js";

export function createTriggerGate({
  fireThreshold = TRIGGER_FIRE_THRESHOLD,
  releaseTravel = TRIGGER_RELEASE_TRAVEL,
  repullTravel = TRIGGER_REPULL_TRAVEL,
  idleThreshold = TRIGGER_IDLE_THRESHOLD,
} = {}) {
  if (
    !Number.isFinite(fireThreshold) || fireThreshold <= idleThreshold || fireThreshold > 1 ||
    !Number.isFinite(idleThreshold) || idleThreshold < 0 ||
    !Number.isFinite(releaseTravel) || releaseTravel <= 0 || releaseTravel > 1 ||
    !Number.isFinite(repullTravel) || repullTravel <= 0 || repullTravel > 1
  ) {
    throw new Error("Invalid trigger gate thresholds or travel distances");
  }

  // A controller that connects while held must return to idle before its first shot.
  let state = "WAITING_FOR_INITIAL_RELEASE";
  let peak = 0;
  let trough = 0;
  return {
    // UI interaction must finish with a full release before shooting can resume.
    reset() {
      state = "WAITING_FOR_INITIAL_RELEASE";
      peak = 0;
      trough = 0;
    },
    updateTriggerState(value) {
      if (!Number.isFinite(value)) return false;

      if (value <= idleThreshold) {
        state = "READY_FIRST_SHOT";
        return false;
      }

      if (state === "WAITING_FOR_INITIAL_RELEASE") return false;

      if (state === "READY_FIRST_SHOT") {
        if (value < fireThreshold) return false;
        peak = value;
        state = "WAITING_FOR_RELEASE";
        return true;
      }

      if (state === "WAITING_FOR_RELEASE") {
        peak = Math.max(peak, value);
        if (peak - value >= releaseTravel) {
          trough = value;
          state = "WAITING_FOR_REPULL";
        }
        return false;
      }

      trough = Math.min(trough, value);
      if (value - trough < repullTravel) return false;
      peak = value;
      state = "WAITING_FOR_RELEASE";
      return true;
    },
  };
}
