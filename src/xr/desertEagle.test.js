import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

test("Desert Eagle GLB loads with intact helper points and barrel alignment", async () => {
  const data = readFileSync("public/assets/models/weapons/desert_eagle.glb");
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const { scene } = await new GLTFLoader().parseAsync(buffer, "");
  const root = scene.getObjectByName("Gun_Root");
  const muzzle = root?.getObjectByName("Muzzle_Point");
  const rear = root?.getObjectByName("Rear_Point");
  const aim = root?.getObjectByName("Aim_Point");

  assert.ok(root && muzzle && rear && aim);
  root.updateWorldMatrix(true, true);
  const muzzlePosition = muzzle.getWorldPosition(new Vector3());
  const rearPosition = rear.getWorldPosition(new Vector3());
  const aimPosition = aim.getWorldPosition(new Vector3());
  const ballisticDirection = aimPosition.clone().sub(muzzlePosition).normalize();
  const barrelDirection = aimPosition.clone().sub(rearPosition).normalize();
  assert.ok(barrelDirection.dot(ballisticDirection) > 0.999);
  assert.ok(ballisticDirection.dot(new Vector3(0, 0, -1)) > 0.999);

  const bounds = new Box3().setFromObject(root);
  assert.ok(Math.abs(muzzlePosition.z - bounds.min.z) < 0.002);
  assert.deepEqual(root.scale.toArray(), [1, 1, 1]);
});
