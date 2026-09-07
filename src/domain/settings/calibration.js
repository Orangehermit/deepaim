export function defaultOffsets() {
  return { pitch: 0, yaw: 0, roll: 0, offsetX: 0, offsetY: 0, offsetZ: 0 };
}

export function adjustedGunParamValue(currentValue, param, direction) {
  const stepInStorageUnits = param.storageScale
    ? param.step * param.storageScale
    : param.step;
  let next = currentValue + direction * stepInStorageUnits;

  // min/max は表示単位(°やmm)で定義されるため、格納単位に変換してクランプする。
  if (param.min !== undefined) {
    const minStorage = param.storageScale ? param.min * param.storageScale : param.min;
    next = Math.max(minStorage, next);
  }
  if (param.max !== undefined) {
    const maxStorage = param.storageScale ? param.max * param.storageScale : param.max;
    next = Math.min(maxStorage, next);
  }

  return Math.round(next * 10000) / 10000;
}
