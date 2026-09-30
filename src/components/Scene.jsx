import { useMemo } from "react";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import { Target } from "../shooting/Target";

const ENVIRONMENT_URL = `${import.meta.env.BASE_URL}assets/models/environment/spaceship.glb`;
const NO_RAYCAST = () => {};

const EnvironmentBackground = () => {
  const { scene } = useGLTF(ENVIRONMENT_URL);
  const background = useMemo(() => {
    const instance = scene.clone(true);
    instance.traverse((object) => {
      if (object.isMesh) object.raycast = NO_RAYCAST;
    });
    return instance;
  }, [scene]);

  return <primitive object={background} pointerEvents="none" />;
};

export const Scene = () => {
  const isInXR = useXR((state) => state.session != null);

  return (
    <>
      <EnvironmentBackground />
      <OrbitControls enabled={!isInXR} target={[0, 1.45, -1]} />
      <hemisphereLight args={["#ffffff", "#8b9bab", 1.8]} />
      <directionalLight position={[-3, 5, 2]} intensity={2.4} />
      <Target />
    </>
  );
};
