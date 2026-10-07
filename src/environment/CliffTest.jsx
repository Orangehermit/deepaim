import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { ENV_DEBUG } from "./debugFlags.js";

// 切り分け用のデバッグ表示（?cliff=circle / ?cliff=square）。
// 崖1を隠して、立ち位置(原点)を中心にした単純な平面に差し替える。
// 崖の先端が立ち位置に対して偏心していることが、錯覚の原因かどうかを確かめる。
//   ?cliff=circle&cliffR=25   立ち位置を中心にした円(半径25m)
//   ?cliff=square&cliffR=25   立ち位置を中心にした正方形(半辺25m)
const CLIFF_NAME = "崖1";
const CLIFF_TOP_Y = -1; // base.glbの崖1の天面の高さ

export function CliffTest() {
  const scene = useThree((state) => state.scene);
  const { shape, size } = ENV_DEBUG.cliffTest;

  // 元の崖1を隠す（解除時に戻す）
  useEffect(() => {
    const hidden = [];
    scene.traverse((object) => {
      if (object.name.startsWith(CLIFF_NAME) && object.visible) {
        object.visible = false;
        hidden.push(object);
      }
    });
    if (hidden.length === 0) console.warn(`[CliffTest] ${CLIFF_NAME} が見つかりません`);
    return () => hidden.forEach((object) => (object.visible = true));
  }, [scene]);

  return (
    <mesh name="CliffTestPlane" rotation-x={-Math.PI / 2} position-y={CLIFF_TOP_Y}>
      {shape === "circle" ? (
        <circleGeometry args={[size, 128]} />
      ) : (
        <planeGeometry args={[size * 2, size * 2]} />
      )}
      <meshStandardMaterial color="#e0661a" roughness={0.9} />
    </mesh>
  );
}
