import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  XRSpace,
  useXRInputSourceEvent,
  useXRInputSourceStateContext,
} from "@react-three/xr";
import { MathUtils, Raycaster } from "three";
import { shoot } from "../shooting/shoot";
import { ShotEffects } from "../shooting/ShotEffects";
import { WEAPON_POSE_DEG } from "../shooting/shootingConfig.js";
import { pulseController } from "../shooting/haptics";
import { createTriggerGate } from "../shooting/trigger";
import { playGunshot } from "../shooting/gunshotAudio";
import { useAppStore, selectRuntimeWeaponSettings } from "../store/useAppStore";
import { applyWeaponCalibration } from "./weaponCalibration.js";
import { GunUIPointer } from "../ui/GunUIPointer";

const MODEL_URL = `${import.meta.env.BASE_URL}assets/models/weapons/desert_eagle.glb`;
// Fixed grip-coordinate correction for the observed ~90° upward barrel tilt.
// User-adjustable weapon calibration uses a separate child transform.
const XR_GRIP_CORRECTION = [-Math.PI / 2, 0, 0];
// Developer-defined neutral handgun stance; user calibration stays zero-centered.
const DEFAULT_WEAPON_ROTATION = [
  MathUtils.degToRad(WEAPON_POSE_DEG.pitch),
  MathUtils.degToRad(WEAPON_POSE_DEG.yaw),
  MathUtils.degToRad(WEAPON_POSE_DEG.roll),
];

const readAnalogTrigger = (controller) =>
  controller.gamepad?.[controller.layout?.selectComponentId]?.button;

// The pointer reads this before targeting, including a B/Y change in this frame.
const isMenuOpen = () => useAppStore.getState().menuOpen;

// Mounted only for the right controller by the XR store. Shooting stays neutral.
export function RightHandGun() {
  const controller = useXRInputSourceStateContext("controller");
  const scene = useThree((state) => state.scene);
  const grip = useRef(null);
  const calibration = useRef(null);
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
    if (useAppStore.getState().menuOpen || !grip.current?.visible) return;
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
    if (calibration.current == null) return;
    applyWeaponCalibration(calibration.current, selectRuntimeWeaponSettings(useAppStore.getState()));
    // B/Y is sampled at -100. Apply or roll back before gun UI targeting (-60)
    // and shooting (0), including a menu-close change in this same XR frame.
  }, -70);

  useFrame(() => {
    // Read synchronously: B/Y can open the menu earlier in this same frame.
    if (useAppStore.getState().menuOpen) {
      triggerGate.reset();
      return;
    }
    const analog = readAnalogTrigger(controller);
    const value = Number.isFinite(analog) ? analog : Number(digitalPressed.current);
    if (triggerGate.updateTriggerState(value)) fireWeapon();
  });

  return (
    <>
      <GunUIPointer
        enabled={isMenuOpen}
        inputSource={controller.inputSource}
        events={controller.events}
        muzzle={muzzle}
        aim={aim}
      />
      <XRSpace space="grip-space" ref={grip}>
        <group name="XRGripCorrection" rotation={XR_GRIP_CORRECTION} pointerEvents="none">
          <group name="DefaultWeaponPose" rotation={DEFAULT_WEAPON_ROTATION}>
            <group ref={calibration} name="WeaponCalibration">
              <primitive object={weapon} />
            </group>
          </group>
        </group>
      </XRSpace>
      {createPortal(<ShotEffects shot={shot} muzzle={muzzle} />, scene)}
    </>
  );
}
