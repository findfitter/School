// Повороты (мысленное вращение). Показана фигура из клеток; нужно найти среди вариантов такую же, только повёрнутую.
// Неверные варианты: зеркальное отражение (его поворотом не получить) и фигура с одной переставленной клеткой.
// Уровни: 0 — 4 клетки, 3 варианта (неверные — с переставленной клеткой); 1 — 5 клеток, 3 варианта, есть зеркальная;
// 2 — 5 клеток, 4 варианта; 3 — 6 клеток (поле 4×4), 4 варианта.
// Подсказка после ошибки: фигура сама поворачивается нужным образом; после второй ошибки верный вариант подсвечивается.
// Задание строится из числа (seed), поэтому «трудное» задание можно показать снова точно таким же (ключ «уровень:seed»).
// Уровень помнится между сериями; повышение — после трёх верных подряд; ошибочные задания повторяются в конце серии.

import { TEXT } from './texts.js';

const LEVELS = [
  { n: 4, N: 3, distractors: ['changed', 'changed'] },
  { n: 5, N: 3, distractors: ['mirror', 'changed'] },
  { n: 5, N: 3, distractors: ['mirror', 'mirror', 'changed'] },
  { n: 6, N: 4, distractors: ['mirror', 'mirror', 'changed'] },
];
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const WRONG_BEFORE_POINTING = 2; // после стольких ошибок верный вариант подсвечивается
const COLORS = ['#4f8cff', '#ef6f8f', '#3fb06a', '#f59e0b', '#8e6bd8'];
const NS = 'http://www.w3.org/2000/svg';

// ---------- Случайные числа и фигуры ----------
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickFrom = (rnd, list) => list[Math.floor(rnd() * list.length)];

function shuffle(rnd, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Клетки — пары [строка, столбец] в квадрате N×N. Поворот по часовой стрелке совпадает с CSS rotate(90deg).
const rotCells = (cells, N, k) => {
  let out = cells;
  for (let i = 0; i < k; i++) out = out.map(([r, c]) => [c, N - 1 - r]);
  return out;
};
const mirrorCells = (cells, N) => cells.map(([r, c]) => [r, N - 1 - c]);
const frameKey = (cells) => cells.map(([r, c]) => r * 10 + c).sort((a, b) => a - b).join(',');
const canon = (cells) => {
  const minR = Math.min(...cells.map((x) => x[0]));
  const minC = Math.min(...cells.map((x) => x[1]));
  return frameKey(cells.map(([r, c]) => [r - minR, c - minC]));
};

// Все положения фигуры (повороты и зеркало), без учёта сдвига.
function symmetries(cells, N) {
  const set = new Set();
  for (let k = 0; k < 4; k++) {
    set.add(canon(rotCells(cells, N, k)));
    set.add(canon(rotCells(mirrorCells(cells, N), N, k)));
  }
  return set;
}

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function isConnected(cells) {
  const keys = new Set(cells.map(([r, c]) => `${r},${c}`));
  const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
  const queue = [cells[0]];
  while (queue.length) {
    const [r, c] = queue.pop();
    for (const [dr, dc] of NEIGHBORS) {
      const key = `${r + dr},${c + dc}`;
      if (keys.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push([r + dr, c + dc]);
      }
    }
  }
  return seen.size === cells.length;
}

function neighborsOf(cells, N) {
  const taken = new Set(cells.map(([r, c]) => `${r},${c}`));
  const out = [];
  for (const [r, c] of cells) {
    for (const [dr, dc] of NEIGHBORS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < N && nc < N && !taken.has(`${nr},${nc}`)) out.push([nr, nc]);
    }
  }
  return out;
}

function randomShape(rnd, n, N) {
  const cells = [[Math.floor(rnd() * N), Math.floor(rnd() * N)]];
  while (cells.length < n) cells.push(pickFrom(rnd, neighborsOf(cells, N)));
  return cells;
}

// Фигура, похожая на данную, но с одной переставленной клеткой (и не совпадающая с ней в любом повороте или отражении).
function changedShape(rnd, cells, N, banned) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const drop = Math.floor(rnd() * cells.length);
    const rest = cells.filter((_, i) => i !== drop);
    if (!isConnected(rest)) continue;
    const spots = neighborsOf(rest, N).filter(([r, c]) => !(r === cells[drop][0] && c === cells[drop][1]));
    if (!spots.length) continue;
    const next = [...rest, pickFrom(rnd, spots)];
    if (!banned.has(canon(next))) return next;
  }
  return null;
}

