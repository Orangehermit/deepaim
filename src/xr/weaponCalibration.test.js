import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Group, MathUtils, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createInitialWeaponSettings } from "../userSetting/userSettingConfig.js";
import { WEAPON_POSE_DEG } from "../shooting/shootingConfig.js";
import { shoot } from "../shooting/shoot.js";
import { updateGunPointerSpace } from "../ui/gunPointer.js";
import { applyWeaponCalibration } from "./weaponCalibration.js";

test("real GLB calibration moves helpers, preserves baseline layers, and keeps pointer/shooting aligned", async () => {
  const data = readFileSync("public/assets/models/weapons/desert_eagle.glb");
  const { scene } = await new GLTFLoader().parseAsync(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "",
  );
  const gun = scene.getObjectByName("Gun_Root").clone(true);
  const grip = new Group(), correction = new Group(), baseline = new Group(), calibration = new Group();
  grip.position.set(0.3, 1.4, -0.2);
  correction.rotation.x = -Math.PI / 2;
  baseline.rotation.set(...[WEAPON_POSE_DEG.pitch, WEAPON_POSE_DEG.yaw, WEAPON_POSE_DEG.roll].map(MathUtils.degToRad));
  grip.add(correction); correction.add(baseline); baseline.add(calibration); calibration.add(gun);
  grip.updateMatrixWorld(true);
  const fixedMatrices = [correction, baseline, gun].map((object) => object.matrix.clone());
  const muzzle = gun.getObjectByName("Muzzle_Point"), aim = gun.getObjectByName("Aim_Point");
  const direction = () => aim.getWorldPosition(new Vector3()).sub(muzzle.getWorldPosition(new Vector3())).normalize();
  const before = direction();
  const initial = createInitialWeaponSettings();
  applyWeaponCalibration(calibration, { ...initial, pitch: 2 });
  assert.ok(direction().y > before.y, "positive pitch raises the actual barrel with the existing baseline");
  applyWeaponCalibration(calibration, { ...initial, yaw: 2 });
  assert.ok(direction().x < before.x, "positive yaw turns the barrel left");
  applyWeaponCalibration(calibration, { ...initial, roll: 2 });
  const localTop = new Vector3(0, 1, 0).applyQuaternion(calibration.quaternion);
  assert.ok(localTop.x < 0, "positive roll tilts the local top left");

  const settings = { pitch: 12, yaw: -7, roll: 9, xOffset: 1.5, yOffset: -2, zOffset: 2.5 };
  applyWeaponCalibration(calibration, settings);
  assert.deepEqual(calibration.position.toArray(), [0.015, -0.02, 0.025]);
  assert.deepEqual(calibration.rotation.toArray(), [
    MathUtils.degToRad(12), MathUtils.degToRad(-7), MathUtils.degToRad(9), "XYZ",
  ]);
  grip.updateMatrixWorld(true);
  [correction, baseline, gun].forEach((object, index) => assert.ok(object.matrix.equals(fixedMatrices[index])));
  assert.deepEqual(gun.scale.toArray(), [1, 1, 1]);

  const pointerSpace = new Group();
  assert.equal(updateGunPointerSpace(muzzle, aim, pointerSpace, new Vector3()), true);
  const shot = shoot(muzzle, aim, grip);
  assert.ok(pointerSpace.getWorldPosition(new Vector3()).distanceTo(shot.origin) < 1e-9);
  const pointerDirection = new Vector3(0, 0, -1).applyQuaternion(pointerSpace.getWorldQuaternion(new Quaternion()));
  assert.ok(pointerDirection.distanceTo(shot.direction) < 1e-9);
  const savedOrigin = shot.origin.clone(), savedDirection = shot.direction.clone();
  applyWeaponCalibration(calibration, initial);
  assert.ok(shot.origin.equals(savedOrigin) && shot.direction.equals(savedDirection), "effects keep the shot snapshot");
  assert.ok(direction().distanceTo(before) < 1e-9, "zero calibration restores the developer baseline");
});
