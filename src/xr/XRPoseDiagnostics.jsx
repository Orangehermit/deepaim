import { useMemo, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Container, Text } from "@react-three/uikit";
import { XRSpace } from "@react-three/xr";
import { Euler, MathUtils, Quaternion, Vector3 } from "three";

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

function worldOrientationDegrees(space, quaternion, forward) {
  space.getWorldQuaternion(quaternion);
  // WebXR grip and target-ray poses both define forward along local -Z.
  forward.set(0, 0, -1).applyQuaternion(quaternion);
  const horizontalLength = Math.hypot(forward.x, forward.z);
  return {
    pitch: MathUtils.radToDeg(Math.atan2(forward.y, horizontalLength)),
    // 0° points along world -Z; positive azimuth turns toward world +X.
    // Azimuth is undefined when the forward vector is vertical.
    azimuth: horizontalLength < 1e-6
      ? null
      : MathUtils.radToDeg(Math.atan2(forward.x, -forward.z)),
  };
}

function wrappedAngleDifference(target, grip) {
  if (target == null || grip == null) return null;
  return MathUtils.euclideanModulo(target - grip + 180, 360) - 180;
}

function formatAngle(value) {
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
        height={340}
        padding={14}
        gap={4}
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="center"
        borderRadius={8}
        backgroundColor="#101827"
      >
        <Text fontSize={18} color="white">XR POSE DEBUG</Text>
        <Text fontSize={15} color="#94a3b8">WORLD ORIENTATION</Text>
        <Text fontSize={16} color="#37d6e7">{`Grip pitch: ${formatAngle(values?.gripPitch)}`}</Text>
        <Text fontSize={16} color="#ed77df">{`TargetRay pitch: ${formatAngle(values?.targetRayPitch)}`}</Text>
        <Text fontSize={16} color="white">{`Elevation Δ: ${formatAngle(values?.elevationDelta)}`}</Text>
        <Text fontSize={16} color="#37d6e7">{`Grip azimuth: ${formatAngle(values?.gripAzimuth)}`}</Text>
        <Text fontSize={16} color="#ed77df">{`TargetRay azimuth: ${formatAngle(values?.targetRayAzimuth)}`}</Text>
        <Text fontSize={16} color="white">{`Azimuth Δ: ${formatAngle(values?.azimuthDelta)}`}</Text>
        <Text fontSize={15} color="#94a3b8">GRIP → TARGETRAY</Text>
        <Text fontSize={16} color="white">{`Relative pitch: ${formatAngle(values?.relativePitch)}`}</Text>
        <Text fontSize={16} color="white">{`Relative yaw: ${formatAngle(values?.relativeYaw)}`}</Text>
        <Text fontSize={16} color="white">{`Relative roll: ${formatAngle(values?.relativeRoll)}`}</Text>
        <Text fontSize={16} color="#cbd5e1">{`DefaultWeaponPose: ${formatAngle(defaultWeaponPosePitchDeg)}`}</Text>
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
  const lastQuaternionLog = useRef(0);
  const tracking = useRef(false);
  const [values, setValues] = useState(null);
  const scratch = useMemo(() => ({
    gripQuaternion: new Quaternion(),
    targetRayQuaternion: new Quaternion(),
    relativeQuaternion: new Quaternion(),
    relativeEuler: new Euler(),
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
    const now = performance.now();
    if (now - lastHUDUpdate.current < HUD_UPDATE_MS) return;
    lastHUDUpdate.current = now;
    grip.current.updateWorldMatrix(true, false);
    targetRay.current.updateWorldMatrix(true, false);
    const gripWorld = worldOrientationDegrees(grip.current, scratch.gripQuaternion, scratch.forward);
    const targetRayWorld = worldOrientationDegrees(targetRay.current, scratch.targetRayQuaternion, scratch.forward);
    scratch.relativeQuaternion.copy(scratch.gripQuaternion).invert()
      .multiply(scratch.targetRayQuaternion).normalize();
    // YXZ: yaw around local Y, pitch around local X, roll around local Z.
    scratch.relativeEuler.setFromQuaternion(scratch.relativeQuaternion, "YXZ");

    setValues({
      gripPitch: gripWorld.pitch,
      targetRayPitch: targetRayWorld.pitch,
      elevationDelta: targetRayWorld.pitch - gripWorld.pitch,
      gripAzimuth: gripWorld.azimuth,
      targetRayAzimuth: targetRayWorld.azimuth,
      azimuthDelta: wrappedAngleDifference(targetRayWorld.azimuth, gripWorld.azimuth),
      relativePitch: MathUtils.radToDeg(scratch.relativeEuler.x),
      relativeYaw: MathUtils.radToDeg(scratch.relativeEuler.y),
      relativeRoll: MathUtils.radToDeg(scratch.relativeEuler.z),
    });
    if (now - lastQuaternionLog.current >= 1000) {
      lastQuaternionLog.current = now;
      console.debug("Grip → TargetRay relative quaternion (xyzw)",
        scratch.relativeQuaternion.toArray());
    }
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
