import { HAPTIC_DURATION_MS, HAPTIC_INTENSITY } from "./shootingConfig.js";

export function pulseController(inputSource) {
  const gamepad = inputSource.gamepad;
  const legacy = gamepad?.hapticActuators?.[0];
  const modern = gamepad?.vibrationActuator ?? legacy;
  try {
    let result;
    if (typeof legacy?.pulse === "function") {
      result = legacy.pulse(HAPTIC_INTENSITY, HAPTIC_DURATION_MS);
    } else if (typeof modern?.playEffect === "function") {
      result = modern.playEffect("dual-rumble", {
        duration: HAPTIC_DURATION_MS,
        strongMagnitude: HAPTIC_INTENSITY,
        weakMagnitude: HAPTIC_INTENSITY,
      });
    }
    // Haptic support is optional, and a rejected promise must not interrupt a shot.
    Promise.resolve(result).catch(() => {});
  } catch {
    // Some runtimes expose an actuator but reject calls to it.
  }
}
