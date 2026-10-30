// Запуск приложения и переключение экранов.

import { h, button } from './dom.js';
import { STR } from './strings.js';
import { VOICE_ENABLED } from './config.js';
import * as storage from './storage.js';
import { createSpeech } from './speech.js';
import { createSounds } from './sounds.js';
import { loadRegistry, loadModule, attachStyles, warmCache } from './registry.js';
import { createContext } from './context.js';
import { starsFor, CATALOG } from './rewards.js';
import { completeSeries, healCycles, isLocked, superSticker } from './cycles.js';
import { renderMenu } from './screens/menu.js';
import { renderResult } from './screens/result.js';
import { renderStickers } from './screens/stickers.js';
import { renderDog } from './screens/dog.js';
import { renderParent } from './screens/parent.js';
import { renderLimit } from './screens/limit.js';
import { renderGate } from './screens/gate.js';

const root = document.getElementById('app');
document.title = STR.appTitle;

const services = {
  voice: VOICE_ENABLED,
  speech: createSpeech(() => storage.settings(), { enabled: VOICE_ENABLED }),
  sounds: createSounds(() => storage.settings()),
};

let cleanup = null;
let runToken = 0;

// ---------- Время в приложении и дневной лимит ----------
const TICK_MS = 5000; // как часто считаем время
const IDLE_MS = 90000; // без касаний дольше этого время не считается (ребёнок отошёл)
const GRACE_MIN = 5; // сколько минут сверх лимита дают закончить начатое задание

let screenKind = 'menu'; // menu | stickers | dog | game | result | parent | limit | gate
let lastActivity = Date.now();
let lastTick = Date.now();

for (const type of ['pointerdown', 'keydown', 'touchstart']) {
  document.addEventListener(type, () => { lastActivity = Date.now(); }, { passive: true, capture: true });
}

function limitReached(graceMinutes = 0) {
  const limit = storage.todayLimit();
  return limit > 0 && storage.usageOn() >= (limit + graceMinutes) * 60;
}

function tick() {
  const now = Date.now();
  const elapsed = Math.min((now - lastTick) / 1000, (TICK_MS * 2) / 1000);
  lastTick = now;
  if (document.visibilityState !== 'visible') return;
  // Экран для родителей, проверка для взрослых и экран отдыха время не считают.
  if (screenKind !== 'parent' && screenKind !== 'limit' && screenKind !== 'gate' && now - lastActivity < IDLE_MS) {
    storage.addUsage(Math.round(elapsed * 10) / 10);
  }
  if (screenKind === 'menu' || screenKind === 'stickers' || screenKind === 'dog') {
    if (limitReached()) showLimit();
  } else if (screenKind === 'game' || screenKind === 'result') {
    if (limitReached(GRACE_MIN)) showLimit();
  } else if (screenKind === 'limit' && !limitReached()) {
    showMenu(); // наступил новый день или родитель увеличил лимит
  }
}

const app = {
  root,
  services,
  manifests: [],
  go: { menu: showMenu, stickers: showStickers, dog: showDog, parent: showParent, play },
};

function show(screen, onLeave = null, kind = 'menu') {
  screenKind = kind;
  runToken += 1;
  services.speech.stop();
  if (cleanup) cleanup();
  cleanup = onLeave;
  root.replaceChildren(screen);
}

function showMenu() {
  if (limitReached()) return showLimit();
  healCycles(app.manifests);
  show(renderMenu(app), null, 'menu');
}

function showStickers() {
  if (limitReached()) return showLimit();
  show(renderStickers(app), null, 'stickers');
}

function showDog() {
  if (limitReached()) return showLimit();
  show(renderDog(app), null, 'dog');
}

// Вход на экран родителя: сначала проверка «только для взрослых».
// Перерисовка самого экрана родителя (после кнопок на нём) проверку не повторяет.
function showParent() {
  if (screenKind === 'parent') return show(renderParent(app), null, 'parent');
  const gate = renderGate(app, {
    onPass: () => show(renderParent(app), null, 'parent'),
    onCancel: () => showMenu(),
  });
  show(gate.el, gate.onLeave, 'gate');
}

function showLimit() {
  show(renderLimit(app), null, 'limit');
}

async function play(manifest) {
  if (isLocked(manifest)) return showMenu();
  if (limitReached()) return showLimit();
  const container = h('div', { class: 'game-container' });
  const home = button('btn home-btn', '🏠', () => showMenu());
  home.setAttribute('aria-label', STR.common.home);
  const styles = attachStyles(manifest);
  let stopModule = null;
  show(h('div', { class: 'screen game-screen' }, container, home), () => {
    if (typeof stopModule === 'function') stopModule();
    styles.detach();
  }, 'game');
  const mine = runToken;

  try {
    const [mod] = await Promise.all([loadModule(manifest), styles.ready]);
    if (mine !== runToken) return;
    const ctx = createContext({
      container,
      manifest,
      services,
      onFinish: (result) => {
        if (mine === runToken) finishSeries(manifest, result);
      },
    });
    const stop = await mod.start(ctx);
    if (mine !== runToken) {
      if (typeof stop === 'function') stop();
      return;
    }
    stopModule = stop;
  } catch (err) {
    console.error(`Ошибка в модуле «${manifest.id}»`, err);
    if (mine !== runToken) return;
    container.replaceChildren(
      h('div', { class: 'module-error' },
        h('p', { text: STR.errors.module }),
        button('btn primary', '🏠', () => showMenu()))
    );
  }
}

function finishSeries(manifest, result) {
  const stars = starsFor(result.correct, result.total);
  storage.recordSeries(manifest.id, result);
  storage.addStars(stars);
  const cycle = completeSeries(app.manifests, manifest);
  const screen = renderResult(app, {
    manifest,
    result,
    stars,
    balance: storage.balance(),
    canBuy: CATALOG.some((s) => !storage.owned().includes(s.id) && s.price <= storage.balance()),
    locked: cycle.locked,
    superSticker: cycle.superEarned ? superSticker(storage.supers()) : null,
  });
  show(screen.el, screen.onLeave, 'result');
}

// Запрещаем масштабирование жестами и прокрутку во время игры.
function lockGestures() {
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault());
  }
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || e.target.closest('.game-screen')) e.preventDefault();
  }, { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

async function init() {
  lockGestures();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker не запущен', err));
  }
  try {
    app.manifests = await loadRegistry();
  } catch (err) {
    console.error('Не удалось прочитать реестр модулей', err);
  }
  showMenu();
  warmCache(app.manifests);
  setInterval(tick, TICK_MS);
}

init();
