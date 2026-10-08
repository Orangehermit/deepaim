# Deep Aim

Deep Aim is a WebXR shooting project built with React Three Fiber.

## Development

This project uses **npm**, not Yarn.

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Settings UI and runtime weapon calibration

In VR, the right controller's **B** or the left controller's **Y** opens and
closes Settings. Either controller can open/close it on its own. A/X do not open the menu,
and holding B/Y only acts once. Every opening starts at the Settings home page.
The home page has two columns of square WEAPON, SHOOTING, AUDIO, and SYSTEM
tiles. WEAPON and AUDIO are enabled in this prototype.

WEAPON contains six single-line `NumericStepSetting` rows: Pitch / Yaw / Roll
(-90–90°, 0.5° steps) and X / Y / Z Offset (-10–10 cm, 0.5 cm steps).
Each row starts at the same left edge as Dual Wield and aligns its label,
decrement button, bold magenta value with its unit, and increment button.
Values use one decimal place and a plus sign only when
positive (`+2.0°`, `-0.5 cm`, `0.0°`). A trigger tap changes Draft by one step
on click after release, then previews the gun immediately. Holding the trigger
does not repeat or change the pose, avoiding muzzle-pointer feedback during
input. The 56 × 56 mm arrow targets have transparent backgrounds and black
icons that stay black on hover. Inline SVG triangles use `ARROW_COLOR`
because the default UIKit font does not include ◀ / ▶ glyphs.
The existing `NumericSetting` slider component is used by Audio volume settings;
both numeric controls share clamped step rounding.

AUDIO contains BGM ON/OFF, BGM Volume, and Gun Shot Volume. Both volumes use
`NumericSetting` sliders and single-tap arrows with a 0–100% range and 10% steps.
Percentages display as integers. BGM starts enabled at 70%; Gun Shot starts at
`GUNSHOT_VOLUME × 100` (currently 100%). `SETTINGS_CONFIG.audio` supplies all
initial values, ranges, units, and percent-to-gain conversions. Audio runtime
uses gains from 0.0 to 1.0. BGM OFF pauses playback without changing its volume
or resetting its playback position.

`src/userSetting/userSettingConfig.js` defines `SETTINGS_CONFIG.weapon`: each numeric
setting supplies `initialValue`, `min`, `max`, `step`, and `unit`. Initial values
reference `PITCH`, `YAW`, `ROLL`, and `WEAPON_POSITION_OFFSET_*_M` from
`shootingConfig.js`; Dual Wield's initial value references `DUAL_WIELD_ENABLED`.
They currently start at zero/OFF. Offsets are initialized in cm using meters ×
100; runtime offsets use each setting's `toRuntime` conversion. Angles are
converted from degrees with `MathUtils.degToRad`. NumericStepSetting receives its
range, step, and unit from SETTINGS_CONFIG rather than hardcoded row props.
User settings live in `src/userSetting`; application-wide configuration is
reserved for `src/config/appConfig.js`, which is currently empty.

`useAppStore.js` holds persisted Applied values in `weaponSettings` and the
temporary Draft/Preview in `weaponSettingsPreview`. Entering WEAPON copies the
current Applied values into a fresh Draft. Editing previews the gun immediately,
without changing Applied. The footer order is SAVE, RESET, BACK; SAVE and RESET
align to the right without borders and fit their text plus padding. Their backgrounds stay
transparent on hover, with black text that turns pink on hover using the
transparent-button colors in `uiConfig.js`. SAVE commits all six values in one synchronous
update, stays in WEAPON, and shows SAVED for 600 ms without locking inputs.
`SAVE *` indicates numerical differences between Draft and Applied. Further
editing clears the success feedback and starts new unsaved changes.

RESET previews the `initialValue` definitions in Draft only. RESET then SAVE
commits Initial; RESET then BACK restores the last Applied values. BACK or a
category change discards Draft/Preview. B/Y or XR session exit does the same
when closing Settings; reopening WEAPON starts from Applied. Saved Weapon values
are restored after a reload. Dual Wield remains a local UI prototype and RESET leaves it
unchanged. Tracer controls, left guns, and other runtime settings are deferred.
`uiConfig.js` supplies appearance/layout and the feedback duration.

