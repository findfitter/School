// Круги: модули с одинаковым `cycle` в манифесте проходятся по одному разу за круг.
// Пройденный модуль блокируется, пока не пройдены остальные; когда пройдены все —
// ребёнок получает супер-наклейку и все модули круга снова открываются.

import * as storage from './storage.js';
import { SUPER_STICKERS } from './rewards.js';

// n-я супер-наклейка (с 1); после последней набор повторяется.
export function superSticker(n) {
  return SUPER_STICKERS[(n - 1) % SUPER_STICKERS.length];
}

// Модуль закрыт, если уже пройден в текущем круге.
export function isLocked(manifest) {
  return Boolean(manifest.cycle) && storage.cycleDone(manifest.cycle).includes(manifest.id);
}

// Модули круга, которые родитель не выключил.
function activeMembers(manifests, cycleId) {
  const off = new Set(storage.settings().disabledModules);
  return manifests.filter((m) => m.cycle === cycleId && !off.has(m.id)).map((m) => m.id);
}

// Вызывается, когда серия модуля завершена.
// Возвращает { superEarned, locked }: получена ли супер-наклейка и закрыт ли теперь модуль.
export function completeSeries(manifests, manifest) {
  if (!manifest.cycle) return { superEarned: false, locked: false };
  storage.markCycleDone(manifest.cycle, manifest.id);
  const done = storage.cycleDone(manifest.cycle);
  if (activeMembers(manifests, manifest.cycle).every((id) => done.includes(id))) {
    storage.resetCycle(manifest.cycle);
    storage.addSuper();
    return { superEarned: true, locked: false };
  }
  return { superEarned: false, locked: true };
}
