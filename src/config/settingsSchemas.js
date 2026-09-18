export const GUN_PARAMS = [
  { key: 'pitch',   label: 'Pitch',    unit: '°',  step: 0.5, min: -30,  max: 30 },
  { key: 'yaw',     label: 'Yaw',      unit: '°',  step: 0.5, min: -30,  max: 30 },
  { key: 'roll',    label: 'Roll',     unit: '°',  step: 0.5, min: -30,  max: 30 },
  { key: 'offsetX', label: 'Offset X', unit: 'mm', step: 1, storageScale: 0.001, min: -100, max: 100 },
  { key: 'offsetY', label: 'Offset Y', unit: 'mm', step: 1, storageScale: 0.001, min: -100, max: 100 },
  { key: 'offsetZ', label: 'Offset Z', unit: 'mm', step: 1, storageScale: 0.001, min: -100, max: 100 },
];

export const DEV_PARAMS = [
  { key: 'gunScale',    label: 'Gun Scale',    unit: '×',   step: 0.02, min: 0.8, max: 1.5 },
  { key: 'turnSpeed',   label: 'Turn Speed',   unit: '°/s', step: 15, min: 30, max: 180 },
];

export const DEV_TOGGLES = [
  { key: 'laserSightEnabled', label: 'Laser Sight' },
  { key: 'tracerEnabled', label: 'Tracer' },
];
