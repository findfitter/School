// Вид сверху. Показан предмет или геометрическое тело (сбоку), нужно выбрать, как оно выглядит сверху.
// Уровни: 0 — предметы попроще (мяч, кубик, домик, пирамида), 3 варианта; 1 — все предметы, 4 варианта, в том числе
// похожие (мяч, банка, конус, кружка); 2 — геометрические тела (куб, цилиндр, пирамида, шестигранная призма,
// бублик, шар), 3 варианта; 3 — вся геометрия, 4 варианта: тела стоят и лежат (цилиндр или конус на боку сверху
// выглядят иначе, чем стоя) — нужно представить предмет в пространстве.
// Подсказка после ошибки: картинка наклоняется («смотрим сверху»); после второй ошибки верный вариант подсвечивается.
// Ошибочные задания повторяются в конце серии. Уровень помнится между сериями (повышение — после 3 верных подряд).
// Ключ задания — «t:id» предмета (например «t:g-cone-side»).

import { TEXT } from './texts.js';
import { SOLIDS, POOLS } from './data.js';

const COUNTS = [3, 4, 3, 4]; // сколько вариантов на каждом уровне
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const WRONG_BEFORE_POINTING = 2; // после стольких ошибок верный вариант подсвечивается

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const solidById = new Map(SOLIDS.map((s) => [s.id, s]));

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
// Варианты — предметы с разным видом сверху (два варианта с одним topKey не показываются: иначе два верных ответа).
function makeTaskFor(level, targetId) {
  const topKey = solidById.get(targetId).topKey;
  const taken = new Set([topKey]);
  const others = [];
  for (const id of shuffle(POOLS[level])) {
    const key = solidById.get(id).topKey;
    if (taken.has(key) || others.length >= COUNTS[level] - 1) continue;
    taken.add(key);
    others.push(id);
  }
  return { key: `t:${targetId}`, target: targetId, options: shuffle([targetId, ...others]), level };
}

function makeTask(level, used) {
  const fresh = POOLS[level].filter((id) => !used.has(`t:${id}`));
  return makeTaskFor(level, pick(fresh.length ? fresh : POOLS[level]));
}

// Трудное задание из прошлых серий («t:cube») — на самом лёгком уровне, где оно встречается.
function taskFromKey(key) {
  const id = key.slice(2);
  if (!key.startsWith('t:') || !solidById.has(id)) return null;
  const level = POOLS.findIndex((pool) => pool.includes(id));
  return level >= 0 ? makeTaskFor(level, id) : null;
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

      prompt.textContent = TEXT.prompt;
      const picture = drawing(solidById.get(task.target).front, 'sv-front sv-picture');
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
          prompt.textContent = task.target.endsWith('-side') ? TEXT.hintLying : TEXT.hint;
          picture.classList.add('tilt'); // подсказка: смотрим на предмет сверху
          if (wrong >= WRONG_BEFORE_POINTING) correctBtn.classList.add('point');
          return;
        }
        locked = true;
        btn.classList.add('right');
        ctx.sound('correct');
        wait(1500).then(() => resolve(wrong === 0));
      }

      for (const value of task.options) {
        const btn = el('button', 'sv-option');
        btn.type = 'button';
        btn.append(drawing(solidById.get(value).top, 'sv-topview'));
        if (value === task.target) correctBtn = btn;
        onTap(btn, () => choose(value, btn));
        options.append(btn);
      }
    });
  }

  // ---------- Серия ----------
  async function run() {
    let level = Math.min(ctx.level ?? 0, POOLS.length - 1); // уровень помнится между сериями (core: ctx.level)
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
        if (clean >= CLEAN_TO_LEVEL_UP && level < POOLS.length - 1) {
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
      mistakes: again.map((t) => ({ key: t.key, label: `🛰️ ${TEXT.objects[t.target]}` })),
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
