import { TRIGGER_FIRE_THRESHOLD, TRIGGER_RESET_THRESHOLD } from "./shootingConfig.js";

// Returns one firing decision per pull; the trigger must go below reset to re-arm.
export function createTriggerGate(
  fireThreshold = TRIGGER_FIRE_THRESHOLD,
  resetThreshold = TRIGGER_RESET_THRESHOLD,
) {
  if (resetThreshold >= fireThreshold) {
    throw new Error("Trigger reset threshold must be below fire threshold");
  }

  // A controller that connects while held must be released before it can fire.
  let armed = false;
  return {
    updateTriggerState(value) {
      if (!Number.isFinite(value)) return false;
      if (!armed) {
        if (value < resetThreshold) armed = true;
        return false;
      }
      if (value < fireThreshold) return false;
      armed = false;
      return true;
    },
  };
}
