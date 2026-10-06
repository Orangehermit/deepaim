import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Scene, Vector3 } from "three";
import { createRayPointer } from "@pmndrs/pointer-events";
import { updateGunPointerSpace } from "./gunPointer.js";
import { UI_POINTER_MAX_DISTANCE, UI_POINTER_TYPE } from "./uiConfig.js";
import { shoot } from "../shooting/shoot.js";

function weapon() {
  const scene = new Scene();
  const grip = new Group();
  grip.position.set(1.2, 1.4, -0.7);
  grip.rotation.set(0.5, -0.8, 0.3);
  scene.add(grip);
  const pose = new Group();
  pose.rotation.set(-Math.PI / 2 + 0.45, 0.1, -0.2);
  pose.scale.setScalar(0.8);
  grip.add(pose);
  const muzzle = new Object3D();
  muzzle.position.set(0.1, 0.02, -0.2);
  const aim = new Object3D();
  aim.position.set(0.04, 0.2, -0.9);
  pose.add(muzzle, aim);
  return { scene, grip, muzzle, aim };
}

function sameVector(actual, expected) {
  assert.ok(actual.distanceTo(expected) < 1e-9, `${actual.toArray()} != ${expected.toArray()}`);
}

test("muzzle ray matches shooting after grip correction, pose, scaling, and helper offsets", () => {
  const { scene, grip, muzzle, aim } = weapon();
  const space = new Object3D();
  const direction = new Vector3();
  assert.equal(updateGunPointerSpace(muzzle, aim, space, direction), true);
  const shot = shoot(muzzle, aim, scene);
  sameVector(space.position, shot.origin);
  sameVector(direction, shot.direction);
  sameVector(new Vector3(0, 0, -1).applyQuaternion(space.quaternion), shot.direction);
  assert.ok(direction.distanceTo(new Vector3(0, 0, -1).applyQuaternion(grip.quaternion)) > 0.1);
});

test("moving the weapon updates the muzzle ray without depending on a render pass", () => {
  const { scene, grip, muzzle, aim } = weapon();
  const space = new Object3D();
  const direction = new Vector3();
  updateGunPointerSpace(muzzle, aim, space, direction);
  grip.position.set(-1, 0.8, 2);
  grip.rotation.set(-0.4, 1.7, 0.2);
  aim.position.x += 0.2;
  updateGunPointerSpace(muzzle, aim, space, direction);
  const shot = shoot(muzzle, aim, scene);
  sameVector(space.position, shot.origin);
  sameVector(direction, shot.direction);
});

test("missing, hidden, untracked, or overlapping helpers cannot enable a pointer", () => {
  const { grip, muzzle, aim } = weapon();
  const space = new Object3D();
  const direction = new Vector3();
  assert.equal(updateGunPointerSpace(null, aim, space, direction), false);
  grip.visible = false;
  assert.equal(updateGunPointerSpace(muzzle, aim, space, direction), false);
  grip.visible = true;
  grip.transformReady = false;
  assert.equal(updateGunPointerSpace(muzzle, aim, space, direction), false);
  grip.transformReady = true;
  aim.position.copy(muzzle.position);
  assert.equal(updateGunPointerSpace(muzzle, aim, space, direction), false);
});

test("real pointer hit tests use the muzzle line and stop at the configured laser range", () => {
  const { scene, muzzle, aim } = weapon();
  const space = new Object3D();
  const direction = new Vector3();
  updateGunPointerSpace(muzzle, aim, space, direction);
  const target = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshBasicMaterial());
  target.pointerEvents = "auto";
  target.pointerEventsType = { allow: UI_POINTER_TYPE };
  target.position.copy(space.position).addScaledVector(direction, 1);
  scene.add(target);
  scene.updateMatrixWorld(true);
  const pointer = createRayPointer(() => new Object3D(), { current: space }, {}, { minDistance: 0 }, UI_POINTER_TYPE);
  pointer.intersector.raycaster.far = UI_POINTER_MAX_DISTANCE;
  pointer.move(scene, { timeStamp: 1 });
  assert.equal(pointer.getIntersection().object, target);
  sameVector(pointer.intersector.raycaster.ray.origin, space.position);
  sameVector(pointer.intersector.raycaster.ray.direction, direction);

  target.position.copy(space.position).addScaledVector(direction, UI_POINTER_MAX_DISTANCE + 1);
  scene.updateMatrixWorld(true);
  pointer.move(scene, { timeStamp: 2 });
  assert.equal(pointer.getIntersection().object.isVoidObject, true);
  target.geometry.dispose();
  target.material.dispose();
  pointer.exit({ timeStamp: 3 });
});

test("Settings accepts gun-ui pointers and rejects standard controller rays", () => {
  const { scene, muzzle, aim } = weapon();
  const space = new Object3D();
  const direction = new Vector3();
  updateGunPointerSpace(muzzle, aim, space, direction);
  const target = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshBasicMaterial());
  target.pointerEvents = "auto";
  target.pointerEventsType = { allow: UI_POINTER_TYPE };
  target.position.copy(space.position).addScaledVector(direction, 1);
  scene.add(target);
  scene.updateMatrixWorld(true);
  const standard = createRayPointer(() => new Object3D(), { current: space }, {}, {}, "ray");
  standard.move(scene, { timeStamp: 1 });
  assert.equal(standard.getIntersection().object.isVoidObject, true);
  target.geometry.dispose();
  target.material.dispose();
  standard.exit({ timeStamp: 2 });
});
