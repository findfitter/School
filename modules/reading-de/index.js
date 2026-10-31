// (немецкий) Читаем слова: по картинке выбрать верное написанное слово из трёх.
// Сложность — длина слова. После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные слова повторяются в конце серии.

import { TEXT } from './texts.js';
import { WORDS } from './words.js';

const LEVEL_MAX_LEN = [4, 5, 7, 10]; // самое длинное слово на каждом уровне
const START_LEVEL = 0;
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const label = (item) => `${item.emoji} ${item.word}`;
const wordsByText = new Map(WORDS.map((item) => [item.word, item]));

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeTask(level, used, choose = pick) {
  const max = LEVEL_MAX_LEN[level];
  const pool = WORDS.filter((item) => item.word.length <= max);
  const fresh = pool.filter((item) => !used.has(item.word));
  const longest = fresh.filter((item) => item.word.length >= max - 1);
  const from = longest.length && Math.random() < 0.6 ? longest : fresh.length ? fresh : pool;
  return choose(from);
}

// Чем больше слова похожи на целевое (первая буква, длина, конец), тем труднее выбор.
function similarity(a, b) {
  let score = 0;
  if (a[0] === b[0]) score += 3;
  if (Math.abs(a.length - b.length) <= 1) score += 2;
  if (a[a.length - 1] === b[b.length - 1]) score += 1;
  return score;
}

function makeChoices(target, level) {
  const max = Math.max(LEVEL_MAX_LEN[level], target.word.length);
  const pool = WORDS.filter((item) => item.word !== target.word && item.word.length <= max);
  const others =
    level === 0
      ? shuffle(pool).slice(0, 2)
      : pool
          .map((item) => ({ item, score: similarity(target.word, item.word) + Math.random() * 2 }))
          .sort((x, y) => y.score - x.score)
          .slice(0, 2)
          .map(({ item }) => item);
  return shuffle([target, ...others]);
}

// Трудные слова из прошлых серий -> до двух штук в случайных местах серии.
function planHardTasks(hardKeys, total) {
  const planned = new Map();
  const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
  const tasks = hardKeys.map((key) => wordsByText.get(key)).filter(Boolean);
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
  // Выученные слова (учёт в ядре) выпадают реже, новые и непрочные — чаще.
  ctx.words.size('de', WORDS.length);
  const choose = (list) => ctx.words.pick(list, (item) => 'de:' + item.word);
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
  const root = el('div', 'reading');
  const dotsBox = el('div', 'rd-dots');
  const repeatBtn = el('button', 'rd-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'rd-top');
  top.append(dotsBox, repeatBtn);

  const picture = el('div', 'rd-picture');
  const caption = el('div', 'rd-caption');
  const stage = el('div', 'rd-stage');
  stage.append(picture, caption);

  const wordsBox = el('div', 'rd-words');
  root.append(top, stage, wordsBox);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'rd-dot again' : 'rd-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  const sayPrompt = () => ctx.speak(TEXT.prompt, 'de', 'reading-prompt');
  repeatBtn.onclick = () => sayPrompt();

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      let hintRun = 0;

      picture.textContent = task.emoji;
      picture.className = 'rd-picture';
      caption.textContent = '';
      wordsBox.replaceChildren();

      const buttons = [];

      // Подсказка: слова читаются вслух по очереди, текущее подсвечивается.
      async function hint() {
        const mine = ++hintRun;
        buttons.forEach((b) => b.classList.remove('reading-now'));
        await ctx.speak(TEXT.hint, 'de', 'reading-hint');
        for (const button of buttons) {
          if (!alive || mine !== hintRun) return;
          button.classList.add('reading-now');
          await ctx.speak(button.dataset.word, 'de');
          button.classList.remove('reading-now');
          await wait(250);
        }
      }

      async function choose(item, button) {
        if (locked || !alive) return;
        if (item.word !== task.word) {
          wrong += 1;
          button.disabled = true;
          button.classList.add('faded');
          ctx.sound('hint');
          hint();
          return;
        }
        locked = true;
        hintRun += 1;
        buttons.forEach((b) => b.classList.remove('reading-now'));
        button.classList.add('right');
        picture.classList.add('ok', 'hop');
        caption.textContent = task.word;
        ctx.sound('correct');
        ctx.speak(task.word, 'de');
        await wait(1500);
        resolve(wrong === 0);
      }

      for (const item of makeChoices(task, level)) {
        const button = el('button', 'rd-word', item.word);
        button.type = 'button';
        button.dataset.word = item.word;
        makeDraggable(button, picture, () => choose(item, button));
        buttons.push(button);
        wordsBox.append(button);
      }

      sayPrompt();
    });
  }

  // Ответ выбирается касанием или перетаскиванием слова на картинку.
  function makeDraggable(button, target, onChoose) {
    let origin = null;
    let dragging = false;

    const overTarget = (x, y) => {
      const r = target.getBoundingClientRect();
      const pad = 30;
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
        button.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
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
    let level = Math.min(ctx.level ?? START_LEVEL, LEVEL_MAX_LEN.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const hardPlan = planHardTasks(ctx.hard, total);

    for (let i = 0; i < total; i++) {
      const task = hardPlan.get(i) || makeTask(level, used, choose);
      used.add(task.word);
      const firstTry = await playTask(task, level);
      ctx.task({ ok: firstTry, level, key: 'de:' + task.word });
      if (!alive) return;
      dots[i].classList.add('done');
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < LEVEL_MAX_LEN.length - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(task.word, task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные слова — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i], level);
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      level,
      total,
      mistakes: again.map((item) => ({ key: item.word, label: label(item) })),
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
