import { useLayoutEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { usePointerXRInputSourceEvents, useRayPointer } from "@react-three/xr";
import { Object3D, Vector3 } from "three";
import { updateGunPointerSpace } from "./gunPointer";
import {
  UI_POINTER_TYPE, UI_POINTER_MAX_DISTANCE, UI_POINTER_LINE_WIDTH,
  UI_POINTER_COLOR, UI_POINTER_HIT_DOT_SIZE,
} from "./uiConfig";

const NO_EVENTS = [];

// No handedness or weapon ownership assumptions. enabled may be a boolean or a
// getter so the owner can change the active gun synchronously before targeting.
export function GunUIPointer({ enabled, inputSource, muzzle, aim, events = NO_EVENTS }) {
  const scene = useThree((state) => state.scene);
  const space = useMemo(() => new Object3D(), []);
  const spaceRef = useMemo(() => ({ current: space }), [space]);
  const direction = useMemo(() => new Vector3(), []);
  const hitOffset = useMemo(() => new Vector3(), []);
  const visuals = useRef(null);
  const laser = useRef(null);
  const dot = useRef(null);
  const pointerState = useMemo(() => ({ inputSource }), [inputSource]);
  const pointer = useRayPointer(spaceRef, pointerState, { minDistance: 0 }, UI_POINTER_TYPE);
  // The installed RayIntersector exposes its Raycaster. Limit hit tests as well
  // as the visible laser; an invisible extension must never select distant UI.
  pointer.intersector.raycaster.far = UI_POINTER_MAX_DISTANCE;
  usePointerXRInputSourceEvents(pointer, inputSource, "select", events);

  useLayoutEffect(() => {
    space.transformReady = false;
    pointer.setEnabled(false, { timeStamp: performance.now() });
  }, [space, pointer]);

  useFrame(() => {
    const active = (typeof enabled === "function" ? enabled() : enabled) &&
      updateGunPointerSpace(muzzle, aim, space, direction);
    const nativeEvent = { timeStamp: performance.now() };
    if (!active) {
      pointer.exit(nativeEvent);
      pointer.setEnabled(false, nativeEvent);
      space.transformReady = false;
      visuals.current.visible = false;
      return;
    }
    space.transformReady = true;
    pointer.setEnabled(true, nativeEvent);
  }, -60); // XR grip/menu (-100) → muzzle pose → XR pointer targeting (-50).

  useFrame(() => {
    if (!pointer.getEnabled() || space.transformReady === false) {
      visuals.current.visible = false;
      return;
    }
    const hit = pointer.getIntersection();
    const onUI = hit != null && hit.object.isVoidObject !== true;
    // pointOnFace follows the captured UI plane during a slider drag, unlike the
    // initial intersection.distance, which can remain fixed while captured.
    const distance = onUI ? space.position.distanceTo(hit.pointOnFace) : UI_POINTER_MAX_DISTANCE;
    const forwardHit = onUI && direction.dot(hitOffset.subVectors(hit.pointOnFace, space.position)) > 0;
    const length = Math.min(forwardHit ? distance : UI_POINTER_MAX_DISTANCE, UI_POINTER_MAX_DISTANCE);
    visuals.current.visible = true;
    // The visual uses the exact world transform that useRayPointer hit-tested.
    visuals.current.matrix.copy(space.matrixWorld);
    laser.current.position.z = -length / 2;
    laser.current.scale.set(UI_POINTER_LINE_WIDTH, UI_POINTER_LINE_WIDTH, length);
    dot.current.visible = forwardHit && distance <= UI_POINTER_MAX_DISTANCE;
    dot.current.position.z = -length;
  }, -40);

  return createPortal(
    <group ref={visuals} name="GunUIPointer" matrixAutoUpdate={false} visible={false} pointerEvents="none">
      <mesh ref={laser} name="GunUILaser">
        <boxGeometry />
        <meshBasicMaterial color={UI_POINTER_COLOR} toneMapped={false} />
      </mesh>
      <mesh ref={dot} name="GunUIHitDot" scale={UI_POINTER_HIT_DOT_SIZE} visible={false}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={UI_POINTER_COLOR} toneMapped={false} />
      </mesh>
    </group>,
    scene,
  );
}
