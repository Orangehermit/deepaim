// 実機での切り分け用。URLのクエリで海・空・環境光を個別にオフにできる。
//   ?env=0    海・空・環境光をまとめてオフ（導入前の状態との比較用）
//   ?sky=0    見えている空だけオフ
//   ?sea=0    海だけオフ
//   ?ibl=0    空から作る環境光だけオフ
//   ?scroll=0 海の法線スクロールだけ止める
//   ?far=1000 カメラのfar値を上書き
//   ?seaY=-20 海面の高さ(m)を上書き。崖が低い場合の見え方を、モデルを作り直さずに試せる
//   ?roll=1   頭のロール角を目の前に数値表示（切り分け用。これだけは指定したときだけ表示）
// 例: https://.../deepaim/?env=0&v=2
const params = new URLSearchParams(window.location.search);
const isOn = (name) => params.get(name) !== "0";
const farOverride = Number(params.get("far"));
const seaYParam = params.get("seaY");
const seaYOverride = seaYParam !== null && seaYParam !== "" ? Number(seaYParam) : NaN;

export const ENV_DEBUG = {
  env: isOn("env"),
  sky: isOn("sky"),
  sea: isOn("sea"),
  ibl: isOn("ibl"),
  scroll: isOn("scroll"),
  cameraFar: farOverride > 0 ? farOverride : null,
  seaLevelY: Number.isFinite(seaYOverride) ? seaYOverride : null,
  roll: params.get("roll") === "1",
};
