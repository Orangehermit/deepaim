import { Vector3 } from "three";

const RAY_FORWARD = new Vector3(0, 0, -1);

function isTrackedAndVisible(object) {
  for (let current = object; current != null; current = current.parent) {
    if (!current.visible || current.transformReady === false) return false;
  }
  return object != null;
}

// space is a detached world-space Object3D, independent of either controller's axes.
// Reuse the caller's direction vector; no per-frame math objects are allocated here.
export function updateGunPointerSpace(muzzle, aim, space, direction) {
  if (!isTrackedAndVisible(muzzle) || !isTrackedAndVisible(aim)) return false;
  muzzle.getWorldPosition(space.position);
  aim.getWorldPosition(direction);
  direction.sub(space.position);
  if (direction.lengthSq() === 0) return false;
  direction.normalize();
  space.quaternion.setFromUnitVectors(RAY_FORWARD, direction);
  space.updateMatrixWorld(true);
  return true;
}
