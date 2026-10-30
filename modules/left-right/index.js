// Право и лево. Задания генерируются кодом, пять уровней:
//   0 — предмет слева или справа; 1 — кто слева / справа в ряду;
//   2 — кто слева или справа от выделенного; 3 — куда придёт пчёлка по командам (ряд из 5 клеток);
//   4 — то же на сетке 3×3: команды налево, направо, вверх, вниз.
// После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные типы заданий повторяются в конце серии (с новыми предметами).

import { TEXT } from './texts.js';

const OBJECTS = ['🐱', '🐶', '🐰', '🐻', '🦊', '🐸', '🐵', '🐼', '🍎', '🍌', '⚽', '🌸', '⭐', '🎈', '🐟', '🚗'];
const BEE = '🐝';
const WALK_CELLS = 5;
const WALK_START = 2;
const GRID = 3; // сетка 3×3 для пчёлки на верхнем уровне
const CLEAN_TO_LEVEL_UP = 2;

// Какие типы заданий бывают на каждом уровне (вес — как часто).
const LEVELS = [
  { side: 1 },
  { side: 1, 'edge-left': 2, 'edge-right': 2 },
  { 'edge-left': 1, 'edge-right': 1, 'edge-mid': 1, 'near-left': 2, 'near-right': 2 },
  { 'near-left': 1, 'near-right': 1, walk: 3 },
  { walk: 1, walk3: 3 },
];

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

function pickVariant(weights, avoid) {
  const entries = Object.entries(weights).filter(([variant]) => variant !== avoid);
  if (!entries.length) return avoid;
  let r = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [variant, w] of entries) {
    r -= w;
    if (r < 0) return variant;
  }
  return entries[0][0];
}

function makeWalk() {
  let steps;
  let pos;
  for (let attempt = 0; attempt < 6; attempt++) {
    pos = WALK_START;
    steps = [];
    for (let i = rnd(2, 4); i > 0; i--) {
      const options = [];
      if (pos > 0) options.push('L');
      if (pos < WALK_CELLS - 1) options.push('R');
      const step = pick(options);
      steps.push(step);
      pos += step === 'L' ? -1 : 1;
    }
    if (pos !== WALK_START) break; // чтобы пчёлка не возвращалась на то же место
  }
  return { variant: 'walk', steps, answer: pos, prompt: TEXT.walkTitle };
}

// Пчёлка на сетке 3×3: стартует в случайной клетке, идёт по 2–4 командам и не выходит за край.
// Ответ — номер клетки (слева направо, сверху вниз), конец пути не совпадает со стартом.
const MOVES = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] };

function makeWalk3() {
  let start;
  let steps;
  let pos;
  for (let attempt = 0; attempt < 10; attempt++) {
    start = rnd(0, GRID * GRID - 1);
    pos = [Math.floor(start / GRID), start % GRID];
    steps = [];
    for (let i = rnd(2, 4); i > 0; i--) {
      const options = Object.keys(MOVES).filter((key) => {
        const row = pos[0] + MOVES[key][0];
        const col = pos[1] + MOVES[key][1];
        return row >= 0 && row < GRID && col >= 0 && col < GRID;
      });
      const step = pick(options);
      steps.push(step);
      pos = [pos[0] + MOVES[step][0], pos[1] + MOVES[step][1]];
    }
    if (pos[0] * GRID + pos[1] !== start) break; // чтобы пчёлка не возвращалась на то же место
  }
  return { variant: 'walk3', steps, start, answer: pos[0] * GRID + pos[1], prompt: TEXT.walkTitle };
}

function makeTask(variant) {
  if (variant === 'side') {
    return { variant, object: pick(OBJECTS), answer: pick(['left', 'right']), prompt: TEXT.sideAsk };
  }
  if (variant === 'walk') return makeWalk();
  if (variant === 'walk3') return makeWalk3();
  const [kind, part] = variant.split('-');
  if (kind === 'edge') {
    return { variant, items: shuffle(OBJECTS).slice(0, 3), answer: { left: 0, mid: 1, right: 2 }[part], prompt: TEXT.edge[part] };
  }
  const mark = part === 'left' ? rnd(1, 3) : rnd(0, 2);
  return {
    variant,
    items: shuffle(OBJECTS).slice(0, 4),
    mark,
    answer: part === 'left' ? mark - 1 : mark + 1,
    prompt: TEXT.near[part],
  };
}

