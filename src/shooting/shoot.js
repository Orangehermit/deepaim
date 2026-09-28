import { Raycaster, Vector3 } from "three";

export const SHOT_RANGE = 10;

// Only objects exposing onShotHit participate; UI/controller/debug meshes do not.
// A caller can reuse its own Raycaster without sharing weapon state globally.
export function shoot(muzzle, aim, scene, raycaster = new Raycaster()) {
  muzzle.updateWorldMatrix(true, false);
  aim.updateWorldMatrix(true, false);
  const origin = muzzle.getWorldPosition(new Vector3());
  const direction = aim.getWorldPosition(new Vector3()).sub(origin);
  if (direction.lengthSq() === 0) {
    throw new Error("Muzzle_Point and Aim_Point must not overlap");
  }
  direction.normalize();

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
