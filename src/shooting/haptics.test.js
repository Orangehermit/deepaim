import assert from "node:assert/strict";
import test from "node:test";
import { pulseController } from "./haptics.js";
import { HAPTIC_DURATION_MS, HAPTIC_INTENSITY } from "./shootingConfig.js";

test("uses an available WebXR pulse actuator", () => {
  const calls = [];
  pulseController({ gamepad: { hapticActuators: [{
    pulse: (...args) => { calls.push(args); return Promise.resolve(true); },
  }] } });
  assert.deepEqual(calls, [[HAPTIC_INTENSITY, HAPTIC_DURATION_MS]]);
});

test("uses a vibration actuator when pulse is unavailable", () => {
  const calls = [];
  pulseController({ gamepad: { vibrationActuator: {
    playEffect: (...args) => { calls.push(args); return Promise.resolve("complete"); },
  } } });
  assert.deepEqual(calls, [["dual-rumble", {
    duration: HAPTIC_DURATION_MS,
    strongMagnitude: HAPTIC_INTENSITY,
    weakMagnitude: HAPTIC_INTENSITY,
  }]]);
});

test("uses playEffect on an actuator array when pulse is unavailable", () => {
  let called = false;
  pulseController({ gamepad: { hapticActuators: [{
    playEffect: () => { called = true; return Promise.resolve("complete"); },
  }] } });
  assert.equal(called, true);
});

test("unsupported or throwing actuators do not interrupt a shot", () => {
  assert.doesNotThrow(() => pulseController({}));
  assert.doesNotThrow(() => pulseController({ gamepad: { hapticActuators: [{
    pulse: () => { throw new Error("unavailable"); },
  }] } }));
});