const isWalk = (task) => task.variant === 'walk' || task.variant === 'walk3';

function spokenText(task) {
  if (!isWalk(task)) return { text: task.prompt };
  const commands = task.steps.map((s) => TEXT.go[s]).join(', ');
  return { text: `${TEXT.walkIntro}: ${commands}. ${TEXT.walkAsk}`, key: `${task.variant}-${task.steps.join('').toLowerCase()}` };
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

  const promptBox = el('div', 'lr-prompt');
  const stage = el('div', 'lr-stage');
  const answersBox = el('div', 'lr-answers');
  root.append(top, promptBox, stage, answersBox);
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
      const options = []; // { value, button }
      let leftMark = null; // подписи «лево/право» для подсказки
      let rightMark = null;
      let commandEls = [];

      promptBox.textContent = task.prompt;
      stage.replaceChildren();
      answersBox.replaceChildren();

      const addOption = (button, value, parent) => {
        button.type = 'button';
        onTap(button, () => choose(value, button));
        options.push({ value, button });
        parent.append(button);
      };

      const makeRuler = () => {
        leftMark = el('span', 'lr-ruler-left', `⬅ ${TEXT.rulerLeft}`);
        rightMark = el('span', 'lr-ruler-right', `${TEXT.rulerRight} ➡`);
        const ruler = el('div', 'lr-ruler');
        ruler.append(leftMark, rightMark);
        return ruler;
      };

      if (task.variant === 'side') {
        const field = el('div', 'lr-field');
        leftMark = el('div', 'lr-zone left', TEXT.left);
        rightMark = el('div', 'lr-zone right', TEXT.right);
        const object = el('span', `lr-object ${task.answer}`, task.object);
        field.append(leftMark, rightMark, object);
        stage.append(field);
        addOption(el('button', 'lr-side', `⬅ ${TEXT.left}`), 'left', answersBox);
        addOption(el('button', 'lr-side', `${TEXT.right} ➡`), 'right', answersBox);
      } else if (isWalk(task)) {
        commandEls = task.steps.map((s) => el('span', 'lr-cmd', TEXT.arrows[s]));
        const commands = el('div', 'lr-commands');
        commands.append(...commandEls);
        const grid = task.variant === 'walk3';
        const cells = el('div', grid ? 'lr-grid' : 'lr-cells');
        const count = grid ? GRID * GRID : WALK_CELLS;
        const start = grid ? task.start : WALK_START;
        for (let i = 0; i < count; i++) {
          addOption(el('button', grid ? 'lr-cell lr-cell-grid' : 'lr-cell', i === start ? BEE : ''), i, cells);
        }
        stage.append(commands, cells, makeRuler());
      } else {
        const row = el('div', 'lr-row');
        task.items.forEach((emoji, i) => {
          const button = el('button', i === task.mark ? 'lr-item mark' : 'lr-item', emoji);
          addOption(button, i, row);
        });
        stage.append(row, makeRuler());
      }

      const sayTask = () => {
        const { text, key } = spokenText(task);
        return ctx.speak(text, 'ru', key);
      };
      repeatBtn.onclick = () => sayTask();

      // Подсказка: показываем, где лево, а где право (и пересказываем команды пчёлки).
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

      async function choose(value, button) {
        if (locked || !alive) return;
        if (value !== task.answer) {
          wrong += 1;
          button.disabled = true;
          button.classList.add('faded');
          ctx.sound('hint');
          hint();
          return;
        }
        locked = true;
        hintRun += 1;
        button.classList.add('right');
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
    let previous = null;
    const mistakes = new Map();
    const hardPlan = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    for (const key of shuffle(ctx.hard.filter((k) => k in TEXT.labels)).slice(0, 2)) {
      if (positions.length) hardPlan.set(positions.pop(), key);
    }

    for (let i = 0; i < total; i++) {
      const variant = hardPlan.get(i) || pickVariant(LEVELS[level], previous);
      previous = variant;
      const firstTry = await playTask(makeTask(variant));
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
        mistakes.set(variant, { key: variant, label: TEXT.labels[variant] });
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные типы — ещё раз в конце, с новыми предметами. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(makeTask(again[i].key));
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({ correct, total, mistakes: again });
  }

  run();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
