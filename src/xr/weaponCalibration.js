import { MathUtils } from "three";
import { SETTINGS_CONFIG } from "../userSetting/userSettingConfig.js";

// Only the user calibration layer changes. Local axes use Three's XYZ Euler
// convention: the barrel points along -Z, so positive pitch (X) raises it,
// positive yaw (Y) turns it left, and positive roll (Z) tilts its top left.
export function applyWeaponCalibration(group, settings) {
  group.rotation.set(
    MathUtils.degToRad(settings.pitch),
    MathUtils.degToRad(settings.yaw),
    MathUtils.degToRad(settings.roll),
    "XYZ",
  );
  group.position.set(
    SETTINGS_CONFIG.weapon.xOffset.toRuntime(settings.xOffset),
    SETTINGS_CONFIG.weapon.yOffset.toRuntime(settings.yOffset),
    SETTINGS_CONFIG.weapon.zOffset.toRuntime(settings.zOffset),
  );
}
