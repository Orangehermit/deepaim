# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Uses **npm** (not Yarn). `react` and `react-dom` must be the same version (`npm ls react react-dom`).

- `npm run dev` — Vite dev server
- `npm run build` / `npm run preview` — production build / local preview
- Tests use the built-in Node runner (no test framework, no lint script):
  - All: `node --test src/audio/*.test.js src/shooting/*.test.js src/xr/*.test.js src/store/*.test.js src/ui/*.test.js src/userSetting/*.test.js`
  - Single file: `node --test src/shooting/trigger.test.js`
- XR behavior (aiming, UI laser, audio lifecycle) can only be verified on a Quest 3; README.md has detailed manual check lists.

## Deployment

`vite.config.js` must keep `base: "/deepaim/"`. Pushing to `main` builds and deploys `dist` to GitHub Pages via `.github/workflows/deploy.yml`. Asset URLs must be built with `import.meta.env.BASE_URL` (see `src/audio/bgmTracks.js`, `Scene.jsx`).

## Architecture

WebXR shooting prototype: React Three Fiber + `@react-three/xr` + `@react-three/uikit` + Zustand. `App.jsx` creates the XR store (right controller = `RightHandGun`, left = default ray pointer) and mounts `Scene`, `MenuInputController`, `SettingsMenu`. README.md is the detailed spec for settings/audio/shooting; read the relevant section before changing those areas.

- **Shooting** (`src/shooting`, `src/xr/RightHandGun.jsx`): shots are a raycast from the GLB's `Muzzle_Point` toward `Aim_Point` (never the controller ray). Only visible objects with `userData.onShotHit` are targets. Trigger firing uses an analog threshold plus a relative release/repull gate (`trigger.js`, tuned in `shootingConfig.js`). Weapon transform chain: grip space → `XRGripCorrection` → `DefaultWeaponPose` → `WeaponCalibration` → `Gun_Root`; only `WeaponCalibration` (`weaponCalibration.js`) takes user settings.
- **Settings menu** (`src/ui`, `src/userSetting`, `src/store`): in-VR UIKit panel toggled by B/Y. Interaction uses the right gun's muzzle laser (`GunUIPointer`, pointer type `gun-ui` only). Every category (Weapon, Audio) follows a **Draft/Applied/Initial** model in `useAppStore.js`: entering copies Applied → Draft (live preview), SAVE commits, RESET previews Initial, BACK/close/XR-exit discards. `SETTINGS_CONFIG` in `userSettingConfig.js` is the single source of initial values, ranges, steps, units and runtime conversions; layout/colors live in `uiConfig.js`.
- **Persistence**: Zustand `persist`, key `deepaim-user-settings`, version 1, partializing only Applied weapon/audio values (UI units: degrees, cm, percent). `userSettingPersistence.js` merges/clamps/snaps on hydration; the storage adapter skips writes when Applied is unchanged. Changing schema or units requires a `migrate`. `createAppStore(storage)` accepts injected storage for tests.
- **Frame-order priorities** (`useFrame`): menu input -100, calibration -70, gun pointer pose -60, pointer targeting -50, shooting 0. Preserve these so preview/rollback reach targeting and shooting in the same frame. Shooting is suppressed while Settings is open and requires a trigger release afterwards.
- **Audio** (`src/audio`, `src/shooting/gunshotAudio.js`): one shared AudioContext; BGM is a streamed `HTMLAudioElement` → gain, gunshots are decoded buffers → separate gain. `xrAudioLifecycle.js` starts/pauses BGM from the actual XR session's `visibilityState` (not from the Enter VR click, and not from document visibility).
- **Environment** (`src/environment`, branch `exp/water-js` experiments Three's `Water.js`): sky and sea, with `base.glb` loaded in `Scene.jsx`. `debugFlags.js` exposes URL query switches (`?env=0`, `?sea=0`, `?far=`, `?seaY=`, `?roll=1`, …) for isolating rendering issues on-device; see the header comment there. `appConfig.js` holds `ENVIRONMENT_CONFIG`.

`.archive/` and `.temp/` are scratch/reference material, not part of the app.
