export const ACTIVE_GUN = Object.freeze({
  id: 'colt_python',
  displayName: 'Colt Python',
  modelUrl: './assets/models/colt_python_357.glb',
  // 一時的に内部識別名を "bolt_byson" に変えたことがあるため、その名義で
  // 保存された較正値があれば現在のIDへ統合する。
  legacyIds: ['bolt_byson'],
});
