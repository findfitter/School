// Прогулка: собака идёт по парку, мимо проплывают белка, бабочка, кошка и другие. Нужно успеть коснуться их,
// пока они не скрылись, — собака их «заметила». Восемь встреч; в конце итог и награда: настроение растёт,
// собака немного устаёт и пачкается. Опоздал — ничего страшного, они просто убегают.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';

const W = STR.dog.walk;
const ENCOUNTERS = [
  { emoji: '🐿️', name: 'Белка' },
  { emoji: '🦋', name: 'Бабочка' },
  { emoji: '🐱', name: 'Кошка' },
  { emoji: '🐦', name: 'Птичка' },
  { emoji: '🐸', name: 'Лягушка' },
  { emoji: '🦆', name: 'Утка' },
  { emoji: '🐰', name: 'Кролик' },
  { emoji: '🐌', name: 'Улитка' },
];
const TOTAL = 8; // встреч за прогулку
const GAP_MS = 3300; // через сколько появляется следующая
const PASS_MS = 4600; // сколько встреча проплывает по экрану

export function createWalkGame({ app, store, dog, alive, wait, exit }) {
  let caught = 0;
  let passed = 0;
  let ended = false;
  const fresh = () => store.dogs().find((d) => d.id === dog.id) || dog;

  const wrap = h('div', { class: 'dog-wrap walk-dog running' }, drawDog(fresh()));
  const counter = h('div', { class: 'ball-counter', text: format(W.count, { n: 0, total: TOTAL }) });
  const hint = h('div', { class: 'ball-hint', text: W.hint });
  const effects = h('div', { class: 'dog-effects' });
  const trees = h('div', { class: 'walk-trees', text: '🌳 🌲 🏡 🌳 🌲 🌳 🌲 🌼 🌳 🏡 🌲 🌳 🌳 🌲 🌳 🌲 🏡 🌳 🌲 🌼 🌳 🏡 🌲 🌳' });
  const ground = h('div', { class: 'walk-ground' });
  const field = h('div', { class: 'walk-field' }, h('div', { class: 'ball-sky' }), trees, ground, wrap, counter, hint, effects);

  function floatEffect(emoji, x, y) {
    const fx = h('span', { class: 'dog-fx', text: emoji });
    fx.style.left = `${x}%`;
    fx.style.top = `${y}%`;
    effects.append(fx);
    setTimeout(() => fx.remove(), 1400);
  }

  function updateCounter() {
    counter.textContent = format(W.count, { n: caught, total: TOTAL });
  }

  // Одна встреча: появляется справа, плывёт влево; касание — «заметили».
  function spawn(info) {
    const el = button('walk-enc', info.emoji, () => {
      if (el.classList.contains('caught') || ended) return;
      el.classList.add('caught');
      caught += 1;
      updateCounter();
      hint.textContent = `${info.name}!`;
      hint.hidden = false;
      app.services.sounds('correct');
      wrap.classList.remove('hop');
      void wrap.offsetWidth;
      wrap.classList.add('hop');
      floatEffect('❤️', 22, 40);
      setTimeout(() => el.remove(), 500);
    });
    el.style.top = `${22 + Math.random() * 42}%`;
    el.style.animationDuration = `${PASS_MS}ms`;
    field.append(el);
    setTimeout(() => {
      if (!el.isConnected || el.classList.contains('caught')) return;
      passed += 1;
      el.remove();
    }, PASS_MS);
  }

  async function run() {
    await wait(1200);
    hint.hidden = true;
    for (let i = 0; i < TOTAL; i++) {
      if (!alive() || ended) return;
      spawn(ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)]);
      await wait(GAP_MS);
    }
    await wait(PASS_MS - GAP_MS + 300); // последние уходят
    if (!alive() || ended) return;
    finish();
  }

  // Итог прогулки: настроение растёт, собака устала и испачкалась.
  function finish() {
    ended = true;
    wrap.classList.remove('running');
    store.adjust(dog.id, { mood: 6 + caught * 2, dirt: 12, fed: -8 });
    app.services.sounds('done');
    field.append(
      h('div', { class: 'overlay bought-popup' },
        h('div', { class: 'super-card' },
          h('h2', { text: W.done }),
          h('p', { text: format(W.result, { n: caught, total: TOTAL }) }),
          button('btn primary big', W.ok, () => exit()))));
  }

  run();
  return {
    el: h('div', { class: 'ball-game' }, field),
    cleanup() { ended = true; },
  };
}
