export function defaultDevSettings() {
  return {
    settingsVersion: 3,
    bulletSpeed: 55,
    gunScale: 1.0,
    turnSpeed: 90,
    laserSightEnabled: false,
    tracerEnabled: true,
    tracerLength: 10,
    tracerLingerMs: 150,
  };
}

export function adjustedDevSettingValue(currentValue, param, direction) {
  let next = currentValue + direction * param.step;
  if (param.min !== undefined) next = Math.max(param.min, next);
  if (param.max !== undefined) next = Math.min(param.max, next);
  return Math.round(next * 100) / 100;
}
