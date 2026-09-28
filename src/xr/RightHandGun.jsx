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
    if (instance.getObjectByName("Muzzle_Point") == null) {
      throw new Error("Desert Eagle GLB is missing Muzzle_Point");
    }
    return instance;
  }, [gltfScene]);
  const muzzle = weapon.getObjectByName("Muzzle_Point");
  const [raycaster] = useState(() => new Raycaster());
  const [shot, setShot] = useState(null);

  useXRInputSourceEvent(controller.inputSource, "select", () => {
    if (!grip.current?.visible) return;
    setShot(shoot(muzzle, scene, raycaster));
  }, [muzzle, scene, raycaster]);

  return (
    <>
      <DefaultXRController rayPointer={{ rayModel: false }} />
      <XRSpace space="grip-space" ref={grip}>
        <group name="WeaponAttachment" pointerEvents="none">
          <primitive object={weapon} />
        </group>
      </XRSpace>
      {createPortal(<DebugShotRay shot={shot} />, scene)}
    </>
  );
}
