// Прятки: собака прячется за одним из предметов во дворе, ребёнок ищет её касанием. Если не угадал,
// подсказка «холодно / тепло / горячо» (чем ближе к собаке, тем горячее). Нашёл — собака выскакивает,
// настроение растёт. Раундов сколько угодно; выход — кнопка «Назад».

import { h } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';

const H = STR.dog.hide;
const SPOTS = [
  { icon: '🌳', x: 12, y: 58, size: 'big' },
  { icon: '🌿', x: 31, y: 72, size: 'mid' },
  { icon: '📦', x: 50, y: 62, size: 'mid' },
  { icon: '🏠', x: 70, y: 56, size: 'big' },
  { icon: '🌻', x: 89, y: 72, size: 'mid' },
];
const HIDE_MS = 1300; // сколько собака бежит прятаться

export function createHideGame({ app, store, dog, alive, wait }) {
  let found = 0;
  let hiddenAt = -1;
  let phase = 'hiding'; // hiding | seeking | found
  const fresh = () => store.dogs().find((d) => d.id === dog.id) || dog;

  const wrap = h('div', { class: 'dog-wrap hide-dog' }, drawDog(fresh()));
  const counter = h('div', { class: 'ball-counter', text: H.count.replace('{n}', '0') });
  const hint = h('div', { class: 'ball-hint', text: H.closeEyes });
  const effects = h('div', { class: 'dog-effects' });
  const field = h('div', { class: 'hide-field' }, h('div', { class: 'ball-sky' }), h('div', { class: 'ball-lawn' }));
  const buttons = SPOTS.map((spot, i) => {
    const b = h('button', { class: `hide-spot ${spot.size}`, type: 'button', text: spot.icon });
    b.style.left = `${spot.x}%`;
    b.style.top = `${spot.y}%`;
    b.addEventListener('click', () => look(i, b));
    return b;
  });
  field.append(wrap, ...buttons, counter, hint, effects);

  const place = (x, y) => {
    wrap.style.left = `${x}%`;
    wrap.style.top = `${y}%`;
  };

  function floatEffect(emoji, x, y) {
    const fx = h('span', { class: 'dog-fx', text: emoji });
    fx.style.left = `${x}%`;
    fx.style.top = `${y}%`;
    effects.append(fx);
    setTimeout(() => fx.remove(), 1400);
  }

  async function newRound() {
    phase = 'hiding';
    hint.textContent = H.closeEyes;
    hint.hidden = false;
    for (const b of buttons) b.classList.remove('empty', 'open');
    wrap.hidden = false;
    wrap.classList.remove('hop');
    place(50, 76);
    await wait(800);
    if (!alive()) return;
    // Собака бежит к случайному месту и скрывается за предметом.
    let spot = Math.floor(Math.random() * SPOTS.length);
    if (spot === hiddenAt) spot = (spot + 1) % SPOTS.length; // два раза подряд в одном месте — скучно
    hiddenAt = spot;
    wrap.classList.add('running');
    place(SPOTS[spot].x, SPOTS[spot].y + 14);
    await wait(HIDE_MS);
    if (!alive()) return;
    wrap.classList.remove('running');
    wrap.hidden = true;
    phase = 'seeking';
    hint.textContent = H.seek;
  }

  // Ребёнок касается предмета: нашёл собаку или нет.
  async function look(i, b) {
    if (phase !== 'seeking') return;
    if (i !== hiddenAt) {
      b.classList.add('empty');
      const distance = Math.abs(i - hiddenAt);
      const [emoji, text] = distance === 1 ? ['🔥', H.hot] : distance === 2 ? ['😊', H.warm] : ['🥶', H.cold];
      hint.textContent = `${emoji} ${text}`;
      app.services.sounds('hint');
      return;
    }
    phase = 'found';
    b.classList.add('open');
    wrap.hidden = false;
    place(SPOTS[i].x, SPOTS[i].y + 14);
    wrap.classList.add('hop');
    floatEffect('❤️', SPOTS[i].x, SPOTS[i].y - 12);
    app.services.sounds('correct');
    found += 1;
    counter.textContent = H.count.replace('{n}', String(found));
    hint.textContent = H.foundIt;
    store.adjust(dog.id, { mood: 5, dirt: 1, fed: -1 });
    await wait(1700);
    if (!alive()) return;
    newRound();
  }

  newRound();
  return {
    el: h('div', { class: 'ball-game' }, field),
    cleanup() { phase = 'found'; },
  };
}
