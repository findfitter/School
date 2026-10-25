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
import { completeSeries, isLocked, superSticker } from './cycles.js';
import { renderMenu } from './screens/menu.js';
import { renderResult } from './screens/result.js';
import { renderStickers } from './screens/stickers.js';
import { renderParent } from './screens/parent.js';

const root = document.getElementById('app');
document.title = STR.appTitle;

const services = {
  voice: VOICE_ENABLED,
  speech: createSpeech(() => storage.settings(), { enabled: VOICE_ENABLED }),
  sounds: createSounds(() => storage.settings()),
};

let cleanup = null;
let runToken = 0;

const app = {
  root,
  services,
  manifests: [],
  go: { menu: showMenu, stickers: showStickers, parent: showParent, play },
};

function show(screen, onLeave = null) {
  runToken += 1;
  services.speech.stop();
  if (cleanup) cleanup();
  cleanup = onLeave;
  root.replaceChildren(screen);
}

function showMenu() {
  show(renderMenu(app));
}

function showStickers() {
  show(renderStickers(app));
}

function showParent() {
  show(renderParent(app));
}

async function play(manifest) {
  if (isLocked(manifest)) return showMenu();
  const container = h('div', { class: 'game-container' });
  const home = button('btn home-btn', '🏠', () => showMenu());
  home.setAttribute('aria-label', STR.common.home);
  const styles = attachStyles(manifest);
  let stopModule = null;
  show(h('div', { class: 'screen game-screen' }, container, home), () => {
    if (typeof stopModule === 'function') stopModule();
    styles.detach();
  });
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
  show(screen.el, screen.onLeave);
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
}

init();
