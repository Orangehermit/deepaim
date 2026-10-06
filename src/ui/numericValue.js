// Snap relative to the lower bound, then remove decimal floating-point noise.
// Slider changes and both numeric controls' single-step clicks share this path.
export function snapNumericValue(value, min, max, step) {
  const clamped = Math.max(min, Math.min(max, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.max(min, Math.min(max, snapped)).toFixed(10));
}

export function formatSignedNumericValue(value, unit) {
  // Round before checking the sign so zero never displays as +0.0 or -0.0.
  const rounded = Number(value.toFixed(1));
  const number = `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
  const suffix = unit ? `${unit === "°" ? "" : " "}${unit}` : "";
  return `${number}${suffix}`;
}
