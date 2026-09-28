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

## Minimal XR shooting loop

In VR, `public/assets/models/weapons/desert_eagle.glb` is attached to the right
controller's grip space without changing its internal transforms or scale.
The model's `Gun_Root` and `Muzzle_Point` are used directly. `Rear_Point` and
`Aim_Point` confirm that local -Z points out of the barrel.
Each right-controller `select` event fires one instantaneous raycast from the
muzzle's world position and orientation. Holding the trigger does not repeat fire.

A blue target, 40 cm in diameter, sits at `[0, 1.5, -3]`. A hit turns it red;
it stays visible and red until the page reloads. An orange debug line shows the
resolved shot for 150 ms, extending 10 m from the muzzle. It stays at the fired
world coordinates rather than following subsequent controller movement.

The right controller keeps its UI cursor, but its continuous pointer line is
hidden so it cannot be mistaken for the muzzle-based shot line. The left
controller keeps the original UI pointer and does not fire. Using the right
trigger on the ON/OFF control also fires a shot; UI and shooting both listen to
that controller input in this minimal prototype.

The existing Zustand cube and ON/OFF control are preserved at x = 0.6 m,
leaving the central shooting lane clear. Weapon poses and hit feedback use
Three.js objects/refs and local state, without new Zustand fields.

Implementation:

- `src/xr/RightHandGun.jsx`: GLB loading, right-controller attachment, and select input.
- `src/shooting/shoot.js`: hand-independent muzzle raycast; only visible objects
  with `userData.onShotHit` are eligible targets. Other scene meshes do not block
  shots in this prototype.
- `src/shooting/Target.jsx`: local blue-to-red hit response.
- `src/shooting/DebugShotRay.jsx`: temporary shot visualization.

Run the Three.js shooting checks with:

```bash
node --test src/shooting/shoot.test.js src/xr/desertEagle.test.js
```

Quest 3 check: enter VR, move/rotate the right controller, confirm the Desert
Eagle follows it at a believable scale, then aim at the blue target and
press/release the right trigger. Confirm one brief line per trigger action,
that it starts at the barrel opening and follows the barrel axis, and that
the target turns red on a hit. Check a miss, the left trigger (no shot), and
the ON/OFF control as well. Fine grip-angle calibration is a later task;
real-device alignment and input must be checked on the headset.

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