Audio uses the same Draft/Applied/Initial model, in `audioSettingsPreview` and
`audioSettings`. Entering AUDIO copies Applied into Draft. BGM ON/OFF and both
gains preview immediately; SAVE commits all three fields and retains the usual
SAVED feedback. RESET previews Initial only. BACK, a category switch, B/Y close,
or XR exit discards Audio Draft and restores Applied playback settings. Saving
one category retains the other category's Applied values. Shooting remains
disabled in Settings; there is no Gun Shot test button.

Applied settings use Zustand `persist` with the localStorage key
`deepaim-user-settings` and persist `version: 1`. `partialize` includes only
`weaponSettings`, in degrees and cm, plus `audioSettings` (`bgmEnabled`,
`bgmVolume`, `gunshotVolume`) in boolean/percent UI units. Draft/Preview, menu/category state, the
application toggle, hover/pointer/XR state, SAVED feedback, and dirty indicators
are excluded. UI components continue to call store actions. SAVE commits Draft
to Applied synchronously, then the middleware writes that snapshot without a
delay or input lock. Since persist runs on every store update, the storage
adapter skips writes when Applied category objects have not changed: Draft edits,
RESET alone, BACK, and other runtime actions do not touch localStorage, even on
a first visit with no saved values. RESET followed by SAVE persists Initial.

`src/userSetting/userSettingPersistence.js` merges known saved numeric keys into
fresh defaults from `createInitialWeaponSettings()` and `createInitialAudioSettings()`.
Version 1 Weapon-only saves keep their existing values and gain Audio defaults
without a storage rewrite. Missing/invalid values use
current `initialValue`; finite values are clamped and snapped to the current
min/max/step. Unknown keys and stored runtime state are ignored. Malformed or
unreadable storage falls back to Initial; a failed write leaves the current
Applied settings usable and logs a warning. Hydration does not rewrite storage.
No migration is needed for version 1; add a `migrate` option here when making
breaking schema or unit changes. Future Applied categories can be added to
`partialize` and their corresponding hydration merge without changing UI storage
handling. `createAppStore(storage)` also supports isolated reload tests with an
injected Storage-compatible backend; normal startup uses browser localStorage.

Saved settings survive browser restarts and GitHub Pages redeploys when the same
browser/origin retains its localStorage. Browser-data deletion, a different
browser/device/origin, or an ended private session can lose those values. There
is no cloud sync or device profile storage.

