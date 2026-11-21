// Право и лево: пчёлка на сетке 3×3. Показаны команды (⬅ ➡ ⬆ ⬇), пчёлка стоит в клетке —
// нужно нажать клетку, куда она придёт. Задания генерируются кодом.
// Уровни 0–2 — длина пути, всегда не меньше 5 команд: 0 — 5; 1 — 5–6; 2 — 6–7 (стрелки — стороны экрана).
// Уровни 3–5 — команды от лица пчёлки: она смотрит в какую-то сторону, «вперёд» — шаг туда, куда смотрит,
// «налево» и «направо» — поворот пчёлки и шаг: 3 — 4–5 команд, пчёлка смотрит вверх; 4 — 5–6, смотрит куда угодно; 5 — 6–7.
// Здесь стрелки экрана не помогут: нужно представить себя на месте пчёлки.
// После ошибки уровень падает, после трёх верных подряд растёт. Ошибочные задания повторяются в конце серии (те же самые).

import { TEXT } from './texts.js';

const BEE = '🐝';
const GRID = 3;
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
// Уровни: steps — сколько команд (от и до); rel — команды от лица пчёлки (F — вперёд, L — налево, R — направо); heading — куда она смотрит.
const LEVELS = [
  { steps: [5, 5] },
  { steps: [5, 6] },
  { steps: [6, 7] },
  { rel: true, steps: [4, 5], heading: 'U' },
  { rel: true, steps: [5, 6] },
  { rel: true, steps: [6, 7] },
];
const TURN_LEFT = { U: 'L', L: 'D', D: 'R', R: 'U' };
const TURN_RIGHT = { U: 'R', R: 'D', D: 'L', L: 'U' };
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
// Пчёлка в клетке start смотрит в сторону heading. «Вперёд» — шаг туда, куда смотрит; «налево» / «направо» — поворот и шаг.
// Возвращает путь [{ cell, heading }, …] (первая запись — старт) или null, если пчёлка выходит за край.
function walkRel(start, heading, cmds) {
  let row = Math.floor(start / GRID);
  let col = start % GRID;
  let h = heading;
  const path = [{ cell: start, heading: h }];
  for (const cmd of cmds) {
    if (cmd === 'L') h = TURN_LEFT[h];
    else if (cmd === 'R') h = TURN_RIGHT[h];
    row += MOVES[h][0];
    col += MOVES[h][1];
    if (row < 0 || row >= GRID || col < 0 || col >= GRID) return null;
    path.push({ cell: row * GRID + col, heading: h });
  }
  return path;
}

const keyOfRel = (start, heading, cmds) => `r${start}${heading}-${cmds.join('')}`;

// Задание «от лица пчёлки»: есть и «налево», и «направо»; прочитанные как стрелки экрана (или как будто пчёлка смотрит вверх)
// команды приводят в другую клетку — угадать по рисунку нельзя.
function makeRelTask(cfg) {
  const [min, max] = cfg.steps;
  for (let attempt = 0; attempt < 300; attempt++) {
    const start = rnd(0, GRID * GRID - 1);
    const heading = cfg.heading || pick(Object.keys(MOVES));
    let row = Math.floor(start / GRID);
    let col = start % GRID;
    let h = heading;
    const cmds = [];
    for (let i = rnd(min, max); i > 0; i--) {
      const options = ['F', 'L', 'R'].filter((cmd) => {
        const next = cmd === 'L' ? TURN_LEFT[h] : cmd === 'R' ? TURN_RIGHT[h] : h;
        const r = row + MOVES[next][0];
        const c = col + MOVES[next][1];
        return r >= 0 && r < GRID && c >= 0 && c < GRID;
      });
      const cmd = pick(options);
      cmds.push(cmd);
      h = cmd === 'L' ? TURN_LEFT[h] : cmd === 'R' ? TURN_RIGHT[h] : h;
      row += MOVES[h][0];
      col += MOVES[h][1];
    }
    if (!cmds.includes('L') || !cmds.includes('R') || row * GRID + col === start) continue;
    const answer = row * GRID + col;
    const asScreen = walk(start, cmds.map((c) => (c === 'F' ? 'U' : c))); // как если бы стрелки были сторонами экрана
    const asUp = heading === 'U' ? null : walkRel(start, 'U', cmds)?.at(-1).cell; // как если бы пчёлка смотрела вверх
    if (asScreen === answer || asUp === answer) continue;
    return { rel: true, start, heading, cmds, path: walkRel(start, heading, cmds), answer, key: keyOfRel(start, heading, cmds) };
  }
  return null;
}

