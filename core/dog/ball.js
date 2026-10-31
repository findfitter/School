// Игра «Принеси мяч»: касанием поля (или отпусканием мяча, который тянут пальцем) мяч летит в это место,
// собака бежит за ним, берёт в зубы и возвращается. Каждый принесённый мяч поднимает настроение собаки.
// Играть можно сколько угодно; выход — кнопка «Назад» в шапке.

import { h } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';

const B = STR.dog;
const THROW_MS = 700; // полёт мяча
const RUN_MS = 950; // бег собаки в одну сторону
const HOME = [14, 86]; // где стоит собака (в % поля): центр, низ
const HAND = [88, 88]; // где лежит мяч перед броском
const LIMITS = { x: [30, 95], y: [48, 92] }; // куда можно бросить (в % поля)

export function createBallGame({ app, store, dog, alive, wait }) {
  let fetches = 0;
  let busy = false;
  let dragging = false;

  const field = h('div', { class: 'ball-field', tabindex: '0' });
  const sky = h('div', { class: 'ball-sky' });
  const lawn = h('div', { class: 'ball-lawn' });
  const wrap = h('div', { class: 'dog-wrap ball-dog' }, drawDog(dog));
  const carried = h('div', { class: 'ball-art ball-carried', hidden: true });
  wrap.append(carried);
  const ball = h('div', { class: 'ball-art ball' });
  const counter = h('div', { class: 'ball-counter', text: B.ball.count.replace('{n}', '0') });
  const hint = h('div', { class: 'ball-hint', text: B.ball.hint });
  const effects = h('div', { class: 'dog-effects' });
  field.append(sky, lawn, wrap, ball, counter, hint, effects);

  const place = (el, [x, y]) => {
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
  };
  place(wrap, HOME);
  place(ball, HAND);

  const clampPoint = (x, y) => [
    Math.min(LIMITS.x[1], Math.max(LIMITS.x[0], x)),
    Math.min(LIMITS.y[1], Math.max(LIMITS.y[0], y)),
  ];

  function floatHeart(x, y) {
    const fx = h('span', { class: 'dog-fx', text: '❤️' });
    fx.style.left = `${x}%`;
    fx.style.top = `${y}%`;
    effects.append(fx);
    setTimeout(() => fx.remove(), 1400);
  }

  // Бросок в точку (в % поля): мяч летит по дуге, собака бежит, приносит и возвращается.
  async function throwTo(tx, ty) {
    if (busy || !alive()) return;
    busy = true;
    hint.hidden = true;
    const rect = field.getBoundingClientRect();
    const [x, y] = clampPoint(tx, ty);

    // 1. Полёт мяча по дуге.
    const dx = ((x - HAND[0]) / 100) * rect.width;
    const dy = ((y - HAND[1]) / 100) * rect.height;
    const arc = Math.min(160, Math.hypot(dx, dy) * 0.45);
    const frames = Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      return { transform: `translate(${dx * t}px, ${dy * t - 4 * arc * t * (1 - t)}px) rotate(${t * 540}deg)` };
    });
    app.services.sounds('tap');
    await ball.animate(frames, { duration: THROW_MS, easing: 'linear' }).finished.catch(() => {});
    if (!alive()) return;
    place(ball, [x, y]);

    // 2. Собака бежит к мячу.
    wrap.classList.add('running');
    place(wrap, [Math.max(HOME[0], x - 7), y]);
    await wait(RUN_MS);
    if (!alive()) return;

    // 3. Берёт мяч в зубы и несёт назад.
    ball.hidden = true;
    carried.hidden = false;
    place(wrap, HOME);
    await wait(RUN_MS);
    if (!alive()) return;

    // 4. Кладёт мяч, радуется.
    wrap.classList.remove('running');
    carried.hidden = true;
    place(ball, [HOME[0] + 12, HOME[1] - 2]);
    ball.hidden = false;
    wrap.classList.remove('hop');
    void wrap.offsetWidth; // перезапуск анимации
    wrap.classList.add('hop');
    floatHeart(HOME[0] + 4, HOME[1] - 40);
    app.services.sounds('correct');
    fetches += 1;
    counter.textContent = B.ball.count.replace('{n}', String(fetches));
    store.adjust(dog.id, { mood: 4, dirt: 2, fed: -2 });
    await wait(700);
    if (!alive()) return;

    // 5. Мяч снова у ребёнка в руке.
    place(ball, HAND);
    busy = false;
  }

  // Бросок по касанию поля или по отпусканию мяча, который тянули пальцем.
  const pointToPercent = (e) => {
    const rect = field.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100];
  };
  field.addEventListener('pointerdown', (e) => {
    dragging = true;
    if (!busy && e.target === ball) { try { field.setPointerCapture(e.pointerId); } catch { /* палец уже ушёл */ } }
  });
  field.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    const [x, y] = pointToPercent(e);
    throwTo(x, y);
  });
  field.addEventListener('pointercancel', () => { dragging = false; });
  // Клавиатура: Enter / Пробел бросают мяч в случайное место.
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      throwTo(40 + Math.random() * 50, 55 + Math.random() * 35);
    }
  });

  return {
    el: h('div', { class: 'ball-game' }, field),
    cleanup() {
      busy = true; // новые броски не принимаются
    },
  };
}