On opening, the menu snapshots the current camera's local `[0, -0.2, -0.8]`
offset in world space and adopts only its world yaw. It then stays upright and
fixed while the headset moves. The placement follows the camera-local transform
approach in the [reference article](https://lain-lab.com/posts/astro-43-r3f-webxr-uikit-sync/).
Tune placement, panel dimensions, spacing, colors, and font sizes in
`src/ui/uiConfig.js`. Home is 0.56 × 0.64 m, with 0.22 m square tiles;
WEAPON expands to 0.76 × 0.80 m to fit aligned rows and the three footer buttons.
AUDIO uses 0.88 × 0.64 m with a wider label column for Gun Shot Volume.
`MENU_SCALE` is the UIKit pixel size in meters per layout unit.
Tune numeric row/column sizes, arrow target/icon sizes, group gaps, font sizes,
and magenta `SETTING_VALUE_COLOR` there. `NumericStepSetting` accepts `label`,
`value`, `min`, `max`, `step`, `unit`, and `onChange`; its value is controlled
by the parent. Its fixed `SETTING_STEP_VALUE_WIDTH` includes the signed value
and unit. `NumericSetting` has the same core props plus optional `labelWidth`
and `fractionDigits`; Audio uses a wider label and zero decimal places. Its slider range is
shifted to zero internally so native snapping follows the buttons' lower-bound
grid. Step buttons clamp at the bounds without changing Draft there.

`src/audio/bgmTracks.js` holds `{ id, src }` track objects with Vite's `BASE_URL`.
The first entry is `assets/audio/bgm/observation_zero.ogg`. Add future tracks
there; this implementation selects the first track and centralizes `loop = true`
in `src/audio/audioManager.js`, without random selection or playlist controls.
The BGM player streams one stable HTMLAudioElement through one
MediaElementAudioSourceNode and BGM GainNode. It does not decode the MP3 into an
AudioBuffer. Gunshots retain one decoded WAV buffer and independent overlapping
sources from `assets/audio/sfx/gunshot_pistol.wav`, routed through a separate
Gun Shot GainNode. Both gains connect to the same AudioContext destination.

`App` starts the Audio settings subscription and preloads the gunshot buffer.
Preloading and settings synchronization do not enable BGM playback.
`src/audio/xrAudioLifecycle.js` binds playback to actual XR sessions. Enter VR
calls `unlockAudioContext()` inside its user interaction to resume the shared
context without starting BGM, then requests XR entry. BGM starts only when the
XR store registers an actual session whose `visibilityState` is `visible` and
the BGM setting is ON. Each session has `end` and `visibilitychange` listeners:
`hidden` and `visible-blurred` pause BGM; the same session returning to `visible`
resumes at the retained position when BGM is ON. Ended or replaced sessions pause
BGM and reset `currentTime` to zero, so the next session starts from the beginning.
Those sessions are retired and cannot resume. Session exit or App cleanup removes both listeners;
reconnecting replaces the previous subscription without duplicating listeners.
Failed XR entry never starts BGM. A new visible session starts from the beginning
without changing saved ON/OFF or volume settings. The player rechecks
the current session/visibility before play, handles obsolete play attempts, and
blocks pending playback or Draft rollback from restarting BGM while inactive.
Document visibility and pagehide are not monitored. The player catches rejected
play or resume attempts and can retry on a later interaction. Gunshots await only
context readiness and their own buffer; a loading BGM cannot delay firing audio.
Repeated settings edits reuse the context, gains, media element, and source.
The subscription applies Draft/Applied changes immediately and its cleanup
pauses BGM. Playback position, track index, nodes, and context are runtime-only.

Menu input runs at priority -100, calibration at -70, gun pointer pose at -60,
pointer targeting at -50, and shooting at 0 in each frame. Thus preview and
rollback reach both targeting and shooting in the same frame as B/Y changes.
`RightHandGun` suppresses every firing side effect while Settings is open and
resets the existing trigger gate to require a release to 0.05 or below before
shooting resumes. The original rapid-fire behavior then resumes unchanged.
Ending the XR session closes Settings.

Phase 2 uses a cyan laser from the right gun's `Muzzle_Point`. Both the visible
laser and actual UI pointer use the normalized world-space vector from
`Muzzle_Point` to `Aim_Point`, exactly as shooting does. The controller's
target-ray orientation does not define this line. XR `selectstart` / `selectend`
events drive the normal pointer event system. Step buttons use the release-time
click, with no drag or pointer capture; Audio sliders use the existing pointer
capture and dragging behavior without changing the Weapon pose.
The laser stops at the UI intersection, with a small hit dot. With no hit it
extends to the configured 3 m maximum; hit testing has the same range limit.

The right standard controller pointer is removed, including its interaction.
Settings accepts only the `gun-ui` pointer type, so the left standard controller
ray cannot hover or select it. Y still opens/closes Settings, but selection in
Phase 2 requires the right gun. `GunUIPointer` accepts an input source, helper
objects, enabled state/getter, and optional buffered XR events; it has no hand
selection logic and can be reused for a left gun in a later phase.

Tune `UI_POINTER_MAX_DISTANCE`, `UI_POINTER_LINE_WIDTH`, `UI_POINTER_COLOR`, and
`UI_POINTER_HIT_DOT_SIZE` in `src/ui/uiConfig.js`. The initial line is 2 mm wide,
and the hit dot has a 6 mm radius. The laser is hidden and interaction disabled
when Settings is closed. It is a separate effect from the shooting tracer.

Run the related checks with:

```bash
node --test src/audio/*.test.js src/shooting/*.test.js src/xr/*.test.js src/store/*.test.js src/ui/*.test.js src/userSetting/*.test.js
```

On Quest 3, check B-only and Y-only operation, long presses, A/X doing nothing,
reopening at home, and a usable panel position at different headings. Confirm
that the panel stays fixed when you move your head. Aim the right gun at WEAPON,
pull/release the trigger to select it, then tap each arrow for a single 0.5°
or 0.5 cm adjustment. Hold the trigger and move across rows: values and pose
must not change while held or repeat. Check -90.0° / +90.0° and
-10.0 cm / +10.0 cm limits, sign/zero formatting, magenta value readability,
left alignment with Dual Wield, transparent button backgrounds, black arrows
that stay black on hover,
and arrow hit areas without accidental neighbor activation. Confirm pose updates
do not cause runaway changes or jump values to a bound. Toggle Dual Wield and
choose BACK. Check that the laser
origin is the muzzle and its direction matches shooting at the same gun pose.
Make sure the laser and hit dot follow the actual UI hit and that the left
standard ray does not hover or select Settings. Check
that no shot, gunshot sound, or shooting haptic occurs while using the UI.
Close Settings while holding the trigger: shooting must wait for a full release
and a new pull. Finally check the existing shallow-release rapid-fire cycle.
Check all six values preview immediately and that the laser follows the moved
muzzle. Check SAVE then BACK retains the pose; unsaved BACK, B/Y close, category
exit, and XR exit restore Applied. Test RESET then BACK versus RESET then SAVE,
0.5 cm offsets, each rotation's sign, and editing while SAVED is displayed.
Check SAVE then reload restores all six values and the gun pose; unsaved BACK
then reload and RESET without SAVE then reload retain the last Applied values.
RESET then SAVE then reload must restore Initial. Check first access without
stored data and the same Quest browser/origin after a GitHub Pages redeploy.
Physical readability, reach, rotation feel, and XR interaction require a Quest test.

For AUDIO, confirm BGM starts only after interaction, OFF pauses and ON resumes
at the retained volume/position, sliders preview during dragging, and arrows
change exactly 10%. After SAVE and BACK, check normal shots use the saved Gun
Shot Volume. Test unsaved BACK/B/Y close, RESET without SAVE, RESET plus SAVE,
and reload/re-entry restoring all three Audio settings. Recheck Weapon
calibration, SAVE/RESET/BACK, and persistence after editing Audio.
Check BGM starts after the actual XR session begins, not immediately on Enter VR;
denying or cancelling XR entry must never start BGM. Leaving VR must pause BGM
immediately, including during initial loading. In the same session, `hidden` and
`visible-blurred` must pause and returning to `visible` must resume at the same
position and volume. Session end must reset the position to zero, and re-entry
into a new visible session must start from the beginning at the retained volume. Verify
BGM stays OFF when saved OFF through session start, visibility changes and
re-entry. Check late notifications/play promises from ended sessions do not
restart or interrupt the new session, and that gunshots still work normally.

## Shooting loop V1

In VR, `public/assets/models/weapons/desert_eagle.glb` is attached to the right
controller's grip space through a fixed `XRGripCorrection` rotation of -90°
around X. A separate `DefaultWeaponPose` layer adds a developer-defined
pitch of +25° (yaw and roll 0°) as the neutral handgun stance. The
`WeaponCalibration` wrapper is the user calibration layer, with zero initial
angles and offsets. `weaponCalibration.js` applies local XYZ Euler rotation and
cm-to-meter translation here only. Positive pitch raises the -Z barrel,
positive yaw turns it left, and positive roll tilts the local top left.
The transform order is grip-space → `XRGripCorrection` → `DefaultWeaponPose` →
`WeaponCalibration` → `Gun_Root`. These wrappers do not change the GLB's
internal transforms or scale.
The model's `Gun_Root`, `Muzzle_Point`, and `Aim_Point` are used directly.
`Rear_Point` is retained for a future weapon collider and does not affect firing.
The right controller's analog select trigger fires its first shot when its value
reaches 0.25. After a shot, the gate tracks the deepest pull and waits for at
least 0.03 of release, then tracks the shallowest position and waits for at
least 0.03 of repull before firing again. Returning to 0.05 or below resets
the gate to first-shot behavior. These values are set in `shootingConfig.js`.
Controllers without an analog value use `selectstart` / `selectend` as a digital
fallback. A single `fireWeapon()` call raycasts from the muzzle's world position
toward `Aim_Point`'s
world position, starts a moving white tracer and muzzle flash at the muzzle,
restarts the gunshot audio, and requests a short controller haptic pulse.
Holding or releasing the trigger does not fire additional shots. A distinct
repull after release is required. The muzzle's
rotation and the XR controller's targeting ray do not define the shot direction.

A blue target, 40 cm in diameter, sits at `[0, 1.5, -3]`. A hit turns it red;
it stays visible and red until the page reloads. The tracer travels toward the
hit or maximum range using `TRACER_DURATION_MS` and keeps the firing-time
world-space origin and direction. The flash lasts 75 ms with its existing asset,
scale, and one random roll per shot. `MUZZLE_FLASH_FOLLOW_WEAPON` in
`shootingConfig.js` defaults to `true`: while visible, only the flash follows
`Muzzle_Point`'s current world position and rotation. Set it to `false` to keep
the original flash fixed at the firing-time position and shot orientation.
The old orange `DebugShotRay` remains in the
repository for troubleshooting but is not rendered during normal firing.

The right controller model and standard pointer are absent; its gun muzzle UI
laser is shown only while Settings is open. The left controller keeps the
original pointer, which cannot interact with Settings, and does not fire.
Settings interaction suppresses shooting until the trigger has been released
after closing. A hemisphere light and directional light reveal the gun's dark
materials without changing the GLB.

The existing Zustand cube and ON/OFF control are preserved at x = 0.6 m,
leaving the central shooting lane clear. Tracking poses and hit feedback use
Three.js objects/refs and local state. User calibration's Applied and Draft
values live in Zustand; the fixed grip correction and default weapon pose do not.

Implementation:

- `src/xr/RightHandGun.jsx`: GLB loading, right-controller attachment, trigger
  sampling, and the one-shot `fireWeapon()` event.
- `src/shooting/shoot.js`: hand-independent muzzle raycast; only visible objects
  with `userData.onShotHit` are eligible targets. Other scene meshes do not block
  shots in this prototype.
- `src/shooting/Target.jsx`: local blue-to-red hit response.
- `src/shooting/ShotEffects.jsx`: short moving tracer and muzzle flash.
- `src/shooting/trigger.js`: first-shot threshold and relative release/repull gate.
- `src/shooting/shootingConfig.js`: values to tune during Quest tests.
- `src/shooting/haptics.js`: optional controller pulse.

Run the Three.js shooting checks with:

```bash
node --test src/shooting/shoot.test.js src/shooting/trigger.test.js src/shooting/haptics.test.js src/xr/desertEagle.test.js
```

Quest 3 check: enter VR and hold the right controller in a natural handgun
stance without bending the wrist to aim at the target. Check whether the
Desert Eagle barrel is approximately horizontal. To tune this neutral stance,
change only `WEAPON_POSE_DEG.pitch` in `shootingConfig.js` (try +20°, +25°,
or +30°); leave the fixed XR grip correction and GLB transforms untouched.
Move and rotate the controller to check that the weapon follows at a believable scale.
Aim at the blue target and slowly pull the right trigger. Confirm one shot only
when the trigger reaches the fire threshold: white tracer, brief muzzle flash,
gunshot sound, haptic pulse, and red target on a hit. Holding the trigger should
not repeat; releasing slightly from the deepest pull and then repulling should
fire the next shot. A full release should restore the first-shot threshold.
Check a miss, missing haptics, the left trigger (no shot), and the ON/OFF
control as well. Fine grip-angle calibration is a later task; real-device
alignment remains to be checked.

## React version note

`react` and `react-dom` must use the same version.

Check the installed versions with:

```bash
npm ls react react-dom
```

If the dependency state becomes inconsistent, stop the development server, delete:

```text
node_modules
package-lock.json
```

and reinstall:

```bash
npm install
```

## GitHub Pages

The project is deployed with **GitHub Actions** rather than directly serving the repository root.

GitHub Pages:

https://orangehermit.github.io/deepaim/

The Vite configuration must use:

```js
base: "/deepaim/"
```

Deployment workflow:

```text
.github/workflows/deploy.yml
```

A push to `main` triggers a production build and deploys the generated `dist` directory to GitHub Pages.

## Current development sequence

```text
R3F base
↓
GitHub Pages deployment
↓
WebXR
↓
XR controllers
↓
UI Kit
↓
Reusable XR starter
↓
Deep Aim shooting systems
```
