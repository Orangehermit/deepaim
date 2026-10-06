// Quest's xr-standard secondary face button is B (right) / Y (left).
// Track each source independently so either hand can act while the other holds B/Y.
export function createMenuButtonTracker() {
  let previous = new Map();
  return {
    reset() {
      previous.clear();
    },
    update(inputSources) {
      const current = new Map();
      let menuPressed = false;
      for (const source of inputSources) {
        if (
          (source.handedness !== "right" && source.handedness !== "left") ||
          source.gamepad?.mapping !== "xr-standard"
        ) continue;

        const pressed = source.gamepad.buttons[5]?.pressed === true;
        current.set(source, pressed);
        if (pressed && previous.get(source) !== true) menuPressed = true;
      }
      // Dropping disconnected sources prevents stale button states on reconnect.
      previous = current;
      return menuPressed;
    },
  };
}
