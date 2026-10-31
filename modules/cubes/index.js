// Кубики. Показана постройка из кубиков — нужно сосчитать, сколько их.
// Уровни: 0 — вид спереди: башенки рядом (2–4 штуки, до 3 кубиков), ответ выбирается из трёх;
// 1 — ряд кубиков в объёме (изометрия), ответ из трёх; 2 — постройка 2×2–2×3, ответ вводится цифрами;
// 3 — постройка 3×3–3×4, ответ вводится цифрами.
// В объёмных постройках спрятанных кубиков нет: у каждого виден хотя бы один край (проверяется при построении).
// Подсказка после ошибки: кубики по очереди нумеруются. Задание строится из числа (seed), поэтому «трудное»
// можно показать снова точно таким же (ключ «уровень:seed»). Уровень помнится между сериями (повышение — после 3 верных).

import { TEXT } from './texts.js';
import { createKeypad } from '../addition-10/keypad.js';

const LEVELS = [
  { kind: 'front' },
  { kind: 'row' },
  { kind: 'pile', rows: [2, 2], cols: [2, 3], min: 5, max: 10 },
  { kind: 'pile', rows: [3, 3], cols: [3, 4], min: 9, max: 15 },
];
const INPUT_FROM_LEVEL = 2; // с этого уровня ответ вводится цифрами
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const NS = 'http://www.w3.org/2000/svg';
const COLORS = { top: '#bfdbfe', left: '#60a5fa', right: '#2563eb', line: '#1e3a8a' };

// ---------- Случайные числа и постройки ----------
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rnd, min, max) => min + Math.floor(rnd() * (max - min + 1));

function shuffle(list, rnd = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const heightAt = (h, i, j) => (h[i] && h[i][j]) || 0;
const totalOf = (h) => h.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);

// Каждый кубик виден хотя бы краем: сверху (если он верхний в стопке) или сбоку (спереди не выше него) —
// и не закрыт целиком кубиком, стоящим на шаг ближе и на шаг выше (в изометрии он закрывает его точно).
function allVisible(h) {
  for (let i = 0; i < h.length; i++) {
    for (let j = 0; j < h[i].length; j++) {
      for (let z = 0; z < h[i][j]; z++) {
        if (heightAt(h, i + 1, j + 1) >= z + 2) return false;
        const topVisible = z === h[i][j] - 1;
        if (!topVisible && heightAt(h, i + 1, j) > z && heightAt(h, i, j + 1) > z) return false;
      }
    }
  }
  return true;
}

function makeTask(level, seed) {
  const cfg = LEVELS[level];
  for (let attempt = 0; attempt < 400; attempt++) {
    const rnd = rngOf(seed + attempt * 7919);
    let h;
    if (cfg.kind === 'front') {
      h = [Array.from({ length: between(rnd, 2, 4) }, () => between(rnd, 1, 3))];
      if (totalOf(h) < 3) continue;
    } else if (cfg.kind === 'row') {
      h = [Array.from({ length: between(rnd, 3, 4) }, () => between(rnd, 1, 3))];
      if (totalOf(h) < 4 || Math.max(...h[0]) < 2) continue;
    } else {
      const rows = between(rnd, cfg.rows[0], cfg.rows[1]);
      const cols = between(rnd, cfg.cols[0], cfg.cols[1]);
      h = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rnd() < 0.2 ? 0 : between(rnd, 1, 3))));
      const total = totalOf(h);
      if (total < cfg.min || total > cfg.max || !allVisible(h)) continue;
      if (!h.slice(1).some((row) => row.some((x) => x > 0))) continue; // нужна настоящая объёмная постройка
    }
    return { seed, level, kind: cfg.kind, h, answer: totalOf(h) };
  }
  return null;
}

const keyOf = (task) => `${task.level}:${task.seed}`;

