// Читаем два слова: по цветной картинке («зелёный кот») выбрать верную подпись из четырёх.
// Картинка — эмодзи, перекрашенное кодом в нужный цвет.
// Сложность: уровень 0 — подписи различаются обоими словами, дальше — только одним
// (как «красный кот», «синий кот», «зелёная собака» к зелёному коту), длина предметов растёт.
// После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные картинки повторяются в конце серии (с новой подборкой подписей).

import { TEXT } from './texts.js';
import { COLORS, NOUNS } from './data.js';

const LEVEL_MAX_LEN = [5, 5, 7, 10]; // самое длинное слово-предмет на каждом уровне
const LEVEL_MODES = [['all'], ['cc-n', 'c-nn'], ['cc-n', 'c-nn'], ['cc-n', 'c-nn', 'ccc', 'nnn']];
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const keyOf = (color, noun) => `${color.id}:${noun.word}`;
const phraseOf = (color, noun) => `${color[noun.g]} ${noun.word}`;
const nounsByWord = new Map(NOUNS.map((n) => [n.word, n]));
const colorsById = new Map(COLORS.map((c) => [c.id, c]));

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const others = (list, exclude, count) => shuffle(list.filter((x) => x !== exclude)).slice(0, count);

function makeTask(level, used) {
  const nounPool = NOUNS.filter((n) => n.word.length <= LEVEL_MAX_LEN[level]);
  let noun;
  let color;
  for (let attempt = 0; attempt < 30; attempt++) {
    noun = pick(nounPool);
    color = pick(COLORS);
    if (!used.has(keyOf(color, noun))) break;
  }
  return { noun, color };
}

// Верная подпись + три неверных; какие слова отличаются — зависит от режима.
function makeOptions({ noun, color }, level) {
  const nounPool = NOUNS.filter((n) => n.word.length <= Math.max(LEVEL_MAX_LEN[level], noun.word.length));
  const mode = pick(LEVEL_MODES[level]);
  let wrong;
  if (mode === 'all') {
    const nouns = others(nounPool, noun, 3);
    const colors = others(COLORS, color, 3);
    wrong = nouns.map((n, i) => ({ color: colors[i], noun: n }));
  } else if (mode === 'cc-n') {
    wrong = [
      ...others(COLORS, color, 2).map((c) => ({ color: c, noun })),
      { color, noun: others(nounPool, noun, 1)[0] },
    ];
  } else if (mode === 'c-nn') {
    wrong = [
      { color: others(COLORS, color, 1)[0], noun },
      ...others(nounPool, noun, 2).map((n) => ({ color, noun: n })),
    ];
  } else if (mode === 'ccc') {
    wrong = others(COLORS, color, 3).map((c) => ({ color: c, noun }));
  } else {
    wrong = others(nounPool, noun, 3).map((n) => ({ color, noun: n }));
  }
  return shuffle([{ color, noun }, ...wrong]);
}

// Картинка: эмодзи -> оттенки серого -> умножение на цвет -> вырезаем по контуру эмодзи.
function tintedEmoji(emoji, hex, px = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const g = canvas.getContext('2d');
  const draw = () => {
    g.font = `${Math.round(px * 0.8)}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, px / 2, px * 0.54);
  };
  g.filter = 'grayscale(1) brightness(1.35) contrast(0.95)';
  draw();
  g.filter = 'none';
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = hex;
  g.fillRect(0, 0, px, px);
  g.globalCompositeOperation = 'destination-in';
  draw();
  return canvas;
}

function planHardTasks(hardKeys, total) {
  const planned = new Map();
  const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
  const tasks = hardKeys
    .map((key) => {
      const [colorId, word] = key.split(':');
      const color = colorsById.get(colorId);
      const noun = nounsByWord.get(word);
      return color && noun ? { color, noun } : null;
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
  const root = el('div', 'phrases');
  const dotsBox = el('div', 'rp-dots');
  const repeatBtn = el('button', 'rp-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'rp-top');
  top.append(dotsBox, repeatBtn);

  const picture = el('div', 'rp-picture');
  const options = el('div', 'rp-options');
  const stage = el('div', 'rp-stage');
  stage.append(picture, options);
  root.append(top, stage);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'rp-dot again' : 'rp-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  const sayPrompt = () => ctx.speak(TEXT.prompt, 'ru', 'phrases-prompt');
  repeatBtn.onclick = () => sayPrompt();

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      let hintRun = 0;
      const buttons = [];

      picture.className = 'rp-picture';
      picture.replaceChildren(tintedEmoji(task.noun.emoji, task.color.hex));
      options.classList.remove('show-dots');
      options.replaceChildren();

      // Подсказка: у каждой подписи появляется цветная точка (цвет, который в ней назван),
      // затем подписи читаются вслух по очереди.
      async function hint() {
        const mine = ++hintRun;
        options.classList.add('show-dots');
        buttons.forEach((b) => b.classList.remove('reading-now'));
        await ctx.speak(TEXT.hint, 'ru', 'phrases-hint');
        for (const button of buttons) {
          if (!alive || mine !== hintRun) return;
          button.classList.add('reading-now');
          await ctx.speak(button.dataset.phrase, 'ru');
          button.classList.remove('reading-now');
          await wait(250);
        }
      }

      async function choose(option, button) {
        if (locked || !alive) return;
        if (keyOf(option.color, option.noun) !== keyOf(task.color, task.noun)) {
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
        ctx.sound('correct');
        ctx.speak(button.dataset.phrase, 'ru');
        await wait(1500);
        resolve(wrong === 0);
      }

      for (const option of makeOptions(task, level)) {
        const phrase = phraseOf(option.color, option.noun);
        const dot = el('span', 'rp-colordot');
        dot.style.background = option.color.hex;
        const button = el('button', 'rp-option');
        button.type = 'button';
        button.dataset.phrase = phrase;
        button.append(dot, el('span', 'rp-text', phrase));
        makeDraggable(button, picture, () => choose(option, button));
        buttons.push(button);
        options.append(button);
      }

      sayPrompt();
    });
  }

  // Ответ выбирается касанием или перетаскиванием подписи на картинку.
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
        button.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
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
    let level = Math.min(ctx.level ?? 0, LEVEL_MAX_LEN.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const hardPlan = planHardTasks(ctx.hard, total);

    for (let i = 0; i < total; i++) {
      const task = hardPlan.get(i) || makeTask(level, used);
      used.add(keyOf(task.color, task.noun));
      const firstTry = await playTask(task, level);
      ctx.task({ ok: firstTry, level });
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
        mistakes.set(keyOf(task.color, task.noun), task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные картинки — ещё раз в конце. На результат не влияют.
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
      mistakes: again.map((t) => ({
        key: keyOf(t.color, t.noun),
        label: `${t.noun.emoji} ${phraseOf(t.color, t.noun)}`,
      })),
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
