import { useMemo, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Container, Text } from "@react-three/uikit";
import { XRSpace } from "@react-three/xr";
import { MathUtils, Quaternion, Vector3 } from "three";

const FORWARD_LENGTH = 0.9;
const HUD_UPDATE_MS = 100;
const NO_RAYCAST = () => {};

function PoseMarker({ color }) {
  return (
    <group pointerEvents="none">
      <axesHelper args={[0.12]} />
      <mesh>
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      <Line
        points={[[0, 0, 0], [0, 0, -FORWARD_LENGTH]]}
        color={color}
        lineWidth={4}
        depthTest={false}
        raycast={NO_RAYCAST}
      />
    </group>
  );
}

function pitchDegrees(space, quaternion, forward) {
  space.getWorldQuaternion(quaternion);
  // WebXR grip and target-ray poses both define forward along local -Z.
  forward.set(0, 0, -1).applyQuaternion(quaternion);
  return MathUtils.radToDeg(Math.atan2(forward.y, Math.hypot(forward.x, forward.z)));
}

function formatPitch(value) {
  if (value == null) return "--";
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}°`;
}

function DiagnosticHUD({ values, defaultWeaponPosePitchDeg }) {
  return (
    <group position={[-0.65, 1.6, -1.25]} pointerEvents="none">
      <Container
        pixelSize={0.002}
        width={490}
        height={195}
        padding={14}
        gap={6}
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="center"
        borderRadius={8}
        backgroundColor="#101827"
      >
        <Text fontSize={18} color="white">XR POSE DEBUG</Text>
        <Text fontSize={16} color="#37d6e7">{`Grip pitch: ${formatPitch(values?.grip)}`}</Text>
        <Text fontSize={16} color="#ed77df">{`TargetRay pitch: ${formatPitch(values?.targetRay)}`}</Text>
        <Text fontSize={16} color="white">{`Grip → TargetRay Δpitch: ${formatPitch(values?.delta)}`}</Text>
        <Text fontSize={16} color="#cbd5e1">{`DefaultWeaponPose: ${formatPitch(defaultWeaponPosePitchDeg)}`}</Text>
      </Container>
    </group>
  );
}

// Mounted inside the right controller's input-source context. Both XRSpace
// nodes resolve from that same source and are measured in the same world frame.
export function XRPoseDiagnostics({ defaultWeaponPosePitchDeg }) {
  const scene = useThree((state) => state.scene);
  const grip = useRef(null);
  const targetRay = useRef(null);
  const lastHUDUpdate = useRef(0);
  const tracking = useRef(false);
  const [values, setValues] = useState(null);
  const scratch = useMemo(() => ({
    quaternion: new Quaternion(),
    forward: new Vector3(),
  }), []);

  useFrame(() => {
    if (!grip.current?.visible || !targetRay.current?.visible) {
      if (tracking.current) {
        tracking.current = false;
        setValues(null);
      }
      return;
    }
    tracking.current = true;
    grip.current.updateWorldMatrix(true, false);
    targetRay.current.updateWorldMatrix(true, false);
    const gripPitch = pitchDegrees(grip.current, scratch.quaternion, scratch.forward);
    const targetRayPitch = pitchDegrees(targetRay.current, scratch.quaternion, scratch.forward);
    const now = performance.now();
    if (now - lastHUDUpdate.current < HUD_UPDATE_MS) return;
    lastHUDUpdate.current = now;
    setValues({
      grip: gripPitch,
      targetRay: targetRayPitch,
      delta: targetRayPitch - gripPitch,
    });
  });

  return (
    <>
      <XRSpace space="grip-space" ref={grip}>
        <PoseMarker color="#37d6e7" />
      </XRSpace>
      <XRSpace space="target-ray-space" ref={targetRay}>
        <PoseMarker color="#ed77df" />
      </XRSpace>
      {createPortal(
        <DiagnosticHUD values={values} defaultWeaponPosePitchDeg={defaultWeaponPosePitchDeg} />,
        scene,
      )}
    </>
  );
}
