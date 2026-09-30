import assert from "node:assert/strict";
import test from "node:test";
import { createTriggerGate } from "./trigger.js";
import { TRIGGER_FIRE_THRESHOLD, TRIGGER_RESET_THRESHOLD } from "./shootingConfig.js";

const belowReset = TRIGGER_RESET_THRESHOLD / 2;
const betweenThresholds = (TRIGGER_RESET_THRESHOLD + TRIGGER_FIRE_THRESHOLD) / 2;

test("fires once on an upward threshold crossing and rearms below reset", () => {
  const { updateTriggerState } = createTriggerGate();
  const values = [
    belowReset,
    betweenThresholds,
    TRIGGER_FIRE_THRESHOLD,
    1,
    TRIGGER_RESET_THRESHOLD,
    betweenThresholds,
    TRIGGER_FIRE_THRESHOLD,
    belowReset,
    TRIGGER_FIRE_THRESHOLD,
  ];
  const firedAt = values.flatMap((value, index) => updateTriggerState(value) ? [index] : []);
  assert.deepEqual(firedAt, [2, 8]);
});

test("a missing reading does not rearm a held trigger", () => {
  const { updateTriggerState } = createTriggerGate();
  assert.equal(updateTriggerState(belowReset), false);
  assert.equal(updateTriggerState(TRIGGER_FIRE_THRESHOLD), true);
  assert.equal(updateTriggerState(undefined), false);
  assert.equal(updateTriggerState(NaN), false);
  assert.equal(updateTriggerState(TRIGGER_FIRE_THRESHOLD), false);
  assert.equal(updateTriggerState(belowReset), false);
  assert.equal(updateTriggerState(TRIGGER_FIRE_THRESHOLD), true);
});

test("connecting with the trigger held does not count as a threshold crossing", () => {
  const { updateTriggerState } = createTriggerGate();
  assert.equal(updateTriggerState(TRIGGER_FIRE_THRESHOLD), false);
  assert.equal(updateTriggerState(1), false);
  assert.equal(updateTriggerState(betweenThresholds), false);
  assert.equal(updateTriggerState(belowReset), false);
  assert.equal(updateTriggerState(TRIGGER_FIRE_THRESHOLD), true);
});

test("reset threshold must be below firing threshold", () => {
  assert.throws(() => createTriggerGate(TRIGGER_FIRE_THRESHOLD, TRIGGER_FIRE_THRESHOLD), /below fire threshold/);
});
