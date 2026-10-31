// Сложение до 20. Задания генерируются кодом.
// Сложность: после ошибки уровень падает, после двух верных подряд — растёт.
// Ошибочные примеры повторяются в конце серии. Картинок для пересчёта изначально нет: подсказка
// с предметами появляется только после первой ошибки в примере.

import { TEXT } from './texts.js';
import { createKeypad } from '../addition-10/keypad.js';

const OBJECTS = ['🍎', '🍓', '⭐', '🐟', '🐥', '🚗', '🌸', '🎈', '🍪', '🐞'];
const MIN_SUM = 11; // всегда через десяток: сумма больше 10
const MAX = 20;
const LEVEL_MAX_SUM = [13, 15, 17, 20]; // наибольшая сумма на каждом уровне
const START_LEVEL = 1;
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const INPUT_FROM_LEVEL = 2; // с этого уровня ответ вводится цифрами (клавиатура), ниже — выбор из трёх
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const keyOf = (a, b) => `${a}+${b}`;
const labelOf = (a, b) => `${a} + ${b}`;

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeTask(level, used) {
  const max = LEVEL_MAX_SUM[level];
  let a = 1;
  let b = 1;
  for (let attempt = 0; attempt < 30; attempt++) {
    const sum = Math.random() < 0.6 ? rnd(Math.max(MIN_SUM, max - 3), max) : rnd(MIN_SUM, max);
    a = rnd(1, sum - 1);
    b = sum - a;
    if (!used.has(keyOf(a, b))) break;
  }
  return { a, b };
}

function makeChoices(answer) {
  const options = new Set([answer]);
  for (const v of shuffle([-2, -1, 1, 2].map((d) => answer + d))) {
    if (v >= 0 && v <= MAX && options.size < 3) options.add(v);
  }
  return shuffle([...options]);
}

// Трудные задания из прошлых серий («3+4») -> до двух штук в случайных местах серии.
function planHardTasks(hardKeys, total) {
  const tasks = hardKeys
    .map((key) => /^(\d+)\+(\d+)$/.exec(key))
    .filter(Boolean)
    .map((m) => ({ a: Number(m[1]), b: Number(m[2]) }))
    .filter(({ a, b }) => a >= 1 && b >= 1 && a + b >= MIN_SUM && a + b <= MAX);
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
  const root = el('div', 'add20');
  const dotsBox = el('div', 'a20-dots');
  const repeatBtn = el('button', 'a20-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'a20-top');
  top.append(dotsBox, repeatBtn);

  const eqA = el('span');
  const eqB = el('span');
  const slot = el('span', 'a20-slot', '?');
  const equation = el('div', 'a20-eq');
  equation.append(eqA, el('span', 'a20-op', '+'), eqB, el('span', 'a20-op', '='), slot);

  const things = el('div', 'a20-things'); // место под подсказку: пусто, пока ребёнок не ошибся
  const answersBox = el('div', 'a20-answers');
  root.append(top, equation, things, answersBox);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'a20-dot again' : 'a20-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task, level = 0) {
    return new Promise((resolve) => {
      const answer = task.a + task.b;
      const icon = pick(OBJECTS);
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
      let hintShown = false;
      let hintRun = 0;
      const objects = [];

      eqA.textContent = task.a;
      eqB.textContent = task.b;
      slot.textContent = '?';
      slot.className = 'a20-slot';

      answersBox.replaceChildren();
      things.className = 'a20-things';
      things.replaceChildren();

      const sayTask = () =>
        ctx.speak(
          `${TEXT.numbers[task.a]} ${TEXT.plus} ${TEXT.numbers[task.b]}`,
          'ru',
          `${task.a}-plus-${task.b}`
        );
      repeatBtn.onclick = () => sayTask();

      // Подсказка после первой ошибки: предметы по числам из примера, считаем вместе.
      async function showHint() {
        const mine = ++hintRun;
        const makeGroup = (count) => {
          const group = el('div', 'a20-group');
          for (let i = 0; i < count; i++) {
            const thing = el('span', 'a20-thing', icon);
            group.append(thing);
            objects.push(thing);
          }
          return group;
        };
        things.classList.toggle('many', answer > 10);
        things.replaceChildren(makeGroup(task.a), el('span', 'a20-op', '+'), makeGroup(task.b));
        things.classList.add('show');
        await ctx.speak(TEXT.hint, 'ru', 'hint-count-together');
        for (let n = 1; n <= objects.length; n++) {
          if (!alive || mine !== hintRun) return;
          objects[n - 1].append(el('i', 'a20-badge', n));
          ctx.speak(TEXT.numbers[n], 'ru');
          await wait(600);
        }
      }

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
          ctx.sound('hint'); // мягкий сигнал, неверный ответ тускнеет, можно ответить ещё раз
          if (!hintShown) {
            hintShown = true;
            showHint();
          }
          return;
        }
        locked = true;
        hintRun += 1; // останавливает счёт предметов
        objects.forEach((o) => o.classList.add('hop'));
        slot.textContent = answer;
        slot.className = 'a20-slot ok';
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
          const button = el('button', 'a20-answer', value);
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
    let level = Math.min(ctx.level ?? START_LEVEL, LEVEL_MAX_SUM.length - 1); // уровень помнится между сериями (core: ctx.level)
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
        if (clean >= CLEAN_TO_LEVEL_UP && level < LEVEL_MAX_SUM.length - 1) {
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
