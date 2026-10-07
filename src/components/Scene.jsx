import { OrbitControls, useGLTF } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import { Target } from "../shooting/Target";
import { SkyAndSea } from "../environment/SkyAndSea";
import { getSunDirection } from "../environment/sun";

const SUN_LIGHT_DISTANCE_M = 10;
const SUN_LIGHT_POSITION = getSunDirection().multiplyScalar(SUN_LIGHT_DISTANCE_M).toArray();

const ENVIRONMENT_URL = `${import.meta.env.BASE_URL}assets/models/environment/base.glb`;

export const Scene = () => {
  const isInXR = useXR((state) => state.session != null);
  const { scene } = useGLTF(ENVIRONMENT_URL);

  return (
    <>
      <SkyAndSea />
      <primitive object={scene} />
      <OrbitControls enabled={!isInXR} target={[0, 1.45, -1]} />
      <hemisphereLight args={["#ffffff", "#8b9bab", 1.8]} />
      <directionalLight position={SUN_LIGHT_POSITION} intensity={2.4} />
      <Target />
    </>
  );
};
