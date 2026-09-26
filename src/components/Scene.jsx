import { useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { Fullscreen, Container, Text } from "@react-three/uikit";

export const Scene = () => {
  const [isOn, setIsOn] = useState(false);

  return (
    <>
      <OrbitControls />

      <mesh>
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>

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
          onClick={() => setIsOn((prev) => !prev)}
        >
          <Text color="white">{isOn ? "ON" : "OFF"}</Text>
        </Container>
      </Fullscreen>
    </>
  );
};