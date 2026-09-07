const assetUrl = (filename) => new URL(`../../assets/models/${filename}`, import.meta.url).href;

export const GUNS = Object.freeze({
  desert_eagle: Object.freeze({
    id: 'desert_eagle',
    displayName: 'Desert Eagle',
    selectionName: 'DUNE FALCON',
    modelUrl: assetUrl('desert_eagle_black.glb'),
    capacity: 16,
    ammoDisplayOffset: Object.freeze({ x: 0, y: 0.055, z: 0.10 }),
    selectionDisplayTransform: Object.freeze({
      position: Object.freeze({ x: 0.05, y: -0.08, z: 0.4 }),
      rotation: Object.freeze({
        x: 0,
        y: 0, // Gun_Rootのローカル-Z、すなわちTraining Room（ワールド-Z）側へ
        z: Math.PI / 2, // 銃を横倒しにする回転
      }),
    }),
    legacyIds: [],
  }),
  colt_python: Object.freeze({
    id: 'colt_python',
    displayName: 'Colt Python',
    selectionName: 'BOLT BYSON',
    modelUrl: assetUrl('colt_python_357.glb'),
    capacity: 6,
    ammoDisplayOffset: Object.freeze({ x: 0, y: 0.055, z: 0.05 }),
    selectionDisplayTransform: Object.freeze({
      position: Object.freeze({ x: 0.05, y: -0.085, z: 0.4 }),
      rotation: Object.freeze({
        x: 0,
        y: 0, // Gun_Rootのローカル-Z、すなわちTraining Room（ワールド-Z）側へ
        z: Math.PI / 2, // 銃を横倒しにする回転
      }),
    }),
    // 一時的に内部識別名を "bolt_byson" に変えたことがあるため、その名義で
    // 保存された較正値があれば現在のIDへ統合する。
    legacyIds: ['bolt_byson'],
  }),
});

// 既存index.htmlの較正画面は引き続きColt Pythonを対象とする。
export const ACTIVE_GUN = GUNS.colt_python;
export const ENTRANCE_DEFAULT_GUN = GUNS.desert_eagle;
