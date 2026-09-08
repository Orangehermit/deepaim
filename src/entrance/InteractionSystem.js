import * as THREE from 'three';

export class InteractionSystem {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.targets = [];
    this.hovered = null;
    this.hoverChangedListeners = new Set();
  }

  register(root, {
    action,
    highlightMeshes = [],
    hoverInfo = null,
    popupAnchor = null,
  }) {
    const materialStates = [];
    for (const mesh of highlightMeshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material && material.emissive) {
          materialStates.push({ material, emissive: material.emissive.clone() });
        }
      }
    }

    root.userData.deepAimInteraction = {
      root,
      action,
      materialStates,
      hoverInfo,
      popupAnchor,
    };
    this.targets.push(root);
  }

  addHoverChangedListener(listener) {
    this.hoverChangedListeners.add(listener);
    return () => this.hoverChangedListeners.delete(listener);
  }

  unregister(root) {
    const interaction = root.userData.deepAimInteraction;
    if (this.hovered === interaction) this.clearHover();
    this.targets = this.targets.filter((target) => target !== root);
    delete root.userData.deepAimInteraction;
  }

  update(origin, direction, maxDistance) {
    this.raycaster.set(origin, direction);
    this.raycaster.far = maxDistance;

    const intersections = this.raycaster.intersectObjects(this.targets, true);
    const hit = intersections.find((intersection) => {
      const interaction = this.findInteraction(intersection.object);
      return interaction && this.isVisible(interaction.root);
    });
    const nextHovered = hit ? this.findInteraction(hit.object) : null;
    this.setHovered(nextHovered);

    return hit ? { point: hit.point, interaction: nextHovered } : null;
  }

  fireHovered() {
    if (this.hovered?.action) this.hovered.action();
  }

  clearHover() {
    this.setHovered(null);
  }

  findInteraction(object) {
    let current = object;
    while (current) {
      if (current.userData.deepAimInteraction) return current.userData.deepAimInteraction;
      current = current.parent;
    }
    return null;
  }

  isVisible(object) {
    let current = object;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  setHovered(nextHovered) {
    if (this.hovered === nextHovered) return;

    if (this.hovered) {
      for (const state of this.hovered.materialStates) {
        state.material.emissive.copy(state.emissive);
      }
    }

    this.hovered = nextHovered;
    if (this.hovered) {
      for (const state of this.hovered.materialStates) {
        state.material.emissive.setHex(0x3366ff);
      }
    }

    for (const listener of this.hoverChangedListeners) {
      listener(this.hovered);
    }
  }
}