function makeTask(level) {
  const cfg = LEVELS[level];
  if (cfg.rel) return makeRelTask(cfg) || makeTask(0);
  const [min, max] = cfg.steps;
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
  const rel = /^r([0-8])([UDLR])-([FLR]+)$/.exec(key);
  if (rel) {
    const start = Number(rel[1]);
    const cmds = [...rel[3]];
    const path = walkRel(start, rel[2], cmds);
    return path && path.at(-1).cell !== start ? { rel: true, start, heading: rel[2], cmds, path, answer: path.at(-1).cell, key } : null;
  }
  const m = /^([0-8])-([LRUD]+)$/.exec(key);
  if (!m) return null;
  const start = Number(m[1]);
  const steps = [...m[2]];
  const answer = walk(start, steps);
  return answer === null || answer === start ? null : { start, steps, answer, key };
}

function spokenText(task) {
  if (task.rel) {
    const words = task.cmds.map((c) => TEXT.goRel[c]).join(', ');
    return { text: `${TEXT.walkRelIntro}: ${words}. ${TEXT.walkAsk}`, key: `walkrel-${task.cmds.join('').toLowerCase()}` };
  }
  const commands = task.steps.map((s) => TEXT.go[s]).join(', ');
  return { text: `${TEXT.walkIntro}: ${commands}. ${TEXT.walkAsk}`, key: `walk3-${task.steps.join('').toLowerCase()}` };
}

// Рисунки: пчёлка и стрелки команд — плоская акварель вместо эмодзи (фильтр wcS общий, core/art/filters.js).
const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';
function svg(markup, className) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const node = document.importNode(doc.documentElement, true);
  if (className) node.setAttribute('class', className);
  return node;
}

const beeSvg = () => svg(`<svg ${SVG_NS} viewBox="0 0 100 100" aria-hidden="true"><g filter="url(#wcS)">
  <ellipse cx="38" cy="34" rx="15" ry="22" transform="rotate(-28 38 34)" fill="#CFE6F2"/>
  <ellipse cx="62" cy="30" rx="15" ry="22" transform="rotate(24 62 30)" fill="#E3F0F8"/>
  <path d="M16 62 L26 56 L26 68 Z" fill="#8A5A2A"/>
  <ellipse cx="50" cy="62" rx="30" ry="23" fill="#F4C34E"/>
  <ellipse cx="42" cy="62" rx="5.5" ry="21" fill="#8A5A2A"/><ellipse cx="58" cy="62" rx="5.5" ry="21" fill="#8A5A2A"/>
  <circle cx="80" cy="56" r="13" fill="#F4C34E"/>
  <circle cx="84" cy="52" r="3" fill="#3B2412"/>
  <path d="M82 44 q4 -10 10 -12 M76 44 q0 -10 4 -14" stroke="#8A5A2A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</g></svg>`, 'lr-bee');

// Стрелка команды (направо); поворот — классом d-L, d-U, d-D в style.css.
const arrowSvg = (dir) => svg(`<svg ${SVG_NS} viewBox="0 0 48 48" aria-hidden="true"><path d="M6 19 H26 V9 L43 24 L26 39 V29 H6 Z" fill="#C9623A" stroke="#C9623A" stroke-width="2" stroke-linejoin="round"/></svg>`, `lr-arrow d-${dir}`);

// Команда «от лица пчёлки»: вперёд — прямая стрелка вверх; налево и направо — стрелки-повороты. Под стрелкой — слово.
const RELATIVE_ARROWS = {
  F: '<path d="M24 44 V18" fill="none" stroke="#C9623A" stroke-width="7" stroke-linecap="round"/><polygon points="10,20 24,3 38,20" fill="#C9623A" stroke="#C9623A" stroke-width="2" stroke-linejoin="round"/>',
  L: '<path d="M32 44 V28 Q32 16 20 16 H15" fill="none" stroke="#C9623A" stroke-width="7" stroke-linecap="round"/><polygon points="17,3 2,16 17,29" fill="#C9623A" stroke="#C9623A" stroke-width="2" stroke-linejoin="round"/>',
  R: '<path d="M16 44 V28 Q16 16 28 16 H33" fill="none" stroke="#C9623A" stroke-width="7" stroke-linecap="round"/><polygon points="31,3 46,16 31,29" fill="#C9623A" stroke="#C9623A" stroke-width="2" stroke-linejoin="round"/>',
};
const relArrowSvg = (cmd) => svg(`<svg ${SVG_NS} viewBox="0 0 48 48" aria-hidden="true">${RELATIVE_ARROWS[cmd]}</svg>`, 'lr-arrow');

