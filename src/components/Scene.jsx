import { OrbitControls } from "@react-three/drei";
import { Fullscreen, Container, Text } from "@react-three/uikit";
import { useAppStore } from "../store/useAppStore";

const Cube = () => {
  const isOn = useAppStore((state) => state.isOn);

  return (
    <mesh scale={isOn ? 1.5 : 1}>
      <boxGeometry />
      <meshNormalMaterial />
    </mesh>
  );
};

const ToggleControl = () => {
  const isOn = useAppStore((state) => state.isOn);
  const toggle = useAppStore((state) => state.toggle);

  return (
    <Fullscreen
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Container
        width={140}
        height={50}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
        backgroundColor={isOn ? "#22c55e" : "#666666"}
        hover={{
          backgroundColor: isOn ? "#16a34a" : "#888888",
        }}
        onClick={toggle}
      >
        <Text color="white">{isOn ? "ON" : "OFF"}</Text>
      </Container>
    </Fullscreen>
  );
};

export const Scene = () => {
  return (
    <>
      <OrbitControls />
      <Cube />
      <ToggleControl />
    </>
  );
};
