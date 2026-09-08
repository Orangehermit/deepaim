import * as THREE from 'three';
import { createTextPlane } from './TextPlaneFactory.js';
import { createSelectionWhiteboard } from './WhiteboardFactory.js?v=revision-09-caveat';

// WebXR replaces the desktop camera transform with the headset pose, so the
// stationary player's forward direction is -Z from the room origin.
const SELECTION_DISPLAY_POSITION = new THREE.Vector3(-0.6, 0.0, 0.0);
const SELECTION_DISPLAY_PLACEHOLDER_SIZE = Object.freeze({ x: 0.50, y: 0.80, z: 1.00 });
const SELECTION_DISPLAY_GUN_CLEARANCE = 0.10;
const SELECTION_DISPLAY_ITEM_HEIGHT = SELECTION_DISPLAY_PLACEHOLDER_SIZE.y + SELECTION_DISPLAY_GUN_CLEARANCE;

const WHITEBOARD_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'weapon_type',
    title: 'WEAPON TYPE',
    items: Object.freeze([
      Object.freeze({ id: 'desert_eagle', label: 'PISTOL', selected: true, hoverInfo: Object.freeze({ title: 'PISTOL' }) }),
      Object.freeze({ id: 'colt_python', label: 'REVOLVER', hoverInfo: Object.freeze({ title: 'REVOLVER' }) }),
    ]),
  }),
  Object.freeze({
    id: 'style',
    title: 'STYLE',
    items: Object.freeze([
      Object.freeze({ id: 'single', label: 'SINGLE', selected: true, hoverInfo: Object.freeze({ title: 'SINGLE' }) }),
      Object.freeze({ id: 'akimbo', label: 'AKIMBO', hoverInfo: Object.freeze({ title: 'AKIMBO' }) }),
    ]),
  }),
  Object.freeze({
    id: 'modifier',
    title: 'MODIFIER',
    items: Object.freeze([
      Object.freeze({ id: 'laser_sight', label: 'LASER SIGHT', hoverInfo: Object.freeze({ title: 'LASER SIGHT' }) }),
      Object.freeze({ id: 'infinite_ammo', label: '∞ AMMO', hoverInfo: Object.freeze({ title: 'INFINITE AMMO' }) }),
    ]),
  }),
]);

function createSurface({ width, height, depth = 0.12, color = 0x273244, emissive = 0x000000 }) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.72, metalness: 0.08 })
  );
}

function createDoor({ label, position, rotationY = 0, color = 0x273244 }) {
  const root = new THREE.Group();
  root.position.copy(position);
  root.rotation.y = rotationY;

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x0e131c, roughness: 0.65 });
  const frameParts = [
    [new THREE.BoxGeometry(0.16, 2.8, 0.20), -0.93, 0, 0],
    [new THREE.BoxGeometry(0.16, 2.8, 0.20), 0.93, 0, 0],
    [new THREE.BoxGeometry(2.02, 0.16, 0.20), 0, 1.32, 0],
  ];
  for (const [geometry, x, y, z] of frameParts) {
    const part = new THREE.Mesh(geometry, frameMaterial);
    part.position.set(x, y, z);
    root.add(part);
  }

  const door = createSurface({ width: 1.65, height: 2.45, color, emissive: 0x07101d });
  root.add(door);

  const sign = createTextPlane(label, { height: 0.34 });
  sign.position.set(0, 1.56, 0.13);
  root.add(sign);

  return { root, highlightMeshes: [door] };
}

function addRoomShell(group, { width, depth, wallColor, floorColor }) {
  const floor = createSurface({ width, height: depth, depth: 0.12, color: floorColor });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  group.add(floor);

  const ceiling = createSurface({ width, height: depth, depth: 0.12, color: 0x151b26 });
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3.0;
  group.add(ceiling);

  const frontWall = createSurface({ width, height: 3, depth: 0.16, color: wallColor });
  frontWall.position.set(0, 1.5, -depth / 2);
  group.add(frontWall);

  const backWall = createSurface({ width, height: 3, depth: 0.16, color: wallColor });
  backWall.position.set(0, 1.5, depth / 2);
  group.add(backWall);

  const leftWall = createSurface({ width: depth, height: 3, depth: 0.16, color: wallColor });
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-width / 2, 1.5, 0);
  group.add(leftWall);

  const rightWall = createSurface({ width: depth, height: 3, depth: 0.16, color: wallColor });
  rightWall.rotation.y = Math.PI / 2;
  rightWall.position.set(width / 2, 1.5, 0);
  group.add(rightWall);
}

function createSelectionDisplay() {
  const group = new THREE.Group();
  group.name = 'WeaponSelectionDisplay';
  group.position.copy(SELECTION_DISPLAY_POSITION);

  // This mount is the fixed replacement point for the future display GLB.
  // It is centered within a 0.50 × 0.80 × 1.00 m volume, with its bottom at floor level.
  const modelMount = new THREE.Group();
  modelMount.name = 'SelectionDisplayModelMount';
  modelMount.position.y = SELECTION_DISPLAY_PLACEHOLDER_SIZE.y / 2;
  group.add(modelMount);

  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(
      SELECTION_DISPLAY_PLACEHOLDER_SIZE.x,
      SELECTION_DISPLAY_PLACEHOLDER_SIZE.y,
      SELECTION_DISPLAY_PLACEHOLDER_SIZE.z
    ),
    new THREE.MeshStandardMaterial({
      color: 0x258dff,
      emissive: 0x062653,
      transparent: true,
      opacity: 0.38,
      roughness: 0.4,
    })
  );
  placeholder.name = 'SelectionDisplayPlaceholder';
  modelMount.add(placeholder);

  const placeholderEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(placeholder.geometry),
    new THREE.LineBasicMaterial({ color: 0x8fe7ff })
  );
  placeholder.add(placeholderEdges);

  const mount = new THREE.Group();
  mount.name = 'SelectionGunMount';
  mount.position.set(0, SELECTION_DISPLAY_ITEM_HEIGHT, 0);
  group.add(mount);

  return {
    group,
    mount,
    modelMount,
    placeholder,
  };
}

