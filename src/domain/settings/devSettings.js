export function defaultDevSettings() {
  return { bulletSpeed: 25, gunScale: 1.0 };
}

export function adjustedDevSettingValue(currentValue, param, direction) {
  let next = currentValue + direction * param.step;
  if (param.min !== undefined) next = Math.max(param.min, next);
  if (param.max !== undefined) next = Math.min(param.max, next);
  return Math.round(next * 100) / 100;
}
