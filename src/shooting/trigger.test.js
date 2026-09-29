import assert from "node:assert/strict";
import test from "node:test";
import { createTriggerGate } from "./trigger.js";

test("fires once on an upward threshold crossing and rearms below reset", () => {
  const { updateTriggerState } = createTriggerGate();
  const values = [0, 0.5, 0.849, 0.85, 1, 0.86, 0.7, 0.84, 0.9, 0.69, 0.85];
  const firedAt = values.flatMap((value, index) => updateTriggerState(value) ? [index] : []);
  assert.deepEqual(firedAt, [3, 10]);
});

test("a missing reading does not rearm a held trigger", () => {
  const { updateTriggerState } = createTriggerGate();
  assert.equal(updateTriggerState(0), false);
  assert.equal(updateTriggerState(1), true);
  assert.equal(updateTriggerState(undefined), false);
  assert.equal(updateTriggerState(NaN), false);
  assert.equal(updateTriggerState(1), false);
  assert.equal(updateTriggerState(0), false);
  assert.equal(updateTriggerState(1), true);
});

test("connecting with the trigger held does not count as a threshold crossing", () => {
  const { updateTriggerState } = createTriggerGate();
  assert.equal(updateTriggerState(1), false);
  assert.equal(updateTriggerState(0.85), false);
  assert.equal(updateTriggerState(0.69), false);
  assert.equal(updateTriggerState(0.85), true);
});

test("reset threshold must be below firing threshold", () => {
  assert.throws(() => createTriggerGate(0.8, 0.8), /below fire threshold/);
});