// ---------- Рисование ----------
function svgEl(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const poly = (points, fill) => svgEl('polygon', { points: points.map((p) => p.join(',')).join(' '), fill, stroke: COLORS.line, 'stroke-width': 0.05, 'stroke-linejoin': 'round' });

// Рисунок постройки; возвращает { svg, centers } — центры кубиков в порядке рисования (для подсказки-счёта).
function drawBuilding(task) {
  const svg = svgEl('svg', { class: 'cb-svg', 'aria-hidden': 'true' });
  const centers = [];
  let box;
  if (task.kind === 'front') {
    const row = task.h[0];
    const pitch = 1.3;
    row.forEach((height, k) => {
      for (let z = 0; z < height; z++) {
        const x = k * pitch;
        const y = -(z + 1);
        svg.append(svgEl('rect', { x, y, width: 1, height: 1, rx: 0.12, fill: COLORS.top, stroke: COLORS.line, 'stroke-width': 0.05 }));
        centers.push([x + 0.5, y + 0.5]);
      }
    });
    box = { minX: -0.2, maxX: (row.length - 1) * pitch + 1.2, minY: -Math.max(...row) - 0.2, maxY: 0.25 };
    svg.append(svgEl('line', { x1: -0.2, y1: 0.08, x2: box.maxX, y2: 0.08, stroke: '#9aa3c7', 'stroke-width': 0.08, 'stroke-linecap': 'round' }));
  } else {
    // Изометрия 2:1: чем больше i + j, тем кубик ближе к зрителю и ниже на экране.
    const cubes = [];
    task.h.forEach((row, i) => row.forEach((height, j) => { for (let z = 0; z < height; z++) cubes.push({ i, j, z }); }));
    cubes.sort((a, b) => (a.i + a.j) - (b.i + b.j) || a.z - b.z);
    box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const { i, j, z } of cubes) {
      const X = j - i;
      const Y = (i + j) * 0.5 - (z + 1);
      svg.append(
        poly([[X, Y - 0.5], [X + 1, Y], [X, Y + 0.5], [X - 1, Y]], COLORS.top),
        poly([[X - 1, Y], [X, Y + 0.5], [X, Y + 1.5], [X - 1, Y + 1]], COLORS.left),
        poly([[X, Y + 0.5], [X + 1, Y], [X + 1, Y + 1], [X, Y + 1.5]], COLORS.right));
      centers.push([X, Y + 0.5]);
      box.minX = Math.min(box.minX, X - 1);
      box.maxX = Math.max(box.maxX, X + 1);
      box.minY = Math.min(box.minY, Y - 0.5);
      box.maxY = Math.max(box.maxY, Y + 1.5);
    }
  }
  const pad = 0.3;
  svg.setAttribute('viewBox', `${box.minX - pad} ${box.minY - pad} ${box.maxX - box.minX + 2 * pad} ${box.maxY - box.minY + 2 * pad}`);
  return { svg, centers };
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

// Три варианта ответа: верный и два ближайших (не меньше 1).
function makeChoices(answer) {
  const options = new Set([answer]);
  for (const v of shuffle([-2, -1, 1, 2].map((d) => answer + d))) {
    if (v >= 1 && options.size < 3) options.add(v);
  }
  return shuffle([...options]);
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
  const root = el('div', 'cb');
  const dotsBox = el('div', 'cb-dots');
  const top = el('div', 'cb-top');
  top.append(dotsBox);
  const prompt = el('div', 'cb-prompt', TEXT.prompt);
  const stage = el('div', 'cb-stage');
  const slot = el('div', 'cb-slot', '?');
  const answers = el('div', 'cb-answers');
  root.append(top, prompt, stage, slot, answers);
  ctx.container.append(root);

  const dots = [];
  function addDot(again) {
    const dot = el('span', again ? 'cb-dot again' : 'cb-dot');
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
      let hintShown = false;
      let hintRun = 0;
      let pad = null;

      const { svg, centers } = drawBuilding(task);
      stage.replaceChildren(svg);
      slot.textContent = '?';
      slot.className = 'cb-slot';
      answers.replaceChildren();
      prompt.textContent = TEXT.prompt;

      // Подсказка после первой ошибки: кубики нумеруются по очереди.
      async function showHint() {
        const mine = ++hintRun;
        prompt.textContent = TEXT.hint;
        for (let n = 0; n < centers.length; n++) {
          if (!alive || mine !== hintRun) return;
          const [x, y] = centers[n];
          const badge = svgEl('g', { class: 'cb-badge' });
          badge.append(svgEl('circle', { cx: x, cy: y, r: 0.36, fill: '#fff', stroke: COLORS.line, 'stroke-width': 0.05 }));
          const label = svgEl('text', { x, y: y + 0.17, 'text-anchor': 'middle', 'font-size': 0.5, 'font-weight': 800, fill: COLORS.line });
          label.textContent = String(n + 1);
          badge.append(label);
          svg.append(badge);
          ctx.sound('tap');
          await wait(450);
        }
      }

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

      async function choose(value, button) {
        if (locked || !alive) return;
        if (value !== task.answer) {
          wrong += 1;
          if (button) {
            button.disabled = true;
            button.classList.add('faded');
          } else {
            wrongInput();
          }
          ctx.sound('hint');
          if (!hintShown) {
            hintShown = true;
            showHint();
          }
          return;
        }
        locked = true;
        hintRun += 1; // останавливает счёт
        slot.textContent = task.answer;
        slot.className = 'cb-slot ok';
        ctx.sound('correct');
        await wait(1400);
        resolve(wrong === 0);
      }

      if (task.level >= INPUT_FROM_LEVEL) {
        pad = createKeypad({
          digits: String(task.answer).length,
          onInput: (text) => {
            slot.textContent = text || '?';
          },
          onComplete: (text) => choose(Number(text), null),
        });
        answers.append(pad.el);
      } else {
        for (const value of makeChoices(task.answer)) {
          const button = el('button', 'cb-answer', value);
          button.type = 'button';
          onTap(button, () => choose(value, button));
          answers.append(button);
        }
      }
    });
  }

  // ---------- Серия ----------
  const newSeed = () => 1 + Math.floor(Math.random() * 900000);
  const freshTask = (level) => makeTask(level, newSeed()) || makeTask(0, newSeed());

  async function run() {
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const mistakes = new Map();

    // Трудные задания из прошлых серий («уровень:seed») — в случайных местах серии.
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    for (const key of shuffle([...ctx.hard]).slice(0, 2)) {
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
      mistakes: again.map((t) => ({ key: keyOf(t), label: `🧊 ${TEXT.label} ${t.answer}` })),
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
