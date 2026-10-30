// Hello! Два слова: звучит английское сочетание («red cat», голос Sonia), нужно выбрать картинку:
// нужного цвета и нужный предмет. Цвета и предметы — modules/english-words/words.json,
// какие из них берутся — phrases.json. Картинки красятся в цвет, как в русском «Читаем два слова».
// Уровни: 0 — 3 картинки, цвет один, отличаются предметы; 1 — 3 картинки, предмет один, отличаются цвета;
// 2 — 4 картинки, отличается что-то одно; 3 — 4 картинки, как угодно. После ошибки уровень падает,
// после двух верных подряд растёт. Ошибочные задания повторяются в конце серии.

import { TEXT } from './texts.js';

const LEVELS = [
  { count: 3, modes: ['nnn'] },
  { count: 3, modes: ['ccc'] },
  { count: 4, modes: ['cc-n', 'c-nn'] },
  { count: 4, modes: ['all', 'cc-n', 'c-nn'] },
];
const CLEAN_TO_LEVEL_UP = 2;
const WRONG_BEFORE_POINTING = 2; // после стольких ошибок верная картинка подсвечивается

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

const others = (list, exclude, count) => shuffle(list.filter((x) => x !== exclude)).slice(0, count);
const keyOf = ({ color, noun }) => `${color.en}:${noun.en}`;
const phraseOf = ({ color, noun }) => `${color.en} ${noun.en}`;

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

function button(className, label, handler) {
  const node = el('button', className, label);
  node.type = 'button';
  onTap(node, handler);
  return node;
}

// Картинка: эмодзи -> оттенки серого -> умножение на цвет -> вырезаем по контуру эмодзи.
function tintedEmoji(emoji, hex, px = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  canvas.className = 'ep-canvas';
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

export async function start(ctx) {
  const [{ topics }, setup] = await Promise.all([
    fetch(new URL('../english-words/words.json', import.meta.url)).then((r) => r.json()),
    fetch(new URL('./phrases.json', import.meta.url)).then((r) => r.json()),
  ]);
  const words = new Map(topics.flatMap((t) => t.words).map((w) => [w.en, w]));
  const COLORS = setup.colors.map((id) => words.get(id)).filter((w) => w && w.color).map((w) => ({ en: w.en, hex: w.color }));
  const NOUNS = setup.nouns.map((id) => words.get(id)).filter((w) => w && w.emoji).map((w) => ({ en: w.en, emoji: w.emoji }));
  const colorsById = new Map(COLORS.map((c) => [c.en, c]));
  const nounsById = new Map(NOUNS.map((n) => [n.en, n]));

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
  const root = el('div', 'ep');
  const dotsBox = el('div', 'ep-dots');
  const top = el('div', 'ep-top');
  top.append(dotsBox);
  let current = null;
  const speaker = button('ep-speaker', '🔊', () => current && ctx.speak(phraseOf(current), 'en'));
  speaker.setAttribute('aria-label', TEXT.repeatLabel);
  const prompt = el('div', 'ep-prompt', TEXT.prompt);
  const cards = el('div', 'ep-cards');
  root.append(top, speaker, prompt, cards);
  ctx.container.append(root);

  const dots = [];
  const addDot = (again) => {
    const dot = el('span', again ? 'ep-dot again' : 'ep-dot');
    dotsBox.append(dot);
    dots.push(dot);
  };
  for (let i = 0; i < total; i++) addDot(false);

  // ---------- задания ----------
  function makeTask(used) {
    let task;
    for (let attempt = 0; attempt < 30; attempt++) {
      task = { noun: pick(NOUNS), color: pick(COLORS) };
      if (!used.has(keyOf(task))) break;
    }
    return task;
  }

  // Верная картинка + неверные; чем они отличаются — зависит от режима уровня.
  function makeOptions(task, level) {
    const { noun, color } = task;
    const { count, modes } = LEVELS[level];
    const mode = pick(modes);
    const n = count - 1;
    let wrong;
    if (mode === 'nnn') wrong = others(NOUNS, noun, n).map((x) => ({ color, noun: x }));
    else if (mode === 'ccc') wrong = others(COLORS, color, n).map((c) => ({ color: c, noun }));
    else if (mode === 'cc-n') {
      wrong = [
        ...others(COLORS, color, 2).map((c) => ({ color: c, noun })),
        { color, noun: others(NOUNS, noun, 1)[0] },
      ];
    } else if (mode === 'c-nn') {
      wrong = [
        { color: others(COLORS, color, 1)[0], noun },
        ...others(NOUNS, noun, 2).map((x) => ({ color, noun: x })),
      ];
    } else {
      const nouns = others(NOUNS, noun, n);
      const colors = others(COLORS, color, n);
      wrong = nouns.map((x, i) => ({ color: colors[i], noun: x }));
    }
    return shuffle([task, ...wrong]);
  }

  // Возвращает true, если ребёнок выбрал верную картинку с первой попытки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      const say = () => ctx.speak(phraseOf(task), 'en');
      cards.classList.remove('show-labels');
      cards.replaceChildren();

      const buttons = new Map();
      for (const option of makeOptions(task, level)) {
        const card = button('ep-card', '', () => choose(option, card));
        const pic = el('div', 'ep-pic');
        pic.append(tintedEmoji(option.noun.emoji, option.color.hex));
        card.append(pic, el('div', 'ep-label', phraseOf(option)));
        buttons.set(keyOf(option), card);
        cards.append(card);
      }

      async function choose(option, card) {
        if (locked || !alive) return;
        if (keyOf(option) !== keyOf(task)) {
          wrong += 1;
          card.disabled = true;
          card.classList.add('faded');
          ctx.sound('hint');
          cards.classList.add('show-labels'); // подсказка: под картинками появляются слова
          if (wrong >= WRONG_BEFORE_POINTING) buttons.get(keyOf(task)).classList.add('point');
          say();
          return;
        }
        locked = true;
        card.classList.add('right');
        cards.classList.add('show-labels');
        ctx.sound('correct');
        await say();
        await wait(900);
        resolve(wrong === 0);
      }

      say();
    });
  }

  // Трудные задания из прошлых серий («red:cat») — в случайных местах серии.
  function planHardTasks() {
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    const tasks = ctx.hard
      .map((key) => {
        const [colorId, nounId] = key.split(':');
        const color = colorsById.get(colorId);
        const noun = nounsById.get(nounId);
        return color && noun ? { color, noun } : null;
      })
      .filter(Boolean);
    for (const task of shuffle(tasks).slice(0, 2)) {
      if (positions.length) planned.set(positions.pop(), task);
    }
    return planned;
  }

  // ---------- серия ----------
  async function run() {
    let level = 0;
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const planned = planHardTasks();

    for (let i = 0; i < total; i++) {
      const task = planned.get(i) || makeTask(used);
      used.add(keyOf(task));
      current = task;
      const firstTry = await playTask(task, level);
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
      current = again[i];
      await playTask(again[i], level);
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      total,
      mistakes: again.map((t) => ({ key: keyOf(t), label: `${t.noun.emoji} ${phraseOf(t)}` })),
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
