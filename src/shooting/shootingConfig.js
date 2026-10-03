// --------------------------------------------------
// Trigger
// --------------------------------------------------
// 初弾を発射するトリガーの絶対位置。
// 待機状態から、この値以上まで引くと最初の1発を発射する。
// Pistol Whipの射撃感でいうと0.2～0.25くらい。
// デフォルト値:0.25
export const TRIGGER_FIRE_THRESHOLD = 0.25;

// 発射後、次弾を準備するためにトリガーを戻す必要がある最小量。
// 発射後に記録した最深位置（peak）から、この値以上戻すと
// 「十分に戻した」と判定して再引き待ち状態へ移行する。
// 高速連射を可能にするには十分に小さい値である必要がある。
// デフォルト値:0.03
export const TRIGGER_RELEASE_TRAVEL = 0.03;

// トリガーを戻した後、次弾を発射するために再び引く必要がある最小量。
// 戻し動作中に記録した最浅位置（trough）から、
// この値以上引き直すと次弾を発射する。
// 高速連射を可能にするには十分に小さい値である必要がある。
// デフォルト値:0.03
export const TRIGGER_REPULL_TRAVEL = 0.03;

// トリガーを完全に離したとみなす絶対位置。
// この値以下まで戻ると連射サイクルを終了し、
// 次回は再びfireThresholdによる「初弾」判定から始める。
// デフォルト値:0.05
export const TRIGGER_IDLE_THRESHOLD = 0.05;

// --------------------------------------------------
// Haptic
// --------------------------------------------------
export const HAPTIC_INTENSITY = 0.7;
export const HAPTIC_DURATION_MS = 40;

// --------------------------------------------------
// Tracer
// --------------------------------------------------
export const TRACER_DURATION_MS = 200; // milliseconds (default:60
export const TRACER_WIDTH = 0.001; // meters (diameter) (default:0.006)
export const TRACER_LENGTH = 50.0; // meters (default:3.0)

// --------------------------------------------------
// DefaultWeaponPose (degrees; separate from XR grip correction and user calibration)
// --------------------------------------------------
export const DEFAULT_WEAPON_POSE_DEG = { pitch: 25, yaw: 0, roll: 0 };

// --------------------------------------------------
// Muzzle Flash
// --------------------------------------------------
export const MUZZLE_FLASH_DURATION_MS = 75;
export const MUZZLE_FLASH_SCALE = 6;

// --------------------------------------------------
// Gunshot新しい指示書に従う
// --------------------------------------------------
export const GUNSHOT_VOLUME = 1;
