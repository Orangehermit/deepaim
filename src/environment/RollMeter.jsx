import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, MathUtils, Quaternion, SRGBColorSpace, Vector3 } from "three";

// 切り分け用のデバッグ表示（?roll=1）。頭のロール角・ピッチ角と、直近5秒の最大ロール角を、
// 目の前の小さな板に数値で出す。描画が傾いているのか、頭が傾いているのかを確認するための道具。
//   ロール: 頭を右に傾けるとR、左に傾けるとL（0°なら水平）

const CANVAS_W = 512;
const CANVAS_H = 205;
const HUD_WIDTH_M = 0.5;
const HUD_OFFSET = new Vector3(0, -0.28, -1.2); // 頭から見て、正面1.2m・少し下
const PEAK_WINDOW_S = 5;
const REDRAW_INTERVAL_S = 0.1;
const NO_RAYCAST = () => {};

const _position = new Vector3();
const _quaternion = new Quaternion();
const _right = new Vector3();
const _back = new Vector3();

const formatSide = (value, positiveLabel, negativeLabel) =>
  `${value >= 0 ? positiveLabel : negativeLabel} ${Math.abs(value).toFixed(1)}°`;

export function RollMeter() {
  const meshRef = useRef(null);
  const history = useRef([]);
  const lastDrawTime = useRef(0);

  const { canvas, texture } = useMemo(() => {
    const el = document.createElement("canvas");
    el.width = CANVAS_W;
    el.height = CANVAS_H;
    const tex = new CanvasTexture(el);
    tex.colorSpace = SRGBColorSpace;
    return { canvas: el, texture: tex };
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // 頭の姿勢（XR中は直前フレームの姿勢）
    camera.getWorldPosition(_position);
    camera.getWorldQuaternion(_quaternion);
    mesh.position.copy(HUD_OFFSET).applyQuaternion(_quaternion).add(_position);
    mesh.quaternion.copy(_quaternion);

    // 頭の右向き軸の高さがロール、後ろ向き軸の高さ(符号反転)がピッチ
    _right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    _back.setFromMatrixColumn(camera.matrixWorld, 2).normalize();
    const rollDeg = -MathUtils.radToDeg(Math.asin(MathUtils.clamp(_right.y, -1, 1)));
    const pitchDeg = MathUtils.radToDeg(Math.asin(MathUtils.clamp(-_back.y, -1, 1)));

    const now = clock.elapsedTime;
    history.current.push({ t: now, roll: rollDeg });
    while (history.current.length && now - history.current[0].t > PEAK_WINDOW_S) {
      history.current.shift();
    }

    if (now - lastDrawTime.current < REDRAW_INTERVAL_S) return;
    lastDrawTime.current = now;

    const peak = history.current.reduce((max, h) => Math.max(max, Math.abs(h.roll)), 0);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`ROLL  ${formatSide(rollDeg, "L", "R")}`, 24, 54);
    ctx.font = "40px sans-serif";
    ctx.fillText(`PITCH ${pitchDeg >= 0 ? "+" : "-"}${Math.abs(pitchDeg).toFixed(0)}°`, 24, 115);
    ctx.fillText(`MAX ${peak.toFixed(1)}° / ${PEAK_WINDOW_S}s`, 24, 170);
    texture.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} renderOrder={999} frustumCulled={false} raycast={NO_RAYCAST}>
      <planeGeometry args={[HUD_WIDTH_M, (HUD_WIDTH_M * CANVAS_H) / CANVAS_W]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}
