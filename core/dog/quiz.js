// «Собака спрашивает»: собака задаёт ребёнку вопросы (посчитать, назвать цвет, сложить, найти лево и право,
// выбрать написанное слово), за верные ответы получает вкусняшки и радуется. Пять вопросов за раз.
// Ошибка — мягкая подсказка и ещё попытка. Вопросы строятся кодом, повторяют пройденное в школе.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';

const Q = STR.dog.quiz;
const TOTAL = 5;
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const COLORS = [
  { name: 'Красный', hex: '#e53935' },
  { name: 'Синий', hex: '#1e66f5' },
  { name: 'Зелёный', hex: '#2e9e4f' },
  { name: 'Жёлтый', hex: '#ffd400' },
  { name: 'Оранжевый', hex: '#fb8c00' },
  { name: 'Фиолетовый', hex: '#8e44ad' },
];
const WORDS = [
  { word: 'кот', emoji: '🐱' }, { word: 'дом', emoji: '🏠' }, { word: 'мяч', emoji: '⚽' }, { word: 'рыба', emoji: '🐟' },
  { word: 'лиса', emoji: '🦊' }, { word: 'слон', emoji: '🐘' }, { word: 'яблоко', emoji: '🍎' }, { word: 'ёлка', emoji: '🌲' },
  { word: 'сова', emoji: '🦉' }, { word: 'торт', emoji: '🍰' },
];
const THINGS = ['⚽', '🍎', '🦴', '⭐', '🐟', '🍪'];

// Каждый вопрос: { text, view (что показать), options: [{ t, v }], answer (индекс), hint }
const GENERATORS = [
  // Сколько предметов?
  () => {
    const n = rnd(2, 6);
    const thing = pick(THINGS);
    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7].filter((x) => x !== n)).slice(0, 2).concat(n);
    return { text: Q.count, view: Array.from({ length: n }, () => thing).join(' '), options: shuffle(numbers).map((x) => ({ t: String(x), ok: x === n })), hint: Q.hintCount };
  },
  // Какого цвета?
  () => {
    const color = pick(COLORS);
    const options = shuffle([color, ...shuffle(COLORS.filter((c) => c !== color)).slice(0, 2)]);
    return { text: Q.color, swatch: color.hex, options: options.map((c) => ({ t: c.name, ok: c === color })), hint: Q.hintColor };
  },
  // Сколько будет?
  () => {
    const a = rnd(1, 6);
    const b = rnd(1, 9 - a);
    const answer = a + b;
    const nums = shuffle([answer - 1, answer + 1, answer + 2, answer - 2].filter((x) => x >= 0 && x !== answer)).slice(0, 2).concat(answer);
    return { text: format(Q.sum, { a, b }), options: shuffle(nums).map((x) => ({ t: String(x), ok: x === answer })), hint: Q.hintSum };
  },
  // Где мяч: слева или справа?
  () => {
    const left = Math.random() < 0.5;
    return { text: Q.side, view: left ? '⚽  🐶' : '🐶  ⚽', options: [{ t: 'Слева', ok: left }, { t: 'Справа', ok: !left }], hint: Q.hintSide };
  },
  // Какое слово написано под картинкой?
  () => {
    const target = pick(WORDS);
    const options = shuffle([target, ...shuffle(WORDS.filter((w) => w !== target)).slice(0, 2)]);
    return { text: Q.word, view: target.emoji, options: options.map((w) => ({ t: w.word, ok: w === target })), hint: Q.hintWord };
  },
];

export function createQuizGame({ app, store, dog, alive, wait, exit }) {
  let asked = 0;
  let correct = 0;
  let locked = false;
  const kinds = shuffle([0, 1, 2, 3, 4]).slice(0, TOTAL); // все пять видов, в случайном порядке

  const wrap = h('div', { class: 'dog-wrap quiz-dog' }, drawDog(store.dogs().find((d) => d.id === dog.id) || dog));
  const bubble = h('div', { class: 'quiz-bubble' });
  const view = h('div', { class: 'quiz-view' });
  const options = h('div', { class: 'quiz-options' });
  const hint = h('div', { class: 'quiz-hint' });
  const progress = h('div', { class: 'quiz-progress' });
  const effects = h('div', { class: 'dog-effects' });
  const left = h('div', { class: 'quiz-dog-side' }, wrap, effects);
  const right = h('div', { class: 'quiz-main' }, progress, bubble, view, options, hint);

  function floatEffect(emoji) {
    const fx = h('span', { class: 'dog-fx', text: emoji });
    fx.style.left = `${40 + Math.random() * 20}%`;
    fx.style.top = '20%';
    effects.append(fx);
    setTimeout(() => fx.remove(), 1400);
  }

  function ask() {
    const q = GENERATORS[kinds[asked]]();
    let wrong = 0;
    locked = false;
    progress.textContent = format(Q.progress, { n: asked + 1, total: TOTAL });
    bubble.textContent = q.text;
    view.replaceChildren();
    if (q.view) view.append(h('div', { class: 'quiz-emoji', text: q.view }));
    if (q.swatch) {
      const swatch = h('div', { class: 'quiz-swatch' });
      swatch.style.background = q.swatch;
      view.append(swatch);
    }
    hint.textContent = '';
    options.replaceChildren(...q.options.map((opt) => {
      const btn = button('btn quiz-option', opt.t, async () => {
        if (locked) return;
        if (!opt.ok) {
          wrong += 1;
          btn.disabled = true;
          btn.classList.add('faded');
          hint.textContent = q.hint;
          app.services.sounds('hint');
          return;
        }
        locked = true;
        btn.classList.add('right');
        if (wrong === 0) correct += 1;
        app.services.sounds('correct');
        floatEffect('🍖');
        wrap.classList.remove('hop');
        void wrap.offsetWidth;
        wrap.classList.add('hop');
        await wait(1200);
        if (!alive()) return;
        asked += 1;
        if (asked >= TOTAL) finish();
        else ask();
      });
      return btn;
    }));
  }

  // Итог: настроение растёт тем больше, чем больше верных ответов с первой попытки.
  function finish() {
    locked = true;
    store.adjust(dog.id, { mood: 4 + correct * 3, fed: correct * 2 });
    app.services.sounds('done');
    right.replaceChildren(
      h('div', { class: 'super-card quiz-result' },
        h('h2', { text: Q.done }),
        h('p', { text: format(Q.result, { n: correct, total: TOTAL }) }),
        button('btn primary big', Q.ok, () => exit())));
  }

  ask();
  return {
    el: h('div', { class: 'quiz-game' }, left, right),
    cleanup() { locked = true; },
  };
}
