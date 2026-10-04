// Snap relative to the lower bound, then remove decimal floating-point noise.
// Both slider changes and single-step clicks use this same path.
export function snapNumericValue(value, min, max, step) {
  const clamped = Math.max(min, Math.min(max, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.max(min, Math.min(max, snapped)).toFixed(10));
}