// Задание целиком строится из seed и уровня.
function makeTask(level, seed) {
  const { n, N, distractors } = LEVELS[level];
  const needMirror = distractors.includes('mirror');
  for (let attempt = 0; attempt < 400; attempt++) {
    const rnd = rngOf(seed + attempt * 7919);
    const cells = randomShape(rnd, n, N);
    const rotCanon = [0, 1, 2, 3].map((k) => canon(rotCells(cells, N, k)));
    const angles = [1, 2, 3].filter((k) => rotCanon[k] !== rotCanon[0]); // повернув, фигура должна измениться
    if (!angles.length) continue;
    if (needMirror && rotCanon.includes(canon(mirrorCells(cells, N)))) continue; // у зеркальной должна быть отличная от поворота форма
    const k = pickFrom(rnd, angles);
    const banned = symmetries(cells, N);
    const correct = rotCells(cells, N, k);
    const options = [{ cells: correct, correct: true }];
    const used = new Set([canon(correct)]);
    let ok = true;
    for (const kind of distractors) {
      const base = kind === 'mirror' ? mirrorCells(cells, N) : changedShape(rnd, cells, N, banned);
      const found = base && shuffle(rnd, [0, 1, 2, 3]).map((r) => rotCells(base, N, r)).find((c) => !used.has(canon(c)));
      if (!found) {
        ok = false;
        break;
      }
      used.add(canon(found));
      options.push({ cells: found, correct: false });
    }
    if (!ok) continue;
    return { seed, level, N, cells, k, color: pickFrom(rnd, COLORS), options: shuffle(rnd, options) };
  }
  return null;
}

const keyOf = (task) => `${task.level}:${task.seed}`;

// ---------- Рисование ----------
function shapeSvg(cells, N, color, className) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `-0.2 -0.2 ${N + 0.4} ${N + 0.4}`);
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const frame = document.createElementNS(NS, 'rect');
  for (const [name, value] of Object.entries({ x: -0.15, y: -0.15, width: N + 0.3, height: N + 0.3, rx: 0.25, fill: '#ffffff', stroke: '#c9d1ee', 'stroke-width': 0.06 })) frame.setAttribute(name, value);
  svg.append(frame);
  for (const [r, c] of cells) {
    const rect = document.createElementNS(NS, 'rect');
    for (const [name, value] of Object.entries({ x: c + 0.04, y: r + 0.04, width: 0.92, height: 0.92, rx: 0.14, fill: color, stroke: 'rgba(0,0,0,0.18)', 'stroke-width': 0.04 })) rect.setAttribute(name, value);
    svg.append(rect);
  }
  return svg;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
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
  const root = el('div', 'mr');
  const dotsBox = el('div', 'mr-dots');
  const top = el('div', 'mr-top');
  top.append(dotsBox);
  const prompt = el('div', 'mr-prompt', TEXT.prompt);
  const targetBox = el('div', 'mr-target');
  const options = el('div', 'mr-options');
  root.append(top, prompt, targetBox, options);
  ctx.container.append(root);

  const dots = [];
  function addDot(again) {
    const dot = el('span', again ? 'mr-dot again' : 'mr-dot');
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

      const target = shapeSvg(task.cells, task.N, task.color, 'mr-shape big');
      targetBox.replaceChildren(target);
      options.replaceChildren();
      prompt.textContent = TEXT.prompt;
      const turn = () => { target.style.transform = `rotate(${task.k * 90}deg)`; }; // та же поворотная подсказка и награда

      let correctBtn = null;
      function choose(option, btn) {
        if (locked || !alive) return;
        if (!option.correct) {
          wrong += 1;
          btn.disabled = true;
          btn.classList.add('faded');
          ctx.sound('hint');
          prompt.textContent = TEXT.hint;
          turn(); // подсказка: фигура поворачивается так, как нужно
          if (wrong >= WRONG_BEFORE_POINTING) correctBtn.classList.add('point');
          return;
        }
        locked = true;
        btn.classList.add('right');
        turn();
        ctx.sound('correct');
        wait(1700).then(() => resolve(wrong === 0));
      }

      for (const option of task.options) {
        const btn = el('button', 'mr-option');
        btn.type = 'button';
        btn.append(shapeSvg(option.cells, task.N, task.color, 'mr-shape'));
        if (option.correct) correctBtn = btn;
        onTap(btn, () => choose(option, btn));
        options.append(btn);
      }
    });
  }

  // ---------- Серия ----------
  const newSeed = () => 1 + Math.floor(Math.random() * 900000);
  function freshTask(level) {
    return makeTask(level, newSeed()) || makeTask(0, newSeed());
  }

  async function run() {
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const mistakes = new Map();

    // Трудные задания из прошлых серий («уровень:seed») — в случайных местах серии.
    const planned = new Map();
    const positions = shuffle(Math.random, Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    for (const key of shuffle(Math.random, [...ctx.hard]).slice(0, 2)) {
      const [lv, seed] = key.split(':').map(Number);
      const task = LEVELS[lv] && seed ? makeTask(lv, seed) : null;
      if (task && positions.length) planned.set(positions.pop(), task);
    }

    for (let i = 0; i < total; i++) {
      const task = planned.get(i) || freshTask(level);
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
        mistakes.set(keyOf(task), task);
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
      mistakes: again.map((t) => ({ key: keyOf(t), label: `🔄 ${TEXT.label} ${t.seed % 1000}` })),
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
