import * as THREE from 'three';
import { GUN_PARAMS, DEV_PARAMS } from '../config/settingsSchemas.js';
import { defaultOffsets, adjustedGunParamValue } from '../domain/settings/calibration.js';
import { defaultDevSettings, adjustedDevSettingValue } from '../domain/settings/devSettings.js';
import { saveGunOffsets, saveDevSettings } from '../browser/localStorageSettingsRepository.js';

const CANVAS_W = 512;
const CANVAS_H = 620;
const Y_BUTTON_INDEX = 5;
const CLICK_COOLDOWN_MS = 150;

export class SettingsPanel {
  constructor({ getCurrentGun, devSettings, onGunChanged, onDevSettingsChanged }) {
    this.getCurrentGun = getCurrentGun;
    this.devSettings = devSettings;
    this.onGunChanged = onGunChanged;
    this.onDevSettingsChanged = onDevSettingsChanged;
    this.state = 'closed';
    this.inputSource = null;
    this.previousYPressed = false;
    this.lastClickTime = 0;
    this.hitAreas = [];
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 12;
    this.group = this.buildPanel();
  }

  buildPanel() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.context = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.34),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide })
    );
    this.mesh.name = 'SettingsPanel';
    this.mesh.position.set(0.02, 0.04, -0.16);
    this.mesh.rotation.x = -Math.PI / 7;

    const group = new THREE.Group();
    group.name = 'SettingsPanelRoot';
    group.add(this.mesh);
    group.visible = false;
    return group;
  }

  attach(controller, inputSource) {
    controller.add(this.group);
    this.inputSource = inputSource;
    this.previousYPressed = false;
  }

  disconnect(inputSource) {
    if (this.inputSource !== inputSource) return;
    this.inputSource = null;
    this.previousYPressed = false;
    this.setState('closed');
  }

  get isOpen() {
    return this.state !== 'closed';
  }

  pollMenuButton() {
    const button = this.inputSource?.gamepad?.buttons?.[Y_BUTTON_INDEX];
    const pressed = Boolean(button?.pressed);
    if (pressed && !this.previousYPressed) {
      this.setState(this.isOpen ? 'closed' : 'icons');
    }
    this.previousYPressed = pressed;
  }

  setState(state) {
    this.state = state;
    this.group.visible = state !== 'closed';
    if (state === 'icons') this.drawIconsMenu();
    else if (state === 'gun') this.drawGunMenu();
    else if (state === 'dev') this.drawDevMenu();
  }

  refreshGun() {
    if (this.state === 'gun') this.drawGunMenu();
  }

  intersect(origin, direction) {
    if (!this.isOpen || !this.group.visible) return null;
    this.group.updateWorldMatrix(true, true);
    this.raycaster.set(origin, direction);
    const hit = this.raycaster.intersectObject(this.mesh, false)[0];
    return hit || null;
  }

  activate(origin, direction) {
    const now = performance.now();
    if (now - this.lastClickTime < CLICK_COOLDOWN_MS) return false;
    this.lastClickTime = now;

    const hit = this.intersect(origin, direction);
    if (!hit?.uv) return false;
    const px = hit.uv.x * CANVAS_W;
    const py = (1 - hit.uv.y) * CANVAS_H;
    const area = this.hitAreas.find(({ x0, y0, x1, y1 }) => px >= x0 && px <= x1 && py >= y0 && py <= y1);
    if (!area) return false;
    this.runAction(area);
    return true;
  }

  drawChrome(title) {
    const ctx = this.context;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(18,20,26,0.96)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = '#5599dd';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CANVAS_W - 4, CANVAS_H - 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, CANVAS_W / 2, 44);
    this.hitAreas = [];
  }

  drawBackButton() {
    const ctx = this.context;
    ctx.fillStyle = '#33445a';
    ctx.fillRect(16, 16, 90, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀ Menu', 61, 42);
    this.hitAreas.push({ action: 'back', x0: 16, y0: 16, x1: 106, y1: 56 });
  }

  drawIconsMenu() {
    this.drawChrome('Settings');
    const ctx = this.context;
    const boxW = 190;
    const boxH = 220;
    const startX = 56;
    const y = 130;
    const items = [
      { action: 'openGun', icon: '🔫', label: 'Gun', x: startX },
      { action: 'openDev', icon: '⚙', label: 'System', x: startX + boxW + 20 },
    ];
    for (const item of items) {
      ctx.fillStyle = '#22314a';
      ctx.fillRect(item.x, y, boxW, boxH);
      ctx.fillStyle = '#ffffff';
      ctx.font = '84px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.icon, item.x + boxW / 2, y + 120);
      ctx.font = '20px sans-serif';
      ctx.fillText(item.label, item.x + boxW / 2, y + boxH - 20);
      this.hitAreas.push({ action: item.action, x0: item.x, y0: y, x1: item.x + boxW, y1: y + boxH });
    }
    ctx.fillStyle = '#8899aa';
    ctx.font = '15px sans-serif';
    ctx.fillText('Press Y to close', CANVAS_W / 2, CANVAS_H - 16);
    this.texture.needsUpdate = true;
  }

  drawParamRows(params, values, startY, action) {
    const rowHeight = 64;
    params.forEach((param, index) => {
      const y = startY + index * rowHeight;
      const displayValue = param.storageScale ? values[param.key] / param.storageScale : values[param.key];
      const valueText = `${Math.round(displayValue * 100) / 100}${param.unit}`;
      const leftX = CANVAS_W - 168;
      const rightX = CANVAS_W - 28;
      const ctx = this.context;
      ctx.textAlign = 'left';
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#c8d6e8';
      ctx.fillText(param.label, 24, y + 30);
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillStyle = '#66ccff';
      ctx.fillText('◀', leftX, y + 34);
      ctx.fillText('▶', rightX, y + 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = '22px sans-serif';
      ctx.fillText(valueText, CANVAS_W - 96, y + 32);
      this.hitAreas.push({ action, key: param.key, direction: -1, x0: leftX - 34, y0: y - 4, x1: leftX + 34, y1: y + 44 });
      this.hitAreas.push({ action, key: param.key, direction: 1, x0: rightX - 34, y0: y - 4, x1: rightX + 34, y1: y + 44 });
    });
    return startY + params.length * rowHeight;
  }

  drawResetButton(y, action) {
    const ctx = this.context;
    ctx.fillStyle = '#5a2f2f';
    ctx.fillRect(CANVAS_W / 2 - 90, y, 180, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Reset', CANVAS_W / 2, y + 29);
    this.hitAreas.push({ action, x0: CANVAS_W / 2 - 90, y0: y, x1: CANVAS_W / 2 + 90, y1: y + 42 });
  }

  drawGunMenu() {
    const currentGun = this.getCurrentGun();
    this.drawChrome(`${currentGun?.definition.displayName || 'Gun'} — Calibration`);
    this.drawBackButton();
    if (currentGun) {
      const afterRows = this.drawParamRows(GUN_PARAMS, currentGun.offsets, 76, 'adjustGun');
      this.drawResetButton(afterRows + 4, 'resetGun');
    }
    this.texture.needsUpdate = true;
  }

  drawDevMenu() {
    this.drawChrome('System Settings');
    this.drawBackButton();
    const afterRows = this.drawParamRows(DEV_PARAMS, this.devSettings, 88, 'adjustDev');
    this.drawResetButton(afterRows + 8, 'resetDev');
    this.texture.needsUpdate = true;
  }

  runAction(area) {
    const currentGun = this.getCurrentGun();
    switch (area.action) {
      case 'openGun': this.setState('gun'); break;
      case 'openDev': this.setState('dev'); break;
      case 'back': this.setState('icons'); break;
      case 'adjustGun': {
        if (!currentGun) break;
        const param = GUN_PARAMS.find(({ key }) => key === area.key);
        currentGun.offsets[area.key] = adjustedGunParamValue(currentGun.offsets[area.key], param, area.direction);
        saveGunOffsets(currentGun.definition.id, currentGun.offsets);
        this.onGunChanged();
        this.drawGunMenu();
        break;
      }
      case 'resetGun':
        if (!currentGun) break;
        Object.assign(currentGun.offsets, defaultOffsets());
        saveGunOffsets(currentGun.definition.id, currentGun.offsets);
        this.onGunChanged();
        this.drawGunMenu();
        break;
      case 'adjustDev': {
        const param = DEV_PARAMS.find(({ key }) => key === area.key);
        this.devSettings[area.key] = adjustedDevSettingValue(this.devSettings[area.key], param, area.direction);
        saveDevSettings(this.devSettings);
        this.onDevSettingsChanged();
        this.drawDevMenu();
        break;
      }
      case 'resetDev':
        Object.assign(this.devSettings, defaultDevSettings());
        saveDevSettings(this.devSettings);
        this.onDevSettingsChanged();
        this.drawDevMenu();
        break;
    }
  }
}
