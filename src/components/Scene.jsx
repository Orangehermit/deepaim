import { OrbitControls } from "@react-three/drei";
import { Container, Text } from "@react-three/uikit";
import { useXR } from "@react-three/xr";
import { useAppStore } from "../store/useAppStore";

const Cube = () => {
  const isOn = useAppStore((state) => state.isOn);

  return (
    <mesh position={[0, 1.6, -1]} scale={isOn ? 1.5 : 1}>
      <boxGeometry args={[0.25, 0.25, 0.25]} />
      <meshNormalMaterial />
    </mesh>
  );
};

const ToggleControl = () => {
  const isOn = useAppStore((state) => state.isOn);
  const toggle = useAppStore((state) => state.toggle);

  return (
    <group position={[0, 1.25, -1]}>
      <Container
        pixelSize={0.002}
        width={140}
        height={50}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
        backgroundColor={isOn ? "#22c55e" : "#666666"}
        hover={{
          backgroundColor: isOn ? "#16a34a" : "#888888",
        }}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        <Text color="white" pointerEvents="none">{isOn ? "ON" : "OFF"}</Text>
      </Container>
    </group>
  );
};

export const Scene = () => {
  const isInXR = useXR((state) => state.session != null);

  return (
    <>
      <OrbitControls enabled={!isInXR} target={[0, 1.45, -1]} />
      <Cube />
      <ToggleControl />
    </>
  );
};
