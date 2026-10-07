import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Color, PMREMGenerator, RepeatWrapping, Scene as ThreeScene } from "three";
import { Sky as SkyMesh } from "three/addons/objects/Sky.js";
import { ENVIRONMENT_CONFIG } from "../config/appConfig.js";
import { getSunDirection } from "./sun.js";
import { ENV_DEBUG } from "./debugFlags.js";
import { RollMeter } from "./RollMeter.jsx";
import { CliffTest } from "./CliffTest.jsx";

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
function SkyEnvironment({ sunDirection, onEnvMapChange }) {
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
    onEnvMapChange(target.texture);

    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      onEnvMapChange(null);
      target.dispose();
      disposeSky(sky);
    };
  }, [gl, scene, sunDirection, onEnvMapChange]);

  return null;
}

// 海。遠景専用なので平面反射は持たず、環境反射(空の映り込み)と弱い法線の揺らぎだけ。
function Sea({ envMap }) {
  const gl = useThree((state) => state.gl);
  const { levelY, sizeM, color, roughness, envMapIntensity, normalScale, normalTileM, scrollSpeed } =
    ENVIRONMENT_CONFIG.sea;
  const normalMap = useTexture(NORMAL_MAP_URL);
  const { color: hazeColor, density: hazeDensity } = ENVIRONMENT_CONFIG.haze;
  const hazeUniforms = useMemo(
    () => ({
      hazeColor: { value: new Color(hazeColor) },
      hazeDensity: { value: hazeDensity },
    }),
    [hazeColor, hazeDensity],
  );

  // 目からの実距離(vViewPosition)で霞を混ぜる。scene.fogは視線方向の奥行きで計算されるため使わない
  const onBeforeCompile = useCallback(
    (shader) => {
      shader.uniforms.hazeColor = hazeUniforms.hazeColor;
      shader.uniforms.hazeDensity = hazeUniforms.hazeDensity;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform vec3 hazeColor;\nuniform float hazeDensity;",
        )
        .replace(
          "#include <opaque_fragment>",
          `float hazeDistance = length( vViewPosition );
          float hazeFactor = 1.0 - exp( - hazeDensity * hazeDensity * hazeDistance * hazeDistance );
          outgoingLight = mix( outgoingLight, hazeColor, hazeFactor );
          #include <opaque_fragment>`,
        );
    },
    [hazeUniforms],
  );

  useLayoutEffect(() => {
    normalMap.wrapS = RepeatWrapping;
    normalMap.wrapT = RepeatWrapping;
    normalMap.repeat.set(sizeM / normalTileM, sizeM / normalTileM);
    // 異方性フィルタリングで、遠方の波が薄れて見える（ちらつき対策）
    normalMap.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    normalMap.needsUpdate = true;
  }, [normalMap, gl, sizeM, normalTileM]);

  useFrame((_, delta) => {
    if (!ENV_DEBUG.scroll) return;
    normalMap.offset.x = (normalMap.offset.x + delta * scrollSpeed[0]) % 1;
    normalMap.offset.y = (normalMap.offset.y + delta * scrollSpeed[1]) % 1;
  });

  return (
    <mesh name="Sea" rotation-x={-Math.PI / 2} position-y={ENV_DEBUG.seaLevelY ?? levelY} raycast={NO_RAYCAST}>
      <planeGeometry args={[sizeM, sizeM]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0}
        envMap={envMap}
        envMapIntensity={envMapIntensity}
        normalMap={normalMap}
        normalScale={[normalScale, normalScale]}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  );
}

export function SkyAndSea() {
  const gl = useThree((state) => state.gl);
  const sunDirection = useMemo(() => getSunDirection(), []);
  // 海の映り込みを空と同じ明るさにするため、環境マップを海のマテリアルにも直接渡す
  const [envMap, setEnvMap] = useState(null);

  useEffect(() => {
    if (!ENV_DEBUG.env) return undefined;
    const previous = gl.toneMappingExposure;
    gl.toneMappingExposure = ENVIRONMENT_CONFIG.toneMappingExposure;
    return () => {
      gl.toneMappingExposure = previous;
    };
  }, [gl]);

  const debugTools = (
    <>
      {ENV_DEBUG.roll && <RollMeter />}
      {ENV_DEBUG.cliffTest && <CliffTest />}
    </>
  );

  if (!ENV_DEBUG.env) return debugTools;

  return (
    <>
      {ENV_DEBUG.sky && <VisibleSky sunDirection={sunDirection} />}
      {ENV_DEBUG.ibl && <SkyEnvironment sunDirection={sunDirection} onEnvMapChange={setEnvMap} />}
      {ENV_DEBUG.sea && <Sea envMap={envMap} />}
      {debugTools}
    </>
  );
}