// Пчёлка, повёрнутая в сторону heading (рисунок смотрит вправо).
const BEE_TURN = { R: 'none', D: 'rotate(90deg)', U: 'rotate(-90deg)', L: 'scaleX(-1)' };
function turnedBee(heading) {
  const wrap = document.createElement('span');
  wrap.className = 'lr-bee-wrap';
  wrap.append(beeSvg());
  wrap.style.transform = BEE_TURN[heading];
  return wrap;
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
      promptBox.textContent = task.rel ? TEXT.relTitle : TEXT.walkTitle;

      const commandEls = (task.rel ? task.cmds : task.steps).map((s) => {
        const cmd = el('span', task.rel ? 'lr-cmd rel' : 'lr-cmd');
        if (task.rel) {
          cmd.append(relArrowSvg(s), el('span', 'lr-cmd-word', TEXT.goRel[s]));
          cmd.setAttribute('aria-label', TEXT.goRel[s]);
        } else {
          cmd.append(arrowSvg(s));
          cmd.setAttribute('aria-label', TEXT.go[s]);
        }
        return cmd;
      });
      const commands = el('div', 'lr-commands');
      commands.append(...commandEls);
      const grid = el('div', 'lr-grid');
      const flyBee = task.rel ? turnedBee(task.heading) : null; // пчёлка «от лица пчёлки»: перелетает по клеткам в подсказке
      for (let i = 0; i < GRID * GRID; i++) {
        const cell = el('button', 'lr-cell');
        if (i === task.start) cell.append(flyBee || beeSvg());
        cell.type = 'button';
        onTap(cell, () => choose(i, cell));
        grid.append(cell);
      }
      // Подписи «лево/право» — появляются в подсказке.
      const leftMark = el('span', 'lr-ruler-left', `⬅ ${TEXT.rulerLeft}`);
      const rightMark = el('span', 'lr-ruler-right', `${TEXT.rulerRight} ➡`);
      const ruler = el('div', task.rel ? 'lr-ruler note' : 'lr-ruler');
      if (task.rel) ruler.append(el('span', 'lr-ruler-left', TEXT.relHint));
      else ruler.append(leftMark, rightMark);
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

      // Подсказка «от лица пчёлки»: пчёлка летит по командам. После первой ошибки — только первая команда, после второй — весь путь.
      function setBee(step) {
        const point = task.path[step];
        grid.children[point.cell].append(flyBee);
        flyBee.style.transform = BEE_TURN[point.heading];
      }

      async function hintRel() {
        const mine = ++hintRun;
        stage.classList.add('show-sides');
        setBee(0);
        const upTo = wrong >= 2 ? task.cmds.length : 1;
        for (let i = 0; i < upTo; i++) {
          if (!alive || mine !== hintRun) return;
          commandEls[i].classList.add('lit');
          await ctx.speak(TEXT.goRel[task.cmds[i]], 'ru');
          await wait(450);
          if (!alive || mine !== hintRun) return;
          setBee(i + 1);
          await wait(650);
          commandEls[i].classList.remove('lit');
        }
        if (!alive || mine !== hintRun) return;
        await wait(600);
        if (!alive || mine !== hintRun) return;
        setBee(0); // и снова на старт: теперь пробуй сам
      }

      async function choose(value, cell) {
        if (locked || !alive) return;
        if (value !== task.answer) {
          wrong += 1;
          cell.disabled = true;
          cell.classList.add('faded');
          ctx.sound('hint');
          if (task.rel) hintRel();
          else hint();
          return;
        }
        locked = true;
        hintRun += 1;
        if (task.rel) {
          commandEls.forEach((c) => c.classList.remove('lit'));
          setBee(task.path.length - 1); // пчёлка прилетает в верную клетку
        }
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
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
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
      level,
      total,
      mistakes: again.map((t) => ({ key: t.key, label: `${BEE} ${t.rel ? t.cmds.map((c) => TEXT.goRel[c]).join(' ') : t.steps.map((s) => TEXT.arrows[s]).join(' ')}` })),
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
