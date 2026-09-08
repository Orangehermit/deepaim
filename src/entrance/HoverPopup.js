import * as THREE from 'three';
import { createTextPlane } from './TextPlaneFactory.js';

const POPUP_TITLE_HEIGHT = 0.16;
const POPUP_DESCRIPTION_HEIGHT = 0.085;
const POPUP_PADDING_X = 0.07;
const POPUP_PADDING_Y = 0.055;
const POPUP_CONTENT_GAP = 0.035;

export class HoverPopup {
  constructor({ parent, getViewerCamera }) {
    this.parent = parent;
    this.getViewerCamera = getViewerCamera;
    this.anchorWorldPosition = new THREE.Vector3();
    this.viewerWorldPosition = new THREE.Vector3();

    this.root = new THREE.Group();
    this.root.name = 'HoverPopup';
    this.root.visible = false;

    this.background = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x101b2a,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.background.name = 'HoverPopupBackground';
    this.background.raycast = () => {};

    // Non-empty initial text ensures the CanvasTexture has valid content before
    // its first GPU upload. The popup remains hidden until a target is hovered.
    this.title = createTextPlane('INFO', { height: POPUP_TITLE_HEIGHT });
    this.title.name = 'HoverPopupTitle';
    this.title.position.z = 0.006;

    this.description = createTextPlane('INFO', {
      height: POPUP_DESCRIPTION_HEIGHT,
      color: '#b9c9dc',
      fontWeight: 600,
    });
    this.description.name = 'HoverPopupDescription';
    this.description.position.z = 0.006;

    this.root.add(this.background, this.title, this.description);
    parent.add(this.root);
  }

  setInteraction(interaction) {
    if (!interaction?.hoverInfo?.title) {
      this.hide();
      return;
    }

    const { title, description = '' } = interaction.hoverInfo;
    this.title.userData.setText(title);
    this.description.userData.setText(description);
    this.description.visible = Boolean(description);

    const titleWidth = this.title.scale.x;
    const descriptionWidth = this.description.visible ? this.description.scale.x : 0;
    const contentWidth = Math.max(titleWidth, descriptionWidth);
    const contentHeight = this.description.visible
      ? POPUP_TITLE_HEIGHT + POPUP_CONTENT_GAP + POPUP_DESCRIPTION_HEIGHT
      : POPUP_TITLE_HEIGHT;

    this.background.scale.set(
      contentWidth + POPUP_PADDING_X * 2,
      contentHeight + POPUP_PADDING_Y * 2,
      1
    );
    this.title.position.y = this.description.visible
      ? (POPUP_DESCRIPTION_HEIGHT + POPUP_CONTENT_GAP) / 2
      : 0;
    this.description.position.y = -(POPUP_TITLE_HEIGHT + POPUP_CONTENT_GAP) / 2;

    const anchor = interaction.popupAnchor || interaction.root;
    anchor.getWorldPosition(this.anchorWorldPosition);
    this.root.position.copy(this.anchorWorldPosition);

    const viewerCamera = this.getViewerCamera?.();
    if (viewerCamera) {
      viewerCamera.getWorldPosition(this.viewerWorldPosition);
      this.root.lookAt(this.viewerWorldPosition);
    }

    this.root.visible = true;
  }

  hide() {
    this.root.visible = false;
  }
}
