import { useRef, useState } from "react";
import { createPortal, useThree } from "@react-three/fiber";
import {
  DefaultXRController,
  XRSpace,
  useXRInputSourceEvent,
  useXRInputSourceStateContext,
} from "@react-three/xr";
import { Raycaster } from "three";
import { shoot } from "../shooting/shoot";
import { DebugShotRay } from "../shooting/DebugShotRay";

// Mounted only for the right controller by the XR store. Shooting stays neutral.
export function RightHandGun() {
  const controller = useXRInputSourceStateContext("controller");
  const scene = useThree((state) => state.scene);
  const grip = useRef(null);
  const muzzle = useRef(null);
  const [raycaster] = useState(() => new Raycaster());
  const [shot, setShot] = useState(null);

  useXRInputSourceEvent(controller.inputSource, "select", () => {
    if (muzzle.current == null || !grip.current?.visible) return;
    setShot(shoot(muzzle.current, scene, raycaster));
  }, [scene, raycaster]);

  return (
    <>
      <DefaultXRController rayPointer={{ rayModel: false }} />
      <XRSpace space="grip-space" ref={grip}>
        <group name="GunRoot" pointerEvents="none">
          <mesh name="TemporaryGunMesh" position={[0, 0.035, -0.12]}>
            <boxGeometry args={[0.045, 0.055, 0.24]} />
            <meshBasicMaterial color="#334155" />
          </mesh>
          <mesh position={[0, -0.035, -0.025]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.04, 0.1, 0.055]} />
            <meshBasicMaterial color="#64748b" />
          </mesh>
          <group name="MuzzlePoint" ref={muzzle} position={[0, 0.035, -0.24]}>
            <mesh>
              <sphereGeometry args={[0.008, 12, 8]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
          </group>
        </group>
      </XRSpace>
      {createPortal(<DebugShotRay shot={shot} />, scene)}
    </>
  );
}
