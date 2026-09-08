import * as THREE from 'three';
import { createTextPlane } from './TextPlaneFactory.js';

export const WHITEBOARD_WIDTH = 3.6;
export const WHITEBOARD_HEIGHT = 2.1;
export const WHITEBOARD_DEPTH = 0.04;
export const WHITEBOARD_WALL_OFFSET = 0.08;

const ROOM_HALF_WIDTH = 5;
const ROOM_WALL_THICKNESS = 0.16;
const WHITEBOARD_CENTER_HEIGHT = 1.48;
const WHITEBOARD_FRONT_OFFSET = WHITEBOARD_DEPTH / 2 + 0.012;
const MAIN_CATEGORY_TEXT_HEIGHT = 0.24;
const SUBCATEGORY_SLOT_SIZE = 0.48;
const SUBCATEGORY_SLOT_GAP = 0.16;

// The board lies in the Y/Z plane. These are the three independent section
// origins along world Z, making later Quest-side layout tuning straightforward.
export const WHITEBOARD_SECTION_Z = Object.freeze({
  weapon_type: 1.20,
  style: 0,
  modifier: -1.20,
});

function createSubcategoryButton({ label, selected = false, hoverInfo }) {
  const root = new THREE.Group();
  root.name = `SubcategorySlot:${label}`;
  root.rotation.y = Math.PI / 2;

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(SUBCATEGORY_SLOT_SIZE, SUBCATEGORY_SLOT_SIZE, 0.035),
    new THREE.MeshStandardMaterial({
      color: 0x263448,
      emissive: 0x03070d,
      roughness: 0.72,
      metalness: 0.08,
    })
  );
  panel.name = 'SubcategorySelectionFrame';

  // This square plane is the future 1:1 pictogram surface. setIconTexture()
  // replaces the temporary label without changing selection/action logic.
  const iconPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(SUBCATEGORY_SLOT_SIZE * 0.76, SUBCATEGORY_SLOT_SIZE * 0.76),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    })
  );
  iconPlane.name = 'SubcategoryIconPlane';
  iconPlane.position.z = 0.021;

  const temporaryLabel = createTextPlane(label, { height: 0.105 });
  temporaryLabel.name = 'SubcategoryTemporaryLabel';
  temporaryLabel.position.z = 0.024;

  const popupAnchor = new THREE.Object3D();
  popupAnchor.name = `PopupAnchor:${label}`;
  popupAnchor.position.set(0, SUBCATEGORY_SLOT_SIZE * 0.72, 0.10);

  root.add(panel, iconPlane, temporaryLabel, popupAnchor);

  const setSelected = (nextSelected) => {
    panel.material.color.setHex(nextSelected ? 0x285f83 : 0x263448);
    panel.material.emissive.setHex(0x03070d);
    temporaryLabel.userData.setText(label, nextSelected ? '#79d7ff' : '#eaf4ff');
  };

  const setIconTexture = (texture) => {
    iconPlane.material.map = texture;
    iconPlane.material.color.setHex(0xffffff);
    iconPlane.material.opacity = texture ? 1 : 0.06;
    iconPlane.material.needsUpdate = true;
    temporaryLabel.visible = !texture;
  };

  setSelected(selected);
  return { root, panel, iconPlane, popupAnchor, hoverInfo, setSelected, setIconTexture };
}

function createSection(definition) {
  const root = new THREE.Group();
  root.name = `WhiteboardSection:${definition.id}`;
  root.position.z = WHITEBOARD_SECTION_Z[definition.id];

  const heading = createTextPlane(definition.title, {
    color: '#000000',
    height: MAIN_CATEGORY_TEXT_HEIGHT,
  });
  heading.name = `MainCategoryHeading:${definition.id}`;
  heading.position.set(WHITEBOARD_FRONT_OFFSET, 0.70, 0);
  heading.rotation.y = Math.PI / 2;
  root.add(heading);

  const buttons = new Map();
  definition.items.forEach((item, index) => {
    const button = createSubcategoryButton(item);
    button.root.position.set(
      WHITEBOARD_FRONT_OFFSET,
      0.18 - index * (SUBCATEGORY_SLOT_SIZE + SUBCATEGORY_SLOT_GAP),
      0
    );
    root.add(button.root);
    buttons.set(item.id, button);
  });

  return { root, heading, buttons };
}

export function createSelectionWhiteboard(sectionDefinitions) {
  const group = new THREE.Group();
  group.name = 'WhiteboardGroup';
  group.position.set(
    -ROOM_HALF_WIDTH + ROOM_WALL_THICKNESS / 2 + WHITEBOARD_WALL_OFFSET + WHITEBOARD_DEPTH / 2,
    WHITEBOARD_CENTER_HEIGHT,
    0
  );

  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(WHITEBOARD_DEPTH, WHITEBOARD_HEIGHT, WHITEBOARD_WIDTH),
    new THREE.MeshStandardMaterial({
      color: 0xe8edf2,
      emissive: 0x111820,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      roughness: 0.8,
    })
  );
  placeholder.name = 'WhiteboardPlaceholder';
  group.add(placeholder);

  const placeholderEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(placeholder.geometry),
    new THREE.LineBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0.72 })
  );
  placeholderEdges.name = 'WhiteboardPlaceholderEdges';
  placeholder.add(placeholderEdges);

  const sections = new Map();
  for (const definition of sectionDefinitions) {
    const section = createSection(definition);
    group.add(section.root);
    sections.set(definition.id, section);
  }

  return { group, placeholder, sections };
}
