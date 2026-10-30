// Право и лево: пчёлка на сетке 3×3. Показаны команды (⬅ ➡ ⬆ ⬇), пчёлка стоит в клетке —
// нужно нажать клетку, куда она придёт. Задания генерируются кодом.
// Уровни — длина пути: 0 — 2 команды; 1 — 2–3; 2 — 3–4. После ошибки уровень падает,
// после двух верных подряд растёт. Ошибочные задания повторяются в конце серии (те же самые).

import { TEXT } from './texts.js';

const BEE = '🐝';
const GRID = 3;
const CLEAN_TO_LEVEL_UP = 2;
const STEPS_BY_LEVEL = [[2, 2], [2, 3], [3, 4]]; // сколько команд на каждом уровне: от и до
const MOVES = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] };

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

// Ключ задания «4-LDR»: клетка старта (слева направо, сверху вниз) и команды. По нему задание
// можно повторить в конце серии и выдать как «трудное».
const keyOf = (start, steps) => `${start}-${steps.join('')}`;

// Идёт по командам; null, если пчёлка выходит за край. Возвращает номер клетки.
function walk(start, steps) {
  let row = Math.floor(start / GRID);
  let col = start % GRID;
  for (const step of steps) {
    row += MOVES[step][0];
    col += MOVES[step][1];
    if (row < 0 || row >= GRID || col < 0 || col >= GRID) return null;
  }
  return row * GRID + col;
}

// Пчёлка стартует в случайной клетке, идёт по командам и не выходит за край; конец пути — не старт.
function makeTask(level) {
  const [min, max] = STEPS_BY_LEVEL[level];
  for (let attempt = 0; attempt < 50; attempt++) {
    const start = rnd(0, GRID * GRID - 1);
    const steps = [];
    let row = Math.floor(start / GRID);
    let col = start % GRID;
    for (let i = rnd(min, max); i > 0; i--) {
      const options = Object.keys(MOVES).filter((key) => {
        const r = row + MOVES[key][0];
        const c = col + MOVES[key][1];
        return r >= 0 && r < GRID && c >= 0 && c < GRID;
      });
      const step = pick(options);
      steps.push(step);
      row += MOVES[step][0];
      col += MOVES[step][1];
    }
    if (row * GRID + col !== start) return { start, steps, answer: row * GRID + col, key: keyOf(start, steps) };
  }
  return { start: 4, steps: ['L', 'U'], answer: 0, key: keyOf(4, ['L', 'U']) };
}

// Трудное задание из ключа («4-LDR») -> задание; null, если ключ не подходит.
function taskFromKey(key) {
  const m = /^([0-8])-([LRUD]+)$/.exec(key);
  if (!m) return null;
  const start = Number(m[1]);
  const steps = [...m[2]];
  const answer = walk(start, steps);
  return answer === null || answer === start ? null : { start, steps, answer, key };
}

function spokenText(task) {
  const commands = task.steps.map((s) => TEXT.go[s]).join(', ');
  return { text: `${TEXT.walkIntro}: ${commands}. ${TEXT.walkAsk}`, key: `walk3-${task.steps.join('').toLowerCase()}` };
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

  // ---------- разметка ----------
  const root = el('div', 'leftright');
  const dotsBox = el('div', 'lr-dots');
  const repeatBtn = el('button', 'lr-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'lr-top');
  top.append(dotsBox, repeatBtn);

  const promptBox = el('div', 'lr-prompt', TEXT.walkTitle);
  const stage = el('div', 'lr-stage');
  root.append(top, promptBox, stage);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'lr-dot again' : 'lr-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      let hintRun = 0;
      stage.classList.remove('show-sides');
      stage.replaceChildren();

      const commandEls = task.steps.map((s) => el('span', 'lr-cmd', TEXT.arrows[s]));
      const commands = el('div', 'lr-commands');
      commands.append(...commandEls);
      const grid = el('div', 'lr-grid');
      for (let i = 0; i < GRID * GRID; i++) {
        const cell = el('button', 'lr-cell', i === task.start ? BEE : '');
        cell.type = 'button';
        onTap(cell, () => choose(i, cell));
        grid.append(cell);
      }
      // Подписи «лево/право» — появляются в подсказке.
      const leftMark = el('span', 'lr-ruler-left', `⬅ ${TEXT.rulerLeft}`);
      const rightMark = el('span', 'lr-ruler-right', `${TEXT.rulerRight} ➡`);
      const ruler = el('div', 'lr-ruler');
      ruler.append(leftMark, rightMark);
      stage.append(commands, grid, ruler);

      const sayTask = () => {
        const { text, key } = spokenText(task);
        return ctx.speak(text, 'ru', key);
      };
      repeatBtn.onclick = () => sayTask();

      // Подсказка: показываем, где лево, а где право, и пересказываем команды пчёлки.
      async function hint() {
        const mine = ++hintRun;
        stage.classList.add('show-sides');
        const lit = async (mark, phrase) => {
          mark.classList.add('lit');
          await ctx.speak(phrase, 'ru');
          mark.classList.remove('lit');
        };
        await lit(leftMark, TEXT.hintLeft);
        if (!alive || mine !== hintRun) return;
        await lit(rightMark, TEXT.hintRight);
        for (let i = 0; i < commandEls.length; i++) {
          if (!alive || mine !== hintRun) return;
          commandEls[i].classList.add('lit');
          await ctx.speak(TEXT.go[task.steps[i]], 'ru');
          await wait(250);
          commandEls[i].classList.remove('lit');
        }
      }

      async function choose(value, cell) {
        if (locked || !alive) return;
        if (value !== task.answer) {
          wrong += 1;
          cell.disabled = true;
          cell.classList.add('faded');
          ctx.sound('hint');
          hint();
          return;
        }
        locked = true;
        hintRun += 1;
        cell.classList.add('right');
        ctx.sound('correct');
        ctx.speak(pick(TEXT.praise), 'ru');
        await wait(1500);
        resolve(wrong === 0);
      }

      sayTask();
    });
  }

  // ---------- серия ----------
  async function run() {
    let level = 0;
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const hardPlan = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    for (const task of shuffle(ctx.hard.map(taskFromKey).filter(Boolean)).slice(0, 2)) {
      if (positions.length) hardPlan.set(positions.pop(), task);
    }

    for (let i = 0; i < total; i++) {
      let task = hardPlan.get(i);
      if (!task) {
        task = makeTask(level);
        for (let attempt = 0; attempt < 10 && used.has(task.key); attempt++) task = makeTask(level);
      }
      used.add(task.key);
      const firstTry = await playTask(task);
      if (!alive) return;
      dots[i].classList.add('done');
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < STEPS_BY_LEVEL.length - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(task.key, task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные задания — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i]);
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      total,
      mistakes: again.map((t) => ({ key: t.key, label: `${BEE} ${t.steps.map((s) => TEXT.arrows[s]).join(' ')}` })),
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
