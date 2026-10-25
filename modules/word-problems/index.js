// Задачи: очень короткий текст и вопрос, ответ — число из трёх.
// Виды: add «нашёл ещё», sub «отдал», total «сколько всего у двоих», diff «на сколько больше».
// Уровни: 0 — add/sub до 10; 1 — плюс total до 10; 2 — всё до 20; 3 — плюс diff.
// После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные задачи повторяются в конце серии.

import { TEXT } from './texts.js';
import { NAMES, NOUNS, counted } from './data.js';

const LEVEL_KINDS = [['add', 'sub'], ['add', 'sub', 'total'], ['add', 'sub', 'total'], ['add', 'sub', 'total', 'diff']];
const LEVEL_MAX = [10, 10, 20, 20]; // наибольшее число (в том числе ответ)
const CLEAN_TO_LEVEL_UP = 2;
const MAX_ANSWER = 20;

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

function answerOf(task) {
  return task.t === 'add' || task.t === 'total' ? task.a + task.b : task.a - task.b;
}

// Задача хранится числами и номерами, поэтому её ключ можно сохранить и восстановить.
function makeTask(level, used) {
  const max = LEVEL_MAX[level];
  let task;
  for (let attempt = 0; attempt < 40; attempt++) {
    const t = pick(LEVEL_KINDS[level]);
    let a;
    let b;
    if (t === 'add' || t === 'total') {
      a = rnd(1, max - 1);
      b = rnd(1, max - a);
    } else if (t === 'sub') {
      a = rnd(2, max);
      b = rnd(1, a - 1);
    } else {
      a = rnd(3, max);
      b = rnd(1, a - 1);
    }
    const p = rnd(0, NAMES.length - 1);
    let q = rnd(0, NAMES.length - 1);
    if (q === p) q = (q + 1) % NAMES.length;
    task = { t, a, b, n: rnd(0, NOUNS.length - 1), p, q };
    if (!used.has(JSON.stringify(task))) break;
  }
  return task;
}

// Текст задачи: короткие предложения и вопрос.
function describe(task) {
  const who = NAMES[task.p];
  const other = NAMES[task.q];
  const noun = NOUNS[task.n];
  const he = who.f ? 'Она' : 'Он';
  const lines = [];
  let question;
  if (task.t === 'add') {
    lines.push(`У ${who.gen} ${counted(task.a, noun)}.`);
    lines.push(who.f ? `Она нашла ещё ${task.b}.` : `Он нашёл ещё ${task.b}.`);
    question = TEXT.questions.add;
  } else if (task.t === 'sub') {
    lines.push(`У ${who.gen} ${counted(task.a, noun)}.`);
    lines.push(`${he} ${who.f ? 'отдала' : 'отдал'} ${task.b}.`);
    question = TEXT.questions.sub;
  } else if (task.t === 'total') {
    lines.push(`У ${who.gen} ${counted(task.a, noun)}, у ${other.gen} ${task.b}.`);
    question = TEXT.questions.total;
  } else {
    lines.push(`У ${who.gen} ${counted(task.a, noun)}, у ${other.gen} ${task.b}.`);
    question = TEXT.questions.diff.replace('{who}', who.gen);
  }
  return { lines, question, noun, who, other };
}

function makeChoices(answer) {
  const options = new Set([answer]);
  for (const v of shuffle([-2, -1, 1, 2].map((d) => answer + d))) {
    if (v >= 0 && v <= MAX_ANSWER && options.size < 3) options.add(v);
  }
  return shuffle([...options]);
}

function planHardTasks(hardKeys, total) {
  const planned = new Map();
  const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
  const tasks = hardKeys
    .map((key) => {
      try {
        const t = JSON.parse(key);
        const ok = ['add', 'sub', 'total', 'diff'].includes(t.t) && NOUNS[t.n] && NAMES[t.p] && NAMES[t.q]
          && Number.isInteger(t.a) && Number.isInteger(t.b) && answerOf(t) >= 0 && answerOf(t) <= MAX_ANSWER;
        return ok ? t : null;
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
  const root = el('div', 'problems');
  const dotsBox = el('div', 'wp-dots');
  const repeatBtn = el('button', 'wp-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'wp-top');
  top.append(dotsBox, repeatBtn);

  const who = el('div', 'wp-who');
  const card = el('div', 'wp-card');
  const hintBox = el('div', 'wp-hint');
  const answersBox = el('div', 'wp-answers');
  root.append(top, who, card, hintBox, answersBox);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'wp-dot again' : 'wp-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // Подсказка-картинка: предметы из задачи, чтобы пересчитать.
  function drawHint(task, info) {
    const icon = info.noun[3];
    const group = (count, fadedFrom = count) => {
      const g = el('div', 'wp-group');
      for (let i = 0; i < count; i++) g.append(el('span', i >= fadedFrom ? 'gone' : '', icon));
      return g;
    };
    hintBox.replaceChildren();
    if (task.t === 'add' || task.t === 'total') {
      hintBox.append(group(task.a), el('span', 'wp-op', '+'), group(task.b));
    } else if (task.t === 'sub') {
      hintBox.append(group(task.a, task.a - task.b));
    } else {
      const rows = el('div', 'wp-rows');
      rows.append(group(task.a), group(task.b));
      hintBox.append(rows);
    }
    hintBox.classList.add('show');
  }

  // ---------- одна задача ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task) {
    return new Promise((resolve) => {
      const answer = answerOf(task);
      const info = describe(task);
      let wrong = 0;
      let locked = false;

      who.textContent = `${info.who.emoji} ${info.noun[3]}`;
      card.replaceChildren(
        ...info.lines.map((line) => el('div', 'wp-line', line)),
        el('div', 'wp-question', info.question));
      hintBox.replaceChildren();
      hintBox.classList.remove('show');
      answersBox.replaceChildren();

      const sayTask = () => ctx.speak(`${info.lines.join(' ')} ${info.question}`, 'ru', `problem-${task.t}-${task.a}-${task.b}`);
      repeatBtn.onclick = () => sayTask();

      function choose(value, button) {
        if (locked || !alive) return;
        if (value !== answer) {
          wrong += 1;
          button.disabled = true;
          button.classList.add('faded');
          ctx.sound('hint');
          drawHint(task, info);
          return;
        }
        locked = true;
        button.classList.add('right');
        ctx.sound('correct');
        ctx.speak(String(answer), 'ru');
        wait(1500).then(() => resolve(wrong === 0));
      }

      for (const value of makeChoices(answer)) {
        const button = el('button', 'wp-answer', value);
        button.type = 'button';
        onTap(button, () => choose(value, button));
        answersBox.append(button);
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
    const hardPlan = planHardTasks(ctx.hard, total);

    for (let i = 0; i < total; i++) {
      const task = hardPlan.get(i) || makeTask(level, used);
      used.add(JSON.stringify(task));
      const firstTry = await playTask(task);
      if (!alive) return;
      dots[i].classList.add('done');
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < LEVEL_KINDS.length - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(JSON.stringify(task), task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные задачи — ещё раз в конце. На результат не влияют.
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
      mistakes: again.map((t) => {
        const info = describe(t);
        return { key: JSON.stringify(t), label: `${info.lines.join(' ')} ${info.question}` };
      }),
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
