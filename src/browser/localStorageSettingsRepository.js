import { defaultOffsets } from '../domain/settings/calibration.js';
import { defaultDevSettings } from '../domain/settings/devSettings.js';

const STORAGE_KEY_GUN = 'deepAimGunOffsets';
const STORAGE_KEY_DEV = 'deepAimDevSettings';

export function loadGunOffsets(gun) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GUN);
    const all = raw ? JSON.parse(raw) : {};

    if (all[gun.id]) {
      return Object.assign(defaultOffsets(), all[gun.id]);
    }

    for (const legacyId of gun.legacyIds) {
      if (all[legacyId]) {
        const migrated = Object.assign(defaultOffsets(), all[legacyId]);
        all[gun.id] = migrated;
        delete all[legacyId];
        localStorage.setItem(STORAGE_KEY_GUN, JSON.stringify(all, null, 2));
        console.log('[DeepAim] migrated offsets from legacy id', legacyId, '->', gun.id);
        return migrated;
      }
    }

    return defaultOffsets();
  } catch (e) {
    console.warn('[DeepAim] gun offset load failed, using defaults', e);
    return defaultOffsets();
  }
}

export function saveGunOffsets(gunId, offsets) {
  let all = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GUN);
    if (raw) all = JSON.parse(raw);
  } catch (e) { /* 破損していたら作り直す */ }
  all[gunId] = offsets;
  try {
    localStorage.setItem(STORAGE_KEY_GUN, JSON.stringify(all, null, 2));
  } catch (e) {
    console.warn('[DeepAim] gun offset save failed', e);
  }
}

export function loadDevSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEV);
    if (!raw) return defaultDevSettings();
    return Object.assign(defaultDevSettings(), JSON.parse(raw));
  } catch (e) {
    console.warn('[DeepAim] dev settings load failed, using defaults', e);
    return defaultDevSettings();
  }
}

export function saveDevSettings(devSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_DEV, JSON.stringify(devSettings, null, 2));
  } catch (e) {
    console.warn('[DeepAim] dev settings save failed', e);
  }
}
