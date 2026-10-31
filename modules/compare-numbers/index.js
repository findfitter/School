// Сравни числа: между двумя числами или примерами нужно поставить <, = или >.
// Уровни: 0 — числа до 10 с картинками; 1 — числа до 20; 2 — число и пример;
// 3 — два примера. После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные задания повторяются в конце серии.

import { TEXT } from './texts.js';

const OBJECTS = ['🍎', '🍓', '⭐', '🐟', '🐥', '🚗', '🌸', '🎈', '🍪', '🐞'];
const LEVEL_MAX = [10, 20, 20, 20]; // наибольшее число на каждом уровне
const LEVEL_MIN = [1, 0, 0, 0];
const START_LEVEL = 0;
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием
const SIGNS = ['<', '=', '>'];

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

// Значение выражения вида «7», «3+4» или «9-2».
function evaluate(expr) {
  const m = /^(\d+)(?:([+-])(\d+))?$/.exec(expr);
  if (!m) return NaN;
  const a = Number(m[1]);
  if (!m[2]) return a;
  return m[2] === '+' ? a + Number(m[3]) : a - Number(m[3]);
}

// Записать число v числом или примером (сумма либо разность), не выходя за 0..max.
function express(v, max, asExpression) {
  if (!asExpression) return String(v);
  const variants = [];
  if (v >= 2) variants.push('add');
  if (v < max) variants.push('sub');
  if (!variants.length) return String(v);
  if (pick(variants) === 'add') {
    const a = rnd(1, v - 1);
    return `${a}+${v - a}`;
  }
  const b = rnd(1, Math.min(9, max - v));
  return `${v + b}-${b}`;
}

function signOf(l, r) {
  const x = evaluate(l);
  const y = evaluate(r);
  return x < y ? '<' : x > y ? '>' : '=';
}

const keyOf = (task) => JSON.stringify({ l: task.l, r: task.r });
const show = (expr) => expr.replace('+', ' + ').replace('-', ' − ');

function makeTask(level, used) {
  const min = LEVEL_MIN[level];
  const max = LEVEL_MAX[level];
  let task;
  for (let attempt = 0; attempt < 40; attempt++) {
    const left = rnd(min, max);
    const relation = pick(['=', '<', '<', '>', '>']);
    const gap = rnd(1, level >= 2 ? 3 : 4);
    let right = relation === '=' ? left : relation === '<' ? left + gap : left - gap;
    if (right < min || right > max) right = left;
    const leftExpr = express(left, max, level >= 3);
    const rightExpr = express(right, max, level >= 2);
    // На уровне 2 пример стоит с одной из сторон.
    const swap = level === 2 && Math.random() < 0.5;
    task = swap ? { l: rightExpr, r: leftExpr } : { l: leftExpr, r: rightExpr };
    if (task.l !== task.r && !used.has(keyOf(task))) break;
  }
  return task;
}

function planHardTasks(hardKeys, total) {
  const planned = new Map();
  const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
  const tasks = hardKeys
    .map((key) => {
      try {
        const t = JSON.parse(key);
        return Number.isFinite(evaluate(t.l)) && Number.isFinite(evaluate(t.r)) ? { l: t.l, r: t.r } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
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
  const root = el('div', 'compare');
  const dotsBox = el('div', 'cm-dots');
  const repeatBtn = el('button', 'cm-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'cm-top');
  top.append(dotsBox, repeatBtn);

  const prompt = el('div', 'cm-prompt', TEXT.prompt);
  const leftCard = el('div', 'cm-card');
  const rightCard = el('div', 'cm-card');
  const slot = el('div', 'cm-slot', '?');
  const row = el('div', 'cm-row');
  row.append(leftCard, slot, rightCard);
  const bars = el('div', 'cm-bars');
  const signsBox = el('div', 'cm-signs');
  root.append(top, prompt, row, bars, signsBox);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'cm-dot again' : 'cm-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  const sayPrompt = () => ctx.speak(TEXT.prompt, 'ru', 'compare-prompt');
  repeatBtn.onclick = () => sayPrompt();

  // Карточка: число или пример; на 0 уровне под числом — предметы для пересчёта.
  function fillCard(card, expr, withItems, icon) {
    card.replaceChildren(el('div', 'cm-expr', show(expr)));
    if (withItems) {
      const items = el('div', 'cm-items');
      for (let i = 0; i < evaluate(expr); i++) items.append(el('span', '', icon));
      card.append(items);
    }
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      const answer = signOf(task.l, task.r);
      let wrong = 0;
      let locked = false;

      slot.textContent = '?';
      slot.className = 'cm-slot';
      bars.replaceChildren();
      bars.classList.remove('show');
      signsBox.classList.remove('show-captions');
      signsBox.replaceChildren();

      const icon = pick(OBJECTS);
      fillCard(leftCard, task.l, level === 0, icon);
      fillCard(rightCard, task.r, level === 0, icon);

      // Подсказка: столбики длины чисел и подписи к знакам.
      const values = [evaluate(task.l), evaluate(task.r)];
      for (const v of values) {
        const bar = el('div', 'cm-bar');
        const fill = el('div', 'cm-bar-fill', String(v));
        fill.style.width = `${Math.max(8, (v / 20) * 100)}%`;
        bar.append(fill);
        bars.append(bar);
      }

      function choose(sign, button) {
        if (locked || !alive) return;
        if (sign !== answer) {
          wrong += 1;
          button.disabled = true;
          button.classList.add('faded');
          ctx.sound('hint');
          bars.classList.add('show');
          signsBox.classList.add('show-captions');
          return;
        }
        locked = true;
        slot.textContent = sign;
        slot.classList.add('ok');
        button.classList.add('right');
        ctx.sound('correct');
        ctx.speak(`${show(task.l)} ${TEXT.captions[answer]}`, 'ru');
        wait(1600).then(() => resolve(wrong === 0));
      }

      for (const sign of SIGNS) {
        const wrap = el('div', 'cm-sign-wrap');
        const button = el('button', 'cm-sign', sign);
        button.type = 'button';
        makeDraggable(button, slot, () => choose(sign, button));
        wrap.append(button, el('div', 'cm-caption', TEXT.captions[sign]));
        signsBox.append(wrap);
      }

      sayPrompt();
    });
  }

  // Знак ставится касанием или перетаскиванием в серединное окошко.
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
      used.add(keyOf(task));
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
        mistakes.set(keyOf(task), task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные задания — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i], Math.min(level, 1)); // повтор без картинок, но не сложнее уровня
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      level,
      total,
      mistakes: again.map((t) => ({ key: keyOf(t), label: `${show(t.l)} ? ${show(t.r)}` })),
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
