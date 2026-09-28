import { useMemo, useRef, useState } from "react";
import { createPortal, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  DefaultXRController,
  XRSpace,
  useXRInputSourceEvent,
  useXRInputSourceStateContext,
} from "@react-three/xr";
import { Raycaster } from "three";
import { shoot } from "../shooting/shoot";
import { DebugShotRay } from "../shooting/DebugShotRay";

const MODEL_URL = `${import.meta.env.BASE_URL}assets/models/weapons/desert_eagle.glb`;
// Fixed grip-coordinate correction for the observed ~90° upward barrel tilt.
// User-adjustable weapon calibration will be a separate child transform.
const XR_GRIP_CORRECTION = [-Math.PI / 2, 0, 0];

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

  useXRInputSourceEvent(controller.inputSource, "select", () => {
    if (!grip.current?.visible) return;
    setShot(shoot(muzzle, aim, scene, raycaster));
  }, [muzzle, aim, scene, raycaster]);

  return (
    <>
      <DefaultXRController rayPointer={{ rayModel: false }} />
      <XRSpace space="grip-space" ref={grip}>
        <group name="XRGripCorrection" rotation={XR_GRIP_CORRECTION} pointerEvents="none">
          <group name="WeaponCalibration">
            <primitive object={weapon} />
          </group>
        </group>
      </XRSpace>
      {createPortal(<DebugShotRay shot={shot} />, scene)}
    </>
  );
}
