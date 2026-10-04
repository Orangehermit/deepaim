import assert from "node:assert/strict";
import test from "node:test";
import { snapNumericValue } from "./numericValue.js";

test("pose and cm offsets snap both signs to half-unit steps", () => {
  for (const [min, max] of [[-90, 90], [-10, 10]]) {
    assert.equal(snapNumericValue(3.24, min, max, 0.5), 3);
    assert.equal(snapNumericValue(3.26, min, max, 0.5), 3.5);
    assert.equal(snapNumericValue(-3.26, min, max, 0.5), -3.5);
    assert.equal(snapNumericValue(-3.24, min, max, 0.5), -3);
    assert.equal(snapNumericValue(-0.01, min, max, 0.5).toFixed(1), "0.0");
  }
});

test("slider overshoots and arrow steps stay inside both bounds", () => {
  for (const [min, max] of [[-90, 90], [-10, 10]]) {
    assert.equal(snapNumericValue(min - 0.5, min, max, 0.5), min);
    assert.equal(snapNumericValue(max + 0.5, min, max, 0.5), max);
    assert.equal(snapNumericValue(-1000, min, max, 0.5), min);
    assert.equal(snapNumericValue(1000, min, max, 0.5), max);
  }
});

test("repeated decimal steps have no accumulated noise", () => {
  let value = 0;
  for (let i = 0; i < 10; i++) value = snapNumericValue(value + 0.1, 0, 1, 0.1);
  assert.equal(value, 1);
  for (let i = 0; i < 10; i++) value = snapNumericValue(value - 0.1, 0, 1, 0.1);
  assert.equal(value, 0);
  assert.equal(snapNumericValue(0.1 + 0.2, 0, 1, 0.1), 0.3);
});

test("step grid starts at min, including a nonzero fractional lower bound", () => {
  assert.equal(snapNumericValue(0.16, 0.05, 0.95, 0.1), 0.15);
  assert.equal(snapNumericValue(0.25 + 0.1, 0.05, 0.95, 0.1), 0.35);
});
