import { useEffect, useLayoutEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { PMREMGenerator, RepeatWrapping, Scene as ThreeScene } from "three";
import { Sky as SkyMesh } from "three/addons/objects/Sky.js";
import { ENVIRONMENT_CONFIG } from "../config/appConfig.js";
import { getSunDirection } from "./sun.js";

const NORMAL_MAP_URL = `${import.meta.env.BASE_URL}assets/textures/waternormals.jpg`;
const NO_RAYCAST = () => {};

// 見える空と環境光用の空で同じ実装・同じパラメータを使うための生成関数
function createSky(sunDirection) {
  const { turbidity, rayleigh, mieCoefficient, mieDirectionalG } = ENVIRONMENT_CONFIG.sky;
  const sky = new SkyMesh();
  sky.scale.setScalar(10000); // 頂点シェーダが深度をfar面に固定するので大きさは見た目に影響しない
  sky.raycast = NO_RAYCAST;
  const { uniforms } = sky.material;
  uniforms.turbidity.value = turbidity;
  uniforms.rayleigh.value = rayleigh;
  uniforms.mieCoefficient.value = mieCoefficient;
  uniforms.mieDirectionalG.value = mieDirectionalG;
  uniforms.sunPosition.value.copy(sunDirection);
  return sky;
}

function disposeSky(sky) {
  sky.geometry.dispose();
  sky.material.dispose();
}

// 画面に見える空
function VisibleSky({ sunDirection }) {
  const sky = useMemo(() => createSky(sunDirection), [sunDirection]);
  useEffect(() => () => disposeSky(sky), [sky]);
  return <primitive object={sky} />;
}

// 空だけを入れた別シーンからPMREMを作り、scene.environment に設定する。
// 太陽が固定なので最初の1回だけ生成する。
function SkyEnvironment({ sunDirection }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const envScene = new ThreeScene();
    const sky = createSky(sunDirection);
    envScene.add(sky);

    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(envScene);
    pmrem.dispose();

    scene.environment = target.texture;
    scene.environmentIntensity = ENVIRONMENT_CONFIG.environmentIntensity;

    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
      disposeSky(sky);
    };
  }, [gl, scene, sunDirection]);

  return null;
}

// 海。遠景専用なので平面反射は持たず、環境反射(空の映り込み)と弱い法線の揺らぎだけ。
function Sea() {
  const gl = useThree((state) => state.gl);
  const { levelY, sizeM, color, roughness, normalScale, normalTileM, scrollSpeed } =
    ENVIRONMENT_CONFIG.sea;
  const normalMap = useTexture(NORMAL_MAP_URL);

  useLayoutEffect(() => {
    normalMap.wrapS = RepeatWrapping;
    normalMap.wrapT = RepeatWrapping;
    normalMap.repeat.set(sizeM / normalTileM, sizeM / normalTileM);
    // 異方性フィルタリングで、遠方の波が薄れて見える（ちらつき対策）
    normalMap.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    normalMap.needsUpdate = true;
  }, [normalMap, gl, sizeM, normalTileM]);

  useFrame((_, delta) => {
    normalMap.offset.x = (normalMap.offset.x + delta * scrollSpeed[0]) % 1;
    normalMap.offset.y = (normalMap.offset.y + delta * scrollSpeed[1]) % 1;
  });

  return (
    <mesh name="Sea" rotation-x={-Math.PI / 2} position-y={levelY} raycast={NO_RAYCAST}>
      <planeGeometry args={[sizeM, sizeM]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0}
        normalMap={normalMap}
        normalScale={[normalScale, normalScale]}
      />
    </mesh>
  );
}

export function SkyAndSea() {
  const gl = useThree((state) => state.gl);
  const sunDirection = useMemo(() => getSunDirection(), []);
  const { color, density } = ENVIRONMENT_CONFIG.fog;

  useEffect(() => {
    const previous = gl.toneMappingExposure;
    gl.toneMappingExposure = ENVIRONMENT_CONFIG.toneMappingExposure;
    return () => {
      gl.toneMappingExposure = previous;
    };
  }, [gl]);

  return (
    <>
      <fogExp2 attach="fog" args={[color, density]} />
      <VisibleSky sunDirection={sunDirection} />
      <SkyEnvironment sunDirection={sunDirection} />
      <Sea />
    </>
  );
}
