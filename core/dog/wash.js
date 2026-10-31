// Мытьё собаки: на ней видны пятна грязи, ребёнок трёт их пальцем (или касается пятна несколько раз),
// когда все пятна смыты — кнопка «Смыть» включает душ. Тратится один шампунь, собака чистая и довольная.

import { h, button } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog, DIRTY_AT } from '../dogs.js';

const W = STR.dog;
const SPOT_RADIUS = 34; // px: на таком расстоянии от пальца пятно оттирается
const RUB_NEEDED = 150; // сколько пикселей движения нужно, чтобы оттереть пятно
const TAP_PROGRESS = 0.5; // обычное касание пятна оттирает его наполовину

export function createWashGame({ app, store, dog, alive, wait, exit }) {
  const spotCount = dog.dirt >= 70 ? 7 : dog.dirt >= DIRTY_AT ? 5 : 3;
  let remaining = spotCount;
  let rinsing = false;

  // На картинке не рисуем грязь (spots) — вместо неё интерактивные пятна поверх.
  const artSvg = h('div', { class: 'wash-svg' }, drawDog({ ...dog, dirt: 0 }));
  const spotLayer = h('div', { class: 'wash-spots' });
  const art = h('div', { class: 'wash-art' }, artSvg, spotLayer);
  const foam = h('div', { class: 'wash-foam' });
  const water = h('div', { class: 'wash-water' });
  const sparkles = h('div', { class: 'wash-sparkles' });
  const stage = h('div', { class: 'wash-stage' }, art, foam, water, sparkles);
  const hint = h('div', { class: 'wash-hint', text: W.washGame.hint });
  const rinse = button('btn primary big wash-rinse', `🚿 ${W.washGame.rinse}`, () => doRinse());
  rinse.hidden = true;

  // Пятна: случайные места на собаке (в % картинки).
  const spots = Array.from({ length: spotCount }, (_, i) => {
    const el = h('div', { class: 'wash-spot', text: '🟤' });
    el.style.left = `${24 + Math.random() * 52}%`;
    el.style.top = `${36 + Math.random() * 50}%`;
    el.dataset.progress = '0';
    el.style.setProperty('--s', String(0.9 + Math.random() * 0.5));
    spotLayer.append(el);
    return el;
  });

  function rub(el, amount) {
    if (el.classList.contains('gone') || rinsing) return;
    const progress = Math.min(1, Number(el.dataset.progress) + amount);
    el.dataset.progress = String(progress);
    el.style.opacity = String(1 - progress * 0.85);
    if (progress >= 1) {
      el.classList.add('gone');
      remaining -= 1;
      app.services.sounds('tap');
      sparkle(el, '✨');
      if (remaining === 0) {
        hint.textContent = W.washGame.rinseHint;
        rinse.hidden = false;
      }
    }
  }

  function sparkle(el, emoji) {
    const box = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const fx = h('span', { class: 'dog-fx', text: emoji });
    fx.style.left = `${((r.left + r.width / 2 - box.left) / box.width) * 100}%`;
    fx.style.top = `${((r.top - box.top) / box.height) * 100}%`;
    sparkles.append(fx);
    setTimeout(() => fx.remove(), 1300);
  }

  // Растирание пальцем: пятна рядом с пальцем оттираются по мере движения.
  let last = null;
  let travelled = 0; // сколько палец прошёл с момента касания: мало — это обычный тап
  stage.addEventListener('pointerdown', (e) => {
    last = [e.clientX, e.clientY];
    travelled = 0;
    try { stage.setPointerCapture?.(e.pointerId); } catch { /* палец уже ушёл */ }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!last || rinsing) return;
    const moved = Math.hypot(e.clientX - last[0], e.clientY - last[1]);
    last = [e.clientX, e.clientY];
    travelled += moved;
    if (moved < 1) return;
    for (const el of spots) {
      if (el.classList.contains('gone')) continue;
      const r = el.getBoundingClientRect();
      if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < SPOT_RADIUS) rub(el, moved / RUB_NEEDED);
    }
    bubble(e);
  });
  // Обычное касание пятна (палец почти не двигался) оттирает его частично.
  stage.addEventListener('pointerup', (e) => {
    const tap = last && travelled < 10;
    last = null;
    if (!tap || rinsing) return;
    let best = null;
    let bestDistance = SPOT_RADIUS + 14;
    for (const el of spots) {
      if (el.classList.contains('gone')) continue;
      const r = el.getBoundingClientRect();
      const distance = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (distance < bestDistance) { best = el; bestDistance = distance; }
    }
    if (best) rub(best, TAP_PROGRESS);
  });
  stage.addEventListener('pointercancel', () => { last = null; });
  // Клавиатура: Enter / Пробел оттирают следующее пятно.
  stage.tabIndex = 0;
  stage.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const next = spots.find((el) => !el.classList.contains('gone'));
    if (next) rub(next, TAP_PROGRESS);
  });

  // Пена там, где водят пальцем.
  let lastBubble = 0;
  function bubble(e) {
    const now = performance.now();
    if (now - lastBubble < 90) return;
    lastBubble = now;
    const box = stage.getBoundingClientRect();
    const b = h('span', { class: 'wash-bubble', text: '🫧' });
    b.style.left = `${e.clientX - box.left}px`;
    b.style.top = `${e.clientY - box.top}px`;
    foam.append(b);
    setTimeout(() => b.remove(), 900);
  }

  async function doRinse() {
    if (rinsing || remaining > 0) return; // смывать можно, когда пятен не осталось
    rinsing = true;
    rinse.hidden = true;
    hint.textContent = '';
    app.services.sounds('hint');
    for (let i = 0; i < 28; i++) {
      const d = h('span', { class: 'wash-drop', text: '💧' });
      d.style.left = `${10 + Math.random() * 80}%`;
      d.style.animationDelay = `${(Math.random() * 1.1).toFixed(2)}s`;
      water.append(d);
    }
    await wait(1900);
    if (!alive()) return;
    water.replaceChildren();
    store.washDog(dog.id);
    artSvg.replaceChildren(drawDog({ ...dog, dirt: 0, mood: 100 }));
    art.classList.add('shiny');
    for (let i = 0; i < 6; i++) sparkles.append(h('span', { class: 'wash-shine', text: '✨', style: `left:${15 + i * 14}%;top:${20 + (i % 3) * 22}%;animation-delay:${i * 0.1}s` }));
    app.services.sounds('done');
    await wait(900);
    if (!alive()) return;
    stage.append(
      h('div', { class: 'overlay bought-popup' },
        h('div', { class: 'super-card' },
          h('h2', { text: W.washGame.done }),
          button('btn primary big', W.washGame.ok, () => exit()))));
  }

  return {
    el: h('div', { class: 'wash-game' }, stage, hint, rinse),
    cleanup() {
      rinsing = true;
    },
  };
}
