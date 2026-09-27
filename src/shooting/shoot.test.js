import assert from "node:assert/strict";
import test from "node:test";
import { Group, Mesh, MeshBasicMaterial, Object3D, Raycaster, Scene, SphereGeometry, Vector3 } from "three";
import { shoot, SHOT_RANGE } from "./shoot.js";

function target(scene, position, onHit) {
  const mesh = new Mesh(new SphereGeometry(0.2), new MeshBasicMaterial());
  mesh.position.copy(position);
  mesh.userData.onShotHit = onHit;
  scene.add(mesh);
  return mesh;
}

function assertVector(actual, expected) {
  assert.ok(actual.distanceTo(expected) < 1e-6, `${actual.toArray()} != ${expected.toArray()}`);
}

test("uses the muzzle's full parent transform and orientation, not a controller ray", () => {
  const scene = new Scene();
  const gun = new Group();
  gun.position.set(1, 1.5, 2);
  gun.rotation.y = Math.PI / 2;
  const muzzle = new Object3D();
  muzzle.position.z = -0.24;
  gun.add(muzzle);
  scene.add(gun);
  let hits = 0;
  const expectedTarget = target(scene, new Vector3(-2, 1.5, 2), () => hits++);

  // No manual updateMatrixWorld: firing must update transforms itself.
  const shot = shoot(muzzle, scene);
  assertVector(shot.origin, new Vector3(0.76, 1.5, 2));
  assertVector(shot.direction, new Vector3(-1, 0, 0));
  assert.equal(shot.hit.object, expectedTarget);
  assert.equal(hits, 1);
  assert.ok(Math.abs(shot.origin.distanceTo(shot.end) - SHOT_RANGE) < 1e-6);
});

test("only the nearest eligible visible target receives one hit", () => {
  const scene = new Scene();
  const muzzle = new Object3D();
  scene.add(muzzle);
  const hits = [];
  target(scene, new Vector3(0, 0, -5), () => hits.push("far"));
  const near = target(scene, new Vector3(0, 0, -3), () => hits.push("near"));
  const hidden = new Group();
  hidden.visible = false;
  scene.add(hidden);
  hidden.add(target(scene, new Vector3(0, 0, -1), () => hits.push("hidden")));
  const decoration = new Mesh(new SphereGeometry(0.2), new MeshBasicMaterial());
  decoration.position.z = -2;
  scene.add(decoration);

  const shot = shoot(muzzle, scene);
  assert.equal(shot.hit.object, near);
  assert.deepEqual(hits, ["near"]);
});

test("an independently rotated muzzle sets the firing direction", () => {
  const scene = new Scene();
  const gun = new Group();
  gun.position.set(1, 1.5, 2);
  gun.rotation.y = Math.PI / 2;
  const muzzle = new Object3D();
  muzzle.position.z = -0.24;
  muzzle.rotation.y = -Math.PI / 2;
  gun.add(muzzle);
  scene.add(gun);
  const expectedTarget = target(scene, new Vector3(0.76, 1.5, -1), () => {});

  const shot = shoot(muzzle, scene);
  assertVector(shot.direction, new Vector3(0, 0, -1));
  assert.equal(shot.hit.object, expectedTarget);
});

test("a miss and targets beyond the shot range do not trigger hit callbacks", () => {
  const scene = new Scene();
  const muzzle = new Object3D();
  scene.add(muzzle);
  let hits = 0;
  target(scene, new Vector3(0, 0, -(SHOT_RANGE + 1)), () => hits++);
  target(scene, new Vector3(2, 0, -3), () => hits++);
  const shot = shoot(muzzle, scene);
  assert.equal(shot.hit, null);
  assert.equal(hits, 0);
  assertVector(shot.end, new Vector3(0, 0, -SHOT_RANGE));
});

test("separate weapons and repeated shots preserve previous debug snapshots", () => {
  const scene = new Scene();
  const muzzleA = new Object3D();
  const muzzleB = new Object3D();
  muzzleB.position.x = 1;
  muzzleB.rotation.y = Math.PI / 2;
  scene.add(muzzleA, muzzleB);
  const raycasterA = new Raycaster();
  const raycasterB = new Raycaster();
  const first = shoot(muzzleA, scene, raycasterA);
  const second = shoot(muzzleB, scene, raycasterB);
  muzzleA.position.z = -2;
  shoot(muzzleA, scene, raycasterA);

  assertVector(first.origin, new Vector3(0, 0, 0));
  assertVector(first.end, new Vector3(0, 0, -SHOT_RANGE));
  assertVector(second.origin, new Vector3(1, 0, 0));
  assertVector(second.direction, new Vector3(-1, 0, 0));
});
