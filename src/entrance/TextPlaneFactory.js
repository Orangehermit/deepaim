import * as THREE from 'three';

export const TEXT_STYLE = Object.freeze({
  fontFamily: 'Oxanium',
  fontWeight: 700,
  fontSize: 82,
  color: '#eaf4ff',
  paddingX: 36,
  paddingY: 22,
});

const fontLoads = new Map();

function loadFont({ fontFamily, fontWeight, fontSize }) {
  if (!document.fonts?.load) return null;
  const descriptor = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  if (!fontLoads.has(descriptor)) {
    fontLoads.set(descriptor, document.fonts.load(descriptor).then((fontFaces) => {
      if (fontFaces.length === 0) throw new Error(`Font unavailable: ${descriptor}`);
      return document.fonts.ready;
    }));
  }
  return fontLoads.get(descriptor);
}

export function createTextPlane(text, {
  height = 0.8,
  color = TEXT_STYLE.color,
  fontFamily = TEXT_STYLE.fontFamily,
  fontWeight = TEXT_STYLE.fontWeight,
  fontSize = TEXT_STYLE.fontSize,
  paddingX = TEXT_STYLE.paddingX,
  paddingY = TEXT_STYLE.paddingY,
  fontFallback = 'sans-serif',
  waitForFont = false,
} = {}) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  plane.name = 'TextPlane';

  // Text is decoration only. Excluding it also keeps the camera-independent
  // muzzle ray from treating labels as interaction targets.
  plane.raycast = () => {};

  let currentText = String(text);
  let currentColor = color;

  const draw = () => {
    context.font = `${fontWeight} ${fontSize}px "${fontFamily}", ${fontFallback}`;
    const metrics = context.measureText(currentText);
    const textHeight = Math.ceil(
      (metrics.actualBoundingBoxAscent || fontSize * 0.8)
      + (metrics.actualBoundingBoxDescent || fontSize * 0.2)
    );
    canvas.width = Math.max(1, Math.ceil(metrics.width + paddingX * 2));
    canvas.height = Math.max(1, textHeight + paddingY * 2);

    // Resizing a canvas resets its context state.
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `${fontWeight} ${fontSize}px "${fontFamily}", ${fontFallback}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = currentColor;
    context.fillText(currentText, canvas.width / 2, canvas.height / 2);

    plane.scale.set(height * canvas.width / canvas.height, height, 1);
    texture.needsUpdate = true;
  };

  plane.userData.setText = (nextText, nextColor = currentColor) => {
    currentText = String(nextText);
    currentColor = nextColor;
    draw();
  };

  const fontReady = loadFont({ fontFamily, fontWeight, fontSize });
  if (waitForFont && fontReady) {
    plane.visible = false;
    fontReady
      .then(() => draw())
      .catch(() => draw())
      .finally(() => { plane.visible = true; });
  } else {
    draw();
    fontReady?.then(draw).catch(() => {});
  }
  return plane;
}
