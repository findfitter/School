// Тени и вид сверху. Два вида заданий:
//  — тень: показана картинка, среди чёрных силуэтов нужно найти её тень;
//  — вид сверху: показан предмет сбоку (мяч, кубик, кружка, домик…), нужно выбрать, как он выглядит сверху.
// Уровни: 0 — тень, варианты из разных групп (животное, машина, фрукт); 1 — тень, 4 похожие картинки одной группы;
// 2 — вид сверху, 3 заметно разных предмета; 3 — вид сверху, 4 предмета, в том числе похожие (мяч, банка, конус, кружка).
// Подсказка после ошибки: у вида сверху картинка наклоняется («смотрим сверху»); после второй ошибки верный вариант
// подсвечивается. Ошибочные задания повторяются в конце серии. Уровень помнится между сериями (повышение — после 3 верных).
// Ключи заданий: «s:🐘» (тень) и «t:cube» (вид сверху).

import { TEXT } from './texts.js';
import { SHADOW_GROUPS, SOLIDS, EASY_TOPS } from './data.js';

const LEVELS = [
  { type: 'shadow', count: 3, mixed: true },
  { type: 'shadow', count: 4, mixed: false },
  { type: 'top', count: 3, pool: EASY_TOPS },
  { type: 'top', count: 4, pool: SOLIDS.map((s) => s.id) },
];
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const WRONG_BEFORE_POINTING = 2; // после стольких ошибок верный вариант подсвечивается

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const solidById = new Map(SOLIDS.map((s) => [s.id, s]));
const groupOf = new Map(Object.entries(SHADOW_GROUPS).flatMap(([group, list]) => list.map((e) => [e, group])));

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Рисунок из строки SVG (без innerHTML): { front | top } предмета.
function drawing(inner, className) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`, 'image/svg+xml');
  const node = document.importNode(doc.documentElement, true);
  node.setAttribute('class', className);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

// Касание кнопки: срабатывает при отпускании пальца на самой кнопке (и с клавиатуры).
function onTap(button, fn) {
  let down = false;
  button.addEventListener('pointerdown', () => {
    down = true;
    button.classList.add('pressed');
  });
  button.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    button.classList.remove('pressed');
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (under && button.contains(under)) fn();
  });
  const cancel = () => {
    down = false;
    button.classList.remove('pressed');
  };
  button.addEventListener('pointercancel', cancel);
  button.addEventListener('pointerleave', cancel);
  button.addEventListener('click', (e) => {
    if (e.detail === 0) fn();
  });
}

// ---------- Задания ----------
function shadowTask(level, target) {
  const { count, mixed } = LEVELS[level];
  const group = groupOf.get(target);
  let others;
  if (mixed) {
    const groups = shuffle(Object.keys(SHADOW_GROUPS).filter((g) => g !== group)).slice(0, count - 1);
    others = groups.map((g) => pick(SHADOW_GROUPS[g]));
  } else {
    others = shuffle(SHADOW_GROUPS[group].filter((e) => e !== target)).slice(0, count - 1);
  }
  return { type: 'shadow', key: `s:${target}`, target, options: shuffle([target, ...others]), level };
}

function topTask(level, targetId) {
  const { count, pool } = LEVELS[level];
  const topKey = solidById.get(targetId).topKey;
  // варианты — предметы с разным видом сверху (вид сверху у двух вариантов не должен совпадать)
  const others = shuffle(pool.filter((id) => id !== targetId && solidById.get(id).topKey !== topKey)).slice(0, count - 1);
  return { type: 'top', key: `t:${targetId}`, target: targetId, options: shuffle([targetId, ...others]), level };
}

function makeTask(level, used) {
  const cfg = LEVELS[level];
  if (cfg.type === 'shadow') {
    const all = Object.values(SHADOW_GROUPS).flat();
    const fresh = all.filter((e) => !used.has(`s:${e}`));
    return shadowTask(level, pick(fresh.length ? fresh : all));
  }
  const fresh = cfg.pool.filter((id) => !used.has(`t:${id}`));
  return topTask(level, pick(fresh.length ? fresh : cfg.pool));
}

// Трудное задание из прошлых серий («s:🐘» или «t:cube») — на том же уровне, где оно могло встретиться.
function taskFromKey(key) {
  const [kind, value] = [key.slice(0, 1), key.slice(2)];
  if (kind === 's' && groupOf.has(value)) return shadowTask(0, value);
  if (kind === 't' && solidById.has(value)) return topTask(LEVELS[3].pool.includes(value) ? 3 : 2, value);
  return null;
}

const labelOf = (task) => (task.type === 'shadow' ? `${task.target} тень` : `🔦 ${TEXT.objects[task.target]} сверху`);

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

  // ---------- Разметка ----------
  const root = el('div', 'sv');
  const dotsBox = el('div', 'sv-dots');
  const top = el('div', 'sv-top');
  top.append(dotsBox);
  const prompt = el('div', 'sv-prompt');
  const targetBox = el('div', 'sv-target');
  const options = el('div', 'sv-options');
  root.append(top, prompt, targetBox, options);
  ctx.container.append(root);

  const dots = [];
  function addDot(again) {
    const dot = el('span', again ? 'sv-dot again' : 'sv-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }
  for (let i = 0; i < total; i++) addDot(false);

  // ---------- Одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      const isShadow = task.type === 'shadow';

      prompt.textContent = isShadow ? TEXT.promptShadow : TEXT.promptTop;
      const picture = isShadow
        ? el('div', 'sv-emoji', task.target)
        : drawing(solidById.get(task.target).front, 'sv-front');
      picture.classList.add('sv-picture');
      targetBox.replaceChildren(picture);
      options.replaceChildren();

      let correctBtn = null;
      function choose(value, btn) {
        if (locked || !alive) return;
        if (value !== task.target) {
          wrong += 1;
          btn.disabled = true;
          btn.classList.add('faded');
          ctx.sound('hint');
          prompt.textContent = isShadow ? TEXT.hintShadow : TEXT.hintTop;
          if (!isShadow) picture.classList.add('tilt'); // подсказка: смотрим на предмет сверху
          if (wrong >= WRONG_BEFORE_POINTING) correctBtn.classList.add('point');
          return;
        }
        locked = true;
        btn.classList.add('right');
        if (isShadow) btn.classList.add('revealed'); // верная тень «оживает» цветом
        ctx.sound('correct');
        wait(1500).then(() => resolve(wrong === 0));
      }

      for (const value of task.options) {
        const btn = el('button', 'sv-option');
        btn.type = 'button';
        if (isShadow) {
          btn.append(el('span', 'sv-shadow', value));
        } else {
          btn.append(drawing(solidById.get(value).top, 'sv-topview'));
        }
        if (value === task.target) correctBtn = btn;
        onTap(btn, () => choose(value, btn));
        options.append(btn);
      }
    });
  }

  // ---------- Серия ----------
  async function run() {
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();

    // Трудные задания из прошлых серий — в случайных местах серии.
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    for (const key of shuffle([...ctx.hard]).slice(0, 2)) {
      const task = taskFromKey(key);
      if (task && positions.length) planned.set(positions.pop(), task);
    }

    for (let i = 0; i < total; i++) {
      const task = planned.get(i) || makeTask(level, used);
      used.add(task.key);
      const firstTry = await playTask(task);
      ctx.task({ ok: firstTry, level });
      if (!alive) return;
      dots[i].classList.add('done');
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < LEVELS.length - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(task.key, task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Задания, в которых ошиблись, — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i]);
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      level,
      total,
      mistakes: again.map((t) => ({ key: t.key, label: labelOf(t) })),
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
