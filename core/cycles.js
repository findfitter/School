// Круги: модули с одинаковым `cycle` в манифесте проходятся по одному разу за круг.
// Пройденный модуль блокируется, пока не пройдены остальные; когда пройдены все —
// ребёнок получает супер-наклейку и все модули круга снова открываются.

import * as storage from './storage.js';
import { WORLDS, WORLD_SIZE, TOTAL_SUPERS } from './rewards.js';

// n-я супер-наклейка (с 1): предмет, его мир, и что произошло с миром.
// После последнего мира наборы повторяются по кругу (лишние лежат отдельным рядом).
export function superSticker(n) {
  const idx = (n - 1) % TOTAL_SUPERS;
  const w = Math.floor(idx / WORLD_SIZE);
  const worldDone = idx % WORLD_SIZE === WORLD_SIZE - 1;
  return {
    ...WORLDS[w].items[idx % WORLD_SIZE],
    world: WORLDS[w],
    worldDone,
    nextWorld: worldDone && w + 1 < WORLDS.length ? WORLDS[w + 1] : null,
    allWorldsDone: worldDone && w + 1 === WORLDS.length,
  };
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

// Если все доступные модули круга уже отмечены пройденными (например, родитель отключил
// непройденный модуль), кнопки остались бы закрытыми навсегда. Тогда круг просто начинается
// заново, без награды: награда выдаётся только за настоящее прохождение (completeSeries).
export function healCycles(manifests) {
  for (const cycleId of new Set(manifests.map((m) => m.cycle).filter(Boolean))) {
    const members = activeMembers(manifests, cycleId);
    const done = storage.cycleDone(cycleId);
    if (members.length && members.every((id) => done.includes(id))) storage.resetCycle(cycleId);
  }
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
