import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  DefaultXRController,
  XRSpace,
  useXRInputSourceEvent,
  useXRInputSourceStateContext,
} from "@react-three/xr";
import { MathUtils, Raycaster } from "three";
import { shoot } from "../shooting/shoot";
import { ShotEffects } from "../shooting/ShotEffects";
import { pulseController } from "../shooting/haptics";
import { createTriggerGate } from "../shooting/trigger";
import { playGunshot } from "../shooting/gunshotAudio";

const MODEL_URL = `${import.meta.env.BASE_URL}assets/models/weapons/desert_eagle.glb`;
// Fixed grip-coordinate correction for the observed ~90° upward barrel tilt.
// User-adjustable weapon calibration will be a separate child transform.
const XR_GRIP_CORRECTION = [-Math.PI / 2, 0, 0];
// Developer-defined neutral handgun stance; user calibration stays zero-centered.
const DEFAULT_WEAPON_POSE_DEG = { pitch: 25, yaw: 0, roll: 0 };
const DEFAULT_WEAPON_ROTATION = [
  MathUtils.degToRad(DEFAULT_WEAPON_POSE_DEG.pitch),
  MathUtils.degToRad(DEFAULT_WEAPON_POSE_DEG.yaw),
  MathUtils.degToRad(DEFAULT_WEAPON_POSE_DEG.roll),
];

// Mounted only for the right controller by the XR store. Shooting stays neutral.
export function RightHandGun() {
  const controller = useXRInputSourceStateContext("controller");
  const scene = useThree((state) => state.scene);
  const grip = useRef(null);
  const { scene: gltfScene } = useGLTF(MODEL_URL);
  const weapon = useMemo(() => {
    const sourceRoot = gltfScene.getObjectByName("Gun_Root");
    if (sourceRoot == null) throw new Error("Desert Eagle GLB is missing Gun_Root");
    const instance = sourceRoot.clone(true);
    for (const name of ["Muzzle_Point", "Aim_Point", "Rear_Point"]) {
      if (instance.getObjectByName(name) == null) {
        throw new Error(`Desert Eagle GLB is missing ${name}`);
      }
    }
    return instance;
  }, [gltfScene]);
  const muzzle = weapon.getObjectByName("Muzzle_Point");
  const aim = weapon.getObjectByName("Aim_Point");
  const [raycaster] = useState(() => new Raycaster());
  const [shot, setShot] = useState(null);
  const triggerGate = useMemo(() => createTriggerGate(), []);
  const digitalPressed = useRef(false);
  const shotId = useRef(0);

  const fireWeapon = useCallback(() => {
    if (!grip.current?.visible) return;
    const firedShot = shoot(muzzle, aim, scene, raycaster);
    setShot({ ...firedShot, id: ++shotId.current });
    playGunshot();
    pulseController(controller.inputSource);
  }, [muzzle, aim, scene, raycaster, controller.inputSource]);

  // Use select events only when a controller does not expose an analog trigger.
  useXRInputSourceEvent(controller.inputSource, "selectstart", () => {
    digitalPressed.current = true;
  }, []);
  useXRInputSourceEvent(controller.inputSource, "selectend", () => {
    digitalPressed.current = false;
  }, []);

  useFrame(() => {
    const analog = controller.gamepad?.[controller.layout?.selectComponentId]?.button;
    const value = Number.isFinite(analog) ? analog : Number(digitalPressed.current);
    if (triggerGate.updateTriggerState(value)) fireWeapon();
  });

  return (
    <>
      <DefaultXRController model={false} grabPointer={false} rayPointer={{ rayModel: false }} />
      <XRSpace space="grip-space" ref={grip}>
        <group name="XRGripCorrection" rotation={XR_GRIP_CORRECTION} pointerEvents="none">
          <group name="DefaultWeaponPose" rotation={DEFAULT_WEAPON_ROTATION}>
            <group name="WeaponCalibration">
              <primitive object={weapon} />
            </group>
          </group>
        </group>
      </XRSpace>
      {createPortal(<ShotEffects shot={shot} />, scene)}
    </>
  );
}
