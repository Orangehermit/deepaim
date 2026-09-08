import * as THREE from 'three';

const POPUP_CANVAS_WIDTH = 1024;
const POPUP_CANVAS_HEIGHT = 320;
const POPUP_WORLD_WIDTH = 0.80;
const POPUP_WORLD_HEIGHT = 0.25;
const POPUP_HORIZONTAL_PADDING = 64;
const POPUP_TITLE_FONT_SIZE = 112;
const POPUP_TITLE_MIN_FONT_SIZE = 52;
const POPUP_DESCRIPTION_FONT_SIZE = 58;
const POPUP_DESCRIPTION_MIN_FONT_SIZE = 34;
const POPUP_BACKGROUND_COLOR = '#101b2a';
const POPUP_BORDER_COLOR = '#415b78';
const POPUP_TITLE_COLOR = '#eaf4ff';
const POPUP_DESCRIPTION_COLOR = '#b9c9dc';
const POPUP_FONT_FAMILY = 'Oxanium';

function fontString(weight, size) {
  return `${weight} ${size}px "${POPUP_FONT_FAMILY}", sans-serif`;
}

function fitFontSize(context, text, { weight, maximum, minimum, availableWidth }) {
  context.font = fontString(weight, maximum);
  const measuredWidth = Math.max(1, context.measureText(text).width);
  return Math.max(minimum, Math.min(maximum, Math.floor(maximum * availableWidth / measuredWidth)));
}

export class HoverPopup {
  constructor({ parent, getViewerCamera }) {
    this.getViewerCamera = getViewerCamera;
    this.anchorWorldPosition = new THREE.Vector3();
    this.viewerWorldPosition = new THREE.Vector3();
    this.currentInfo = { title: '', description: '' };

    // Keep one fixed-size canvas for the lifetime of the popup. Quest never has
    // to reallocate this WebGL texture when the hovered label changes.
    this.canvas = document.createElement('canvas');
    this.canvas.width = POPUP_CANVAS_WIDTH;
    this.canvas.height = POPUP_CANVAS_HEIGHT;
    this.context = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    this.root = new THREE.Mesh(
      new THREE.PlaneGeometry(POPUP_WORLD_WIDTH, POPUP_WORLD_HEIGHT),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: false,
        depthWrite: false,
        side: THREE.FrontSide,
      })
    );
    this.root.name = 'HoverPopup';
    this.root.visible = false;
    this.root.raycast = () => {};
    parent.add(this.root);

    this.loadFont();
  }

  loadFont() {
    if (!document.fonts?.load) return;
    Promise.all([
      document.fonts.load(`700 ${POPUP_TITLE_FONT_SIZE}px "${POPUP_FONT_FAMILY}"`),
      document.fonts.load(`600 ${POPUP_DESCRIPTION_FONT_SIZE}px "${POPUP_FONT_FAMILY}"`),
    ])
      .then(() => document.fonts.ready)
      .then(() => this.draw())
      .catch(() => {});
  }

  setInteraction(interaction) {
    if (!interaction?.hoverInfo?.title) {
      this.hide();
      return;
    }

    const { title, description = '', scale = 1 } = interaction.hoverInfo;
    this.currentInfo.title = String(title);
    this.currentInfo.description = String(description);
    this.root.scale.setScalar(scale);
    this.draw();

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

  draw() {
    const { title, description } = this.currentInfo;
    const context = this.context;
    const availableWidth = POPUP_CANVAS_WIDTH - POPUP_HORIZONTAL_PADDING * 2;

    context.clearRect(0, 0, POPUP_CANVAS_WIDTH, POPUP_CANVAS_HEIGHT);
    context.fillStyle = POPUP_BACKGROUND_COLOR;
    context.fillRect(0, 0, POPUP_CANVAS_WIDTH, POPUP_CANVAS_HEIGHT);
    context.strokeStyle = POPUP_BORDER_COLOR;
    context.lineWidth = 8;
    context.strokeRect(4, 4, POPUP_CANVAS_WIDTH - 8, POPUP_CANVAS_HEIGHT - 8);
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const titleFontSize = fitFontSize(context, title, {
      weight: 700,
      maximum: POPUP_TITLE_FONT_SIZE,
      minimum: POPUP_TITLE_MIN_FONT_SIZE,
      availableWidth,
    });
    context.font = fontString(700, titleFontSize);
    context.fillStyle = POPUP_TITLE_COLOR;
    context.fillText(title, POPUP_CANVAS_WIDTH / 2, description ? 115 : POPUP_CANVAS_HEIGHT / 2);

    if (description) {
      const descriptionFontSize = fitFontSize(context, description, {
        weight: 600,
        maximum: POPUP_DESCRIPTION_FONT_SIZE,
        minimum: POPUP_DESCRIPTION_MIN_FONT_SIZE,
        availableWidth,
      });
      context.font = fontString(600, descriptionFontSize);
      context.fillStyle = POPUP_DESCRIPTION_COLOR;
      context.fillText(description, POPUP_CANVAS_WIDTH / 2, 230);
    }

    this.texture.needsUpdate = true;
  }

  hide() {
    this.root.visible = false;
  }
}
