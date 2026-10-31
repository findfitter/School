// Вычитание до 10. Задания генерируются кодом.
// Сложность: после ошибки уровень падает, после двух верных подряд — растёт.
// Ошибочные примеры повторяются в конце серии.

import { TEXT } from './texts.js';
import { createKeypad } from '../addition-10/keypad.js';

const LEVEL_MAX = [5, 7, 9, 10]; // наибольшее уменьшаемое на каждом уровне
const START_LEVEL = 1;
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const INPUT_FROM_LEVEL = 2; // с этого уровня ответ вводится цифрами (клавиатура), ниже — выбор из трёх
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const keyOf = (a, b) => `${a}-${b}`;
const labelOf = (a, b) => `${a} − ${b}`;

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeTask(level, used) {
  const max = LEVEL_MAX[level];
  let a = 2;
  let b = 1;
  for (let attempt = 0; attempt < 30; attempt++) {
    a = Math.random() < 0.5 ? rnd(Math.max(2, max - 2), max) : rnd(2, max);
    // Со 2-го уровня иногда бывает «столько же вычли — ничего не осталось».
    const allowZero = level >= 2 && Math.random() < 0.12;
    b = rnd(1, allowZero ? a : a - 1);
    if (!used.has(keyOf(a, b))) break;
  }
  return { a, b };
}

function makeChoices(answer) {
  const options = new Set([answer]);
  for (const v of shuffle([-2, -1, 1, 2].map((d) => answer + d))) {
    if (v >= 0 && v <= 10 && options.size < 3) options.add(v);
  }
  return shuffle([...options]);
}

// Трудные задания из прошлых серий («7-3») -> до двух штук в случайных местах серии.
function planHardTasks(hardKeys, total) {
  const tasks = hardKeys
    .map((key) => /^(\d+)-(\d+)$/.exec(key))
    .filter(Boolean)
    .map((m) => ({ a: Number(m[1]), b: Number(m[2]) }))
    .filter(({ a, b }) => a >= 1 && b >= 1 && a <= 10 && b <= a);
  const planned = new Map();
  const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
  for (const task of shuffle(tasks).slice(0, 2)) {
    if (positions.length) planned.set(positions.pop(), task);
  }
  return planned;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function start(ctx) {
  const total = ctx.settings.seriesLength;
  let alive = true;
  const timers = new Set();

  const wait = (ms) =>
    new Promise((resolve) => {
      const t = setTimeout(() => {
        timers.delete(t);
        resolve();
      }, ms);
      timers.add(t);
    });

  // ---------- разметка ----------
  const root = el('div', 'sub10');
  const dotsBox = el('div', 's10-dots');
  const repeatBtn = el('button', 's10-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 's10-top');
  top.append(dotsBox, repeatBtn);

  const eqA = el('span');
  const eqB = el('span');
  const slot = el('span', 's10-slot', '?');
  const equation = el('div', 's10-eq');
  equation.append(eqA, el('span', 's10-op', '−'), eqB, el('span', 's10-op', '='), slot);

  const answersBox = el('div', 's10-answers');
  root.append(top, equation, answersBox);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 's10-dot again' : 's10-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task, level = 0) {
    return new Promise((resolve) => {
      const answer = task.a - task.b;
      let wrong = 0;
      let locked = false;
      let pad = null; // цифровая клавиатура (на высоких уровнях)

      // Неверно набрано: «?» вздрагивает, поле очищается, можно набрать ещё раз.
      function wrongInput() {
        pad.lock(true);
        slot.classList.add('kp-wobble');
        const t = setTimeout(() => {
          timers.delete(t);
          slot.classList.remove('kp-wobble');
          pad.clear();
          pad.lock(false);
        }, 500);
        timers.add(t);
      }

      eqA.textContent = task.a;
      eqB.textContent = task.b;
      slot.textContent = '?';
      slot.className = 's10-slot';

      answersBox.replaceChildren();

      const sayTask = () =>
        ctx.speak(
          `${TEXT.numbers[task.a]} ${TEXT.minus} ${TEXT.numbers[task.b]}`,
          'ru',
          `${task.a}-minus-${task.b}`
        );
      repeatBtn.onclick = () => sayTask();

      async function choose(value, button) {
        if (locked || !alive) return;
        if (value !== answer) {
          wrong += 1;
          if (button) {
            button.disabled = true;
            button.classList.add('faded');
          } else {
            wrongInput();
          }
          ctx.sound('hint');
          return;
        }
        locked = true;
        slot.textContent = answer;
        slot.className = 's10-slot ok';
        ctx.sound('correct');
        ctx.speak(TEXT.numbers[answer], 'ru');
        await wait(1400);
        resolve(wrong === 0);
      }

      if (level >= INPUT_FROM_LEVEL) {
        pad = createKeypad({
          digits: String(answer).length,
          onInput: (text) => {
            slot.textContent = text || '?';
          },
          onComplete: (text) => choose(Number(text), null),
        });
        answersBox.append(pad.el);
      } else {
        for (const value of makeChoices(answer)) {
          const button = el('button', 's10-answer', value);
          button.type = 'button';
          makeDraggable(button, slot, () => choose(value, button));
          answersBox.append(button);
        }
      }

      sayTask();
    });
  }

  // Ответ выбирается касанием или перетаскиванием кнопки на «?».
  function makeDraggable(button, target, onChoose) {
    let origin = null;
    let dragging = false;

    const overTarget = (x, y) => {
      const r = target.getBoundingClientRect();
      const pad = 40;
      return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
    };
    const reset = () => {
      origin = null;
      dragging = false;
      button.classList.remove('dragging', 'pressed');
      button.style.transform = '';
      target.classList.remove('hot');
    };

    button.addEventListener('pointerdown', (e) => {
      if (button.disabled) return;
      origin = { x: e.clientX, y: e.clientY };
      button.setPointerCapture(e.pointerId);
      button.classList.add('pressed');
    });
    button.addEventListener('pointermove', (e) => {
      if (!origin) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        dragging = true;
        button.classList.add('dragging');
      }
      if (dragging) {
        button.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
        target.classList.toggle('hot', overTarget(e.clientX, e.clientY));
      }
    });
    button.addEventListener('pointerup', (e) => {
      if (!origin) return;
      const drop = dragging && overTarget(e.clientX, e.clientY);
      const tap = !dragging;
      reset();
      if (drop || tap) onChoose();
    });
    button.addEventListener('pointercancel', reset);
    // Нажатие с клавиатуры (Enter / Пробел).
    button.addEventListener('click', (e) => {
      if (e.detail === 0) onChoose();
    });
  }

  // ---------- серия ----------
  async function run() {
    let level = Math.min(ctx.level ?? START_LEVEL, LEVEL_MAX.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const hardPlan = planHardTasks(ctx.hard, total);

    for (let i = 0; i < total; i++) {
      const task = hardPlan.get(i) || makeTask(level, used);
      used.add(keyOf(task.a, task.b));
      const firstTry = await playTask(task, level);
      ctx.task({ ok: firstTry, level });
      if (!alive) return;
      dots[i].classList.add('done');
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < LEVEL_MAX.length - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(keyOf(task.a, task.b), { key: keyOf(task.a, task.b), label: labelOf(task.a, task.b), task });
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные примеры — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i].task, level);
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      level,
      total,
      mistakes: again.map(({ key, label }) => ({ key, label })),
    });
  }

  run();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
