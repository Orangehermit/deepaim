import assert from "node:assert/strict";
import test from "node:test";
import { createMenuButtonTracker } from "./menuInput.js";

const controller = (handedness) => ({
  handedness,
  gamepad: { mapping: "xr-standard", buttons: Array.from({ length: 6 }, () => ({ pressed: false })) },
});

for (const hand of ["right", "left"]) {
  test(`${hand} ${hand === "right" ? "B" : "Y"} alone toggles once per press, and A/X does not toggle`, () => {
    const source = controller(hand);
    const buttons = createMenuButtonTracker();
    assert.equal(buttons.update([source]), false);
    source.gamepad.buttons[4].pressed = true;
    assert.equal(buttons.update([source]), false);
    source.gamepad.buttons[5].pressed = true;
    assert.equal(buttons.update([source]), true);
    for (let frame = 0; frame < 120; frame++) assert.equal(buttons.update([source]), false);
    source.gamepad.buttons[5].pressed = false;
    assert.equal(buttons.update([source]), false);
    source.gamepad.buttons[5].pressed = true;
    assert.equal(buttons.update([source]), true);
  });
}

test("each hand detects its own edge; simultaneous B/Y produces one MENU action", () => {
  const right = controller("right");
  const left = controller("left");
  const buttons = createMenuButtonTracker();
  right.gamepad.buttons[5].pressed = true;
  left.gamepad.buttons[5].pressed = true;
  assert.equal(buttons.update([right, left]), true);
  assert.equal(buttons.update([right, left]), false);
  left.gamepad.buttons[5].pressed = false;
  assert.equal(buttons.update([right, left]), false);
  left.gamepad.buttons[5].pressed = true;
  assert.equal(buttons.update([right, left]), true);
});

test("missing buttons, unhanded input, and unknown mappings do not toggle", () => {
  const buttons = createMenuButtonTracker();
  const unknown = controller("right");
  unknown.gamepad.mapping = "";
  unknown.gamepad.buttons[5].pressed = true;
  const unhanded = controller("none");
  unhanded.gamepad.buttons[5].pressed = true;
  assert.equal(buttons.update([
    { handedness: "left" },
    { handedness: "right", gamepad: { mapping: "xr-standard", buttons: [] } },
    unknown,
    unhanded,
  ]), false);
});

test("disconnect and session reset clear the previous source state", () => {
  const source = controller("right");
  source.gamepad.buttons[5].pressed = true;
  const buttons = createMenuButtonTracker();
  assert.equal(buttons.update([source]), true);
  assert.equal(buttons.update([]), false);
  assert.equal(buttons.update([source]), true);
  buttons.reset();
  assert.equal(buttons.update([source]), true);
});
