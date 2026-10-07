import { MathUtils, Vector3 } from "three";
import { ENVIRONMENT_CONFIG } from "../config/appConfig.js";

// 太陽の向き（単位ベクトル）。空・環境光・ライトの全員がこれを見る。
export function getSunDirection() {
  const { azimuthDeg, elevationDeg } = ENVIRONMENT_CONFIG.sun;
  return new Vector3().setFromSphericalCoords(
    1,
    MathUtils.degToRad(90 - elevationDeg),
    MathUtils.degToRad(azimuthDeg),
  );
}
