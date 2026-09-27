import { Quaternion, Raycaster, Vector3 } from "three";

// The barrel and MuzzlePoint point along local -Z. Change weapon alignment here.
export const LOCAL_FORWARD = new Vector3(0, 0, -1);
export const SHOT_RANGE = 10;

// Only objects exposing onShotHit participate; UI/controller/debug meshes do not.
// A caller can reuse its own Raycaster without sharing weapon state globally.
export function shoot(muzzle, scene, raycaster = new Raycaster()) {
  muzzle.updateWorldMatrix(true, false);
  const origin = muzzle.getWorldPosition(new Vector3());
  const orientation = muzzle.getWorldQuaternion(new Quaternion());
  const direction = LOCAL_FORWARD.clone().applyQuaternion(orientation).normalize();

  const targets = [];
  scene.updateMatrixWorld(true);
  scene.traverseVisible((object) => {
    if (typeof object.userData.onShotHit === "function") {
      targets.push(object);
    }
  });

  raycaster.near = 0;
  raycaster.far = SHOT_RANGE;
  raycaster.set(origin, direction);
  const hit = raycaster.intersectObjects(targets, false)[0] ?? null;
  hit?.object.userData.onShotHit(hit);

  return {
    origin,
    direction,
    end: origin.clone().addScaledVector(direction, SHOT_RANGE),
    hit,
  };
}
