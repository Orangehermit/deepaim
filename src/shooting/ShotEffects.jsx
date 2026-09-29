import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import {
  MUZZLE_FLASH_DURATION_MS,
  TRACER_DURATION_MS,
  TRACER_LENGTH,
  TRACER_WIDTH,
} from "./shootingConfig.js";
import { SHOT_RANGE } from "./shoot.js";

const WORLD_UP = new Vector3(0, 1, 0);
const LOCAL_FORWARD = new Vector3(0, 0, -1);
const NO_RAYCAST = () => {};

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

function MuzzleFlash({ shot }) {
  const flash = useRef(null);
  const startedAt = useRef(null);
  const orientation = useMemo(
    () => new Quaternion().setFromUnitVectors(LOCAL_FORWARD, shot.direction),
    [shot],
  );

  useFrame(({ clock }) => {
    if (flash.current == null) return;
    if (startedAt.current == null) startedAt.current = clock.elapsedTime;
    const progress = (clock.elapsedTime - startedAt.current) * 1000 / MUZZLE_FLASH_DURATION_MS;
    if (progress >= 1) {
      flash.current.visible = false;
      return;
    }
    flash.current.scale.setScalar(1 - progress * 0.4);
  });

  return (
    <group ref={flash} position={shot.origin} quaternion={orientation} pointerEvents="none">
      <mesh position={[0, 0, -0.065]} scale={[0.035, 0.035, 0.065]} raycast={NO_RAYCAST}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#fff7bd" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.09]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <coneGeometry args={[0.018, 0.12, 4]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0.026, 0, -0.045]} rotation={[-Math.PI / 2, 0, 0.45]} raycast={NO_RAYCAST}>
        <coneGeometry args={[0.012, 0.075, 4]} />
        <meshBasicMaterial color="#ffd366" toneMapped={false} />
      </mesh>
      <mesh position={[-0.026, 0, -0.045]} rotation={[-Math.PI / 2, 0, -0.45]} raycast={NO_RAYCAST}>
        <coneGeometry args={[0.012, 0.075, 4]} />
        <meshBasicMaterial color="#ffd366" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function ShotEffects({ shot }) {
  if (shot == null) return null;
  return (
    <>
      <BulletTracer key={`tracer-${shot.id}`} shot={shot} />
      <MuzzleFlash key={`flash-${shot.id}`} shot={shot} />
    </>
  );
}
