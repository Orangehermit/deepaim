import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import {
  MUZZLE_FLASH_DURATION_MS,
  MUZZLE_FLASH_SCALE,
  MUZZLE_FLASH_SHRINK,
  TRACER_DURATION_MS,
  TRACER_LENGTH,
  TRACER_WIDTH,
} from "./shootingConfig.js";
import { SHOT_RANGE } from "./shoot.js";

const WORLD_UP = new Vector3(0, 1, 0);
const LOCAL_FORWARD = new Vector3(0, 0, -1);
const NO_RAYCAST = () => {};
const MUZZLE_FLASH_URL = `${import.meta.env.BASE_URL}assets/models/effects/mazzle_flash.glb`;

useGLTF.preload(MUZZLE_FLASH_URL);

function BulletTracer({ shot }) {
  const tracer = useRef(null);
  const startedAt = useRef(null);
  const distance = shot.hit?.distance ?? SHOT_RANGE;
  const length = Math.min(TRACER_LENGTH, distance);
  const orientation = useMemo(
    () => new Quaternion().setFromUnitVectors(WORLD_UP, shot.direction),
    [shot],
  );

  useFrame(({ clock }) => {
    if (tracer.current == null) return;
    if (startedAt.current == null) startedAt.current = clock.elapsedTime;
    const progress = (clock.elapsedTime - startedAt.current) * 1000 / TRACER_DURATION_MS;
    if (progress >= 1) {
      tracer.current.visible = false;
      return;
    }
    // The leading edge moves from the muzzle toward the hit/range endpoint.
    tracer.current.position.y = length / 2 + progress * (distance - length);
  });

  return (
    <group position={shot.origin} quaternion={orientation} pointerEvents="none">
      <mesh ref={tracer} position={[0, length / 2, 0]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[TRACER_WIDTH / 2, TRACER_WIDTH / 2, length, 6]} />
        <meshBasicMaterial color="white" transparent opacity={0.95} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function MuzzleFlash({ shot, muzzle, aim }) {
  const flash = useRef(null);
  const startedAt = useRef(null);
  const { scene } = useGLTF(MUZZLE_FLASH_URL);
  const model = useMemo(() => {
    const instance = scene.clone(true);
    instance.traverse((object) => {
      if (object.isMesh) object.raycast = NO_RAYCAST;
    });
    return instance;
  }, [scene]);

  useLayoutEffect(() => {
    if (shot == null || flash.current == null) return;
    muzzle.updateWorldMatrix(true, false);
    aim.updateWorldMatrix(true, false);
    const aimLocal = muzzle.worldToLocal(aim.getWorldPosition(new Vector3())).normalize();
    flash.current.quaternion.setFromUnitVectors(LOCAL_FORWARD, aimLocal);
    flash.current.scale.setScalar(MUZZLE_FLASH_SCALE);
    flash.current.visible = true;
    startedAt.current = null;
  }, [shot, muzzle, aim]);

  useFrame(({ clock }) => {
    if (shot == null || flash.current == null) return;
    if (startedAt.current == null) startedAt.current = clock.elapsedTime;
    const progress = (clock.elapsedTime - startedAt.current) * 1000 / MUZZLE_FLASH_DURATION_MS;
    if (progress >= 1) {
      flash.current.visible = false;
      return;
    }
    flash.current.scale.setScalar(MUZZLE_FLASH_SCALE * (1 - progress * MUZZLE_FLASH_SHRINK));
  });

  return (
    <group ref={flash} visible={false} pointerEvents="none">
      <primitive object={model} />
    </group>
  );
}

export function ShotEffects({ shot }) {
  return shot == null ? null : <BulletTracer key={`tracer-${shot.id}`} shot={shot} />;
}
