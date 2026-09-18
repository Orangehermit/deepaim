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
    const defaults = defaultDevSettings();
    const saved = JSON.parse(raw);
    const settings = Object.assign({}, defaults, saved);
    let shouldPersistMigration = false;

    // bulletSpeed used to control only the tracer animation despite its name.
    // Keep the user's saved value while moving it to the explicit tracer key.
    if (saved.tracerSpeed === undefined && saved.bulletSpeed !== undefined) {
      settings.tracerSpeed = saved.bulletSpeed;
      shouldPersistMigration = true;
    }
    if (settings.bulletSpeed !== undefined) {
      delete settings.bulletSpeed;
      shouldPersistMigration = true;
    }
    if (saved.settingsVersion !== defaults.settingsVersion) {
      settings.settingsVersion = defaults.settingsVersion;
      shouldPersistMigration = true;
    }
    if (shouldPersistMigration) {
      localStorage.setItem(STORAGE_KEY_DEV, JSON.stringify(settings, null, 2));
    }
    return settings;
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