export function createEntranceEnvironment({
  onEnterTraining,
  onExit,
  onRightSideDoor,
  onSelectWeaponType,
  onSelectionChanged,
}) {
  const group = new THREE.Group();
  group.name = 'EntranceScene';
  addRoomShell(group, { width: 10, depth: 10, wallColor: 0x202a38, floorColor: 0x151b24 });

  const frontDoor = createDoor({
    label: 'TRAINING ROOM', position: new THREE.Vector3(0, 1.22, -4.82), color: 0x1f4f72,
  });
  group.add(frontDoor.root);

  const backDoor = createDoor({
    label: 'EXIT', position: new THREE.Vector3(0, 1.22, 4.82), rotationY: Math.PI, color: 0x6b2630,
  });
  group.add(backDoor.root);

  const rightDoor = createDoor({
    label: 'COMING SOON', position: new THREE.Vector3(4.82, 1.22, 0), rotationY: -Math.PI / 2, color: 0x463270,
  });
  group.add(rightDoor.root);

  const whiteboard = createSelectionWhiteboard(WHITEBOARD_SECTIONS);
  group.add(whiteboard.group);
  const weapon = whiteboard.sections.get('weapon_type');
  const style = whiteboard.sections.get('style');
  const modifier = whiteboard.sections.get('modifier');

  const selectionDisplay = createSelectionDisplay();
  group.add(selectionDisplay.group);

  const interactives = [
    { root: frontDoor.root, action: onEnterTraining, highlightMeshes: frontDoor.highlightMeshes },
    { root: backDoor.root, action: onExit, highlightMeshes: backDoor.highlightMeshes },
    { root: rightDoor.root, action: onRightSideDoor, highlightMeshes: rightDoor.highlightMeshes },
  ];

  let selectedWeapon = 'desert_eagle';
  let selectedStyle = 'single';
  const selectedModifiers = new Set();

  for (const [id, button] of weapon.buttons) {
    interactives.push({
      root: button.root,
      highlightMeshes: [button.panel],
      hoverInfo: button.hoverInfo,
      popupAnchor: button.popupAnchor,
      action: () => {
        selectedWeapon = id;
        for (const [buttonId, other] of weapon.buttons) other.setSelected(buttonId === id);
        onSelectWeaponType(id);
      },
    });
  }

  for (const [id, button] of style.buttons) {
    interactives.push({
      root: button.root,
      highlightMeshes: [button.panel],
      hoverInfo: button.hoverInfo,
      popupAnchor: button.popupAnchor,
      action: () => {
        selectedStyle = id;
        for (const [buttonId, other] of style.buttons) other.setSelected(buttonId === id);
        onSelectionChanged(`STYLE: ${id.toUpperCase()} selected (placeholder).`);
      },
    });
  }

  for (const [id, button] of modifier.buttons) {
    interactives.push({
      root: button.root,
      highlightMeshes: [button.panel],
      hoverInfo: button.hoverInfo,
      popupAnchor: button.popupAnchor,
      action: () => {
        if (selectedModifiers.has(id)) selectedModifiers.delete(id);
        else selectedModifiers.add(id);
        button.setSelected(selectedModifiers.has(id));
        onSelectionChanged(`MODIFIER: ${id.replace('_', ' ').toUpperCase()} toggled (placeholder).`);
      },
    });
  }

  return {
    group,
    interactives,
    selectionDisplay,
    whiteboard,
    getSelection: () => ({ selectedWeapon, selectedStyle, selectedModifiers: new Set(selectedModifiers) }),
  };
}

export function createTrainingEnvironment({ onReturnEntrance }) {
  const group = new THREE.Group();
  group.name = 'TrainingScene';
  addRoomShell(group, { width: 14, depth: 18, wallColor: 0x25282f, floorColor: 0x17191e });

  const title = createTextPlane('TRAINING  //  PLACEHOLDER', { color: '#ffe0a3', height: 0.6 });
  title.position.set(0, 2.45, -8.7);
  group.add(title);

  const target = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 32),
    new THREE.MeshStandardMaterial({ color: 0x9d2d2d, emissive: 0x250000, roughness: 0.55, side: THREE.DoubleSide })
  );
  target.position.set(0, 1.65, -7.85);
  group.add(target);

  const returnDoor = createDoor({
    label: 'RETURN TO ENTRANCE', position: new THREE.Vector3(0, 1.22, 8.82), rotationY: Math.PI, color: 0x1f4f72,
  });
  group.add(returnDoor.root);

  return {
    group,
    interactives: [
      { root: returnDoor.root, action: onReturnEntrance, highlightMeshes: returnDoor.highlightMeshes },
    ],
  };
}
