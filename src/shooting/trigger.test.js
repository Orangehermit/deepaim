import assert from "node:assert/strict";
import test from "node:test";
import { createTriggerGate } from "./trigger.js";
import { TRIGGER_FIRE_THRESHOLD } from "./shootingConfig.js";

const firedAt = (values, options) => {
  const gate = createTriggerGate(options);
  return values.flatMap((value, index) => gate.updateTriggerState(value) ? [index] : []);
};

test("uses the current threshold for the first shot, then holds without repeating", () => {
  assert.deepEqual(firedAt([0, 0.2, TRIGGER_FIRE_THRESHOLD, 0.5, 1, 1, 1]), [2]);
});

test("fires again after release from a deep peak and a distinct repull", () => {
  const values = [0, 0.25, 0.5, 0.875, 0.86, 0.83, 0.75, 0.625, 0.64, 0.66];
  assert.deepEqual(firedAt(values), [1, 9]);
});

test("allows shallow rapid fire without returning below the first-shot threshold", () => {
  const values = [0, 0.25, 0.34, 0.3, 0.18, 0.22, 0.35, 0.31, 0.19, 0.23];
  assert.deepEqual(firedAt(values), [1, 5, 9]);
});

test("does not fire while the trigger is still releasing or only vibrating slightly", () => {
  const values = [0, 0.25, 0.4, 0.38, 0.4, 0.36, 0.34, 0.3, 0.32, 0.3, 0.34];
  assert.deepEqual(firedAt(values), [1, 10]);
});

test("returns to first-shot behavior from either rapid-fire state at idle", () => {
  assert.deepEqual(firedAt([0, 0.25, 0.8, 0, 0.1, 0.25]), [1, 5]);
  assert.deepEqual(firedAt([0, 0.25, 0.8, 0.7, 0, 0.1, 0.25]), [1, 6]);
});

test("missing values leave the current gate state unchanged", () => {
  assert.deepEqual(firedAt([0, 0.25, 0.8, undefined, NaN, 0.8, 0.7, undefined, 0.7, 0.74]), [1, 9]);
});

test("a controller that connects while held must reach idle before firing", () => {
  assert.deepEqual(firedAt([0.5, 1, 0.2, 0.05, 0.25]), [4]);
});

test("digital fallback still fires once per full select event cycle", () => {
  assert.deepEqual(firedAt([0, 1, 1, 0, 0, 1]), [1, 5]);
});

test("travel limits include the exact boundary and reject invalid settings", () => {
  const options = { fireThreshold: 0.25, releaseTravel: 0.125, repullTravel: 0.125, idleThreshold: 0.05 };
  assert.deepEqual(firedAt([0, 0.25, 0.75, 0.625, 0.5, 0.625], options), [1, 5]);
  assert.throws(() => createTriggerGate({ releaseTravel: 0 }), /Invalid trigger gate/);
  assert.throws(() => createTriggerGate({ repullTravel: 0 }), /Invalid trigger gate/);
  assert.throws(() => createTriggerGate({ idleThreshold: TRIGGER_FIRE_THRESHOLD }), /Invalid trigger gate/);
});
