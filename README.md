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

## Shooting loop V1

In VR, `public/assets/models/weapons/desert_eagle.glb` is attached to the right
controller's grip space through a fixed `XRGripCorrection` rotation of -90°
around X. A separate `DefaultWeaponPose` layer adds a developer-defined
pitch of +25° (yaw and roll 0°) as the neutral handgun stance. The identity
`WeaponCalibration` wrapper remains zero-centered for later user adjustment.
The transform order is grip-space → `XRGripCorrection` → `DefaultWeaponPose` →
`WeaponCalibration` → `Gun_Root`. These wrappers do not change the GLB's
internal transforms or scale.
The model's `Gun_Root`, `Muzzle_Point`, and `Aim_Point` are used directly.
`Rear_Point` is retained for a future weapon collider and does not affect firing.
The right controller's analog select trigger fires once when its value reaches
0.85. It must drop below 0.70 before the next shot can fire. Controllers without
an analog value use `selectstart` / `selectend` as a digital fallback. A single
`fireWeapon()` call raycasts from the muzzle's world position toward `Aim_Point`'s
world position, starts a moving white tracer and muzzle flash at the muzzle,
restarts the gunshot audio, and requests a short controller haptic pulse.
Holding or releasing the trigger does not fire additional shots. The muzzle's
rotation and the XR controller's targeting ray do not define the shot direction.

A blue target, 40 cm in diameter, sits at `[0, 1.5, -3]`. A hit turns it red;
it stays visible and red until the page reloads. The tracer travels toward the
hit or maximum range in about 60 ms. The flash lasts about 45 ms. Both effects
use the firing-time muzzle position and direction, so moving the controller
afterward does not move them. The old orange `DebugShotRay` remains in the
repository for troubleshooting but is not rendered during normal firing.

The right controller model is hidden while its UI cursor remains available; its
continuous pointer line is hidden. The left controller keeps the original UI
pointer and does not fire. Using the right trigger on the ON/OFF control also
fires a shot. A hemisphere light and directional light reveal the gun's dark
materials without changing the GLB.

The existing Zustand cube and ON/OFF control are preserved at x = 0.6 m,
leaving the central shooting lane clear. Weapon poses and hit feedback use
Three.js objects/refs and local state, without new Zustand fields. The fixed
grip correction and default weapon pose are not stored in Zustand.

Implementation:

- `src/xr/RightHandGun.jsx`: GLB loading, right-controller attachment, trigger
  sampling, and the one-shot `fireWeapon()` event.
- `src/shooting/shoot.js`: hand-independent muzzle raycast; only visible objects
  with `userData.onShotHit` are eligible targets. Other scene meshes do not block
  shots in this prototype.
- `src/shooting/Target.jsx`: local blue-to-red hit response.
- `src/shooting/ShotEffects.jsx`: short moving tracer and muzzle flash.
- `src/shooting/trigger.js`: threshold crossing and hysteresis.
- `src/shooting/shootingConfig.js`: values to tune during Quest tests.
- `src/shooting/haptics.js`: optional controller pulse.

Run the Three.js shooting checks with:

```bash
node --test src/shooting/shoot.test.js src/shooting/trigger.test.js src/shooting/haptics.test.js src/xr/desertEagle.test.js
```

Quest 3 check: enter VR and hold the right controller in a natural handgun
stance without bending the wrist to aim at the target. Check whether the
Desert Eagle barrel is approximately horizontal. To tune this neutral stance,
change only `DEFAULT_WEAPON_POSE_DEG.pitch` in `RightHandGun.jsx` (try +20°, +25°,
or +30°); leave the fixed XR grip correction and GLB transforms untouched.
Move and rotate the controller to check that the weapon follows at a believable scale.
Aim at the blue target and slowly pull the right trigger. Confirm one shot only
when the trigger reaches the fire threshold: white tracer, brief muzzle flash,
gunshot sound, haptic pulse, and red target on a hit. Holding the trigger should
not repeat; dropping below the reset threshold and pulling again should fire.
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
