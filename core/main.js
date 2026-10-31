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
import { renderResult, renderChallengeResult } from './screens/result.js';
import { syncChallenges, challengeInfo, completeChallenge } from './challenges.js';
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

let allManifests = []; // все манифесты, включая модуль сложных заданий (для офлайн-кэша)
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
  manifests: [], // обычные модули
  challenge: null, // модуль сложных заданий (modules/challenge), в обычные списки не входит
  go: { menu: showMenu, stickers: showStickers, dog: () => showDog('real'), dogTest: () => showDog('test'), parent: showParent, play },
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
  syncChallenges(app);
  show(renderMenu(app), null, 'menu');
}

function showStickers() {
  if (limitReached()) return showLimit();
  show(renderStickers(app), null, 'stickers');
}

// Рабочий экран собаки (для ребёнка) и тестовый (из раздела для родителя): «Назад» с тестового возвращает на
// экран родителя без повторной проверки для взрослых.
function showDog(scope = 'real') {
  if (limitReached()) return showLimit();
  const onBack = scope === 'test' ? () => show(renderParent(app), null, 'parent') : showMenu;
  show(renderDog(app, { scope, onBack }), null, 'dog');
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

// opts.subject — раздел сложного задания (для модуля сложных заданий).
async function play(manifest, opts = {}) {
  if (isLocked(manifest)) return showMenu();
  if (limitReached()) return showLimit();
  const challenge = manifest.challenge ? challengeInfo(app, opts.subject) : null;
  if (manifest.challenge && !challenge) return showMenu(); // задания уже нет (например, пройдено в другом окне)
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
      challenge,
      onFinish: (result) => {
        if (mine !== runToken) return;
        if (challenge) finishChallenge(challenge.subject, result);
        else finishSeries(manifest, result);
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

// Сложное задание пройдено: косточка вместо звёзд, задание исчезает из раздела.
function finishChallenge(subject, result) {
  const { bones } = completeChallenge(app, subject, result.challengeId);
  const screen = renderChallengeResult(app, { subject, bones });
  show(screen.el, screen.onLeave, 'result');
}

function finishSeries(manifest, result) {
  const stars = starsFor(result.correct, result.total);
  storage.recordSeries(manifest.id, result);
  storage.addStars(stars);
  const cycle = completeSeries(app.manifests, manifest);
  const newChallenges = syncChallenges(app); // каждые 25 звёзд — новое сложное задание
  const screen = renderResult(app, {
    manifest,
    result,
    stars,
    balance: storage.balance(),
    canBuy: CATALOG.some((s) => !storage.owned().includes(s.id) && s.price <= storage.balance()),
    locked: cycle.locked,
    superSticker: cycle.superEarned ? superSticker(storage.supers()) : null,
    newChallenges,
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
    const all = await loadRegistry();
    app.challenge = all.find((m) => m.challenge) || null;
    app.manifests = all.filter((m) => !m.challenge);
    allManifests = all;
  } catch (err) {
    console.error('Не удалось прочитать реестр модулей', err);
  }
  showMenu();
  warmCache(allManifests);
  setInterval(tick, TICK_MS);
}

init();
