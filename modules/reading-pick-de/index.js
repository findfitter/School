// (немецкий) Lesen und Bild finden. Читаем и ищем картинку: показано слово (потом два слова, потом
// предложение) без картинки, нужно выбрать подходящую из нескольких. Ребёнок читает по-настоящему.
// Уровни: 0 — слово до 5 букв, 3 картинки; 1 — слово до 8 букв, 4 похожих по написанию слова;
// 2 — два слова («roter Hund»), 4 картинки; 3 — предложение («Die Katze trinkt Milch»), 4 картинки.
// После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные задания повторяются в конце серии. Слова и предложения берутся из соседних немецких модулей.

import { TEXT } from './texts.js';
import { WORDS } from '../reading-de/words.js';
import { COLORS, NOUNS } from '../reading-phrases-de/data.js';
import { SENTENCES } from '../reading-sentences-de/data.js';

const LEVELS = [
  { type: 'word', maxLen: 5, count: 3 },
  { type: 'word', maxLen: 8, count: 4, similar: true },
  { type: 'phrase', count: 4 },
  { type: 'sentence', count: 4 },
];
const CLEAN_TO_LEVEL_UP = 2;
const WRONG_BEFORE_POINTING = 2; // после стольких ошибок верная картинка подсвечивается

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const others = (list, exclude, count) => shuffle(list.filter((x) => x !== exclude)).slice(0, count);

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const colorsById = new Map(COLORS.map((c) => [c.id, c]));
const nounsByWord = new Map(NOUNS.map((n) => [n.word, n]));
const wordsByText = new Map(WORDS.map((w) => [w.word, w]));
const sentencesByKey = new Map(SENTENCES.map((s) => [s.key, s]));
const pickSentences = SENTENCES.filter((s) => s.kind === 'act' || s.kind === 'place');

// ---------- описание задания ----------
// task: { key, text, level, view } — view описывает картинку: { emojis: [..] } | { tint: [emoji, hex] }
const wordTask = (item) => ({
  key: `w:${item.word}`,
  text: item.word,
  level: item.word.length > LEVELS[0].maxLen ? 1 : 0,
  view: { emojis: [item.emoji] },
});
const phraseTask = (color, noun) => ({
  key: `p:${color.id}:${noun.word}`,
  text: `${color[noun.g]} ${noun.word}`,
  level: 2,
  view: { tint: [noun.emoji, color.hex] },
});
const sentenceTask = (s) => ({ key: `s:${s.key}`, text: s.key, level: 3, view: { emojis: s.scene } });

// Ключ трудного задания («w:кот», «p:red:кот», «s:Кот пьёт молоко») -> задание.
function taskFromKey(key) {
  const [type, a, b] = key.split(':');
  if (type === 'w') return wordsByText.has(a) ? wordTask(wordsByText.get(a)) : null;
  if (type === 'p') return colorsById.has(a) && nounsByWord.has(b) ? phraseTask(colorsById.get(a), nounsByWord.get(b)) : null;
  if (type === 's') {
    const s = sentencesByKey.get(key.slice(2));
    return s ? sentenceTask(s) : null;
  }
  return null;
}

// Чем больше слова похожи на целевое (первая буква, длина, конец), тем труднее выбор.
function similarity(a, b) {
  let score = 0;
  if (a[0] === b[0]) score += 3;
  if (Math.abs(a.length - b.length) <= 1) score += 2;
  if (a[a.length - 1] === b[b.length - 1]) score += 1;
  return score;
}

function makeTask(level, used) {
  const { type, maxLen } = LEVELS[level];
  if (type === 'word') {
    const pool = WORDS.filter((w) => w.word.length <= maxLen && !used.has(`w:${w.word}`));
    const longest = pool.filter((w) => w.word.length >= maxLen - 1);
    return { ...wordTask(pick(longest.length && Math.random() < 0.6 ? longest : pool.length ? pool : WORDS)), level };
  }
  if (type === 'phrase') {
    let noun;
    let color;
    for (let attempt = 0; attempt < 30; attempt++) {
      noun = pick(NOUNS);
      color = pick(COLORS);
      if (!used.has(`p:${color.id}:${noun.word}`)) break;
    }
    return phraseTask(color, noun);
  }
  const fresh = pickSentences.filter((s) => !used.has(`s:${s.key}`));
  return sentenceTask(pick(fresh.length ? fresh : pickSentences));
}

// Верная картинка + неверные. Количество и сходство зависят от уровня задания.
function makeOptions(task) {
  const { type, maxLen, count, similar } = LEVELS[task.level];
  const n = count - 1;
  if (type === 'word') {
    const word = task.text;
    const max = Math.max(maxLen, word.length);
    const pool = WORDS.filter((w) => w.word !== word && w.word.length <= max);
    const wrong = similar
      ? pool
          .map((w) => ({ w, score: similarity(word, w.word) + Math.random() * 2 }))
          .sort((x, y) => y.score - x.score)
          .slice(0, n)
          .map(({ w }) => w)
      : shuffle(pool).slice(0, n);
    return shuffle([task, ...wrong.map(wordTask)]);
  }
  if (type === 'phrase') {
    const [, colorId, nounWord] = task.key.split(':');
    const color = colorsById.get(colorId);
    const noun = nounsByWord.get(nounWord);
    const mode = pick(['cc-n', 'c-nn', 'all']);
    let wrong;
    if (mode === 'cc-n') {
      wrong = [...others(COLORS, color, 2).map((c) => [c, noun]), [color, others(NOUNS, noun, 1)[0]]];
    } else if (mode === 'c-nn') {
      wrong = [[others(COLORS, color, 1)[0], noun], ...others(NOUNS, noun, 2).map((x) => [color, x])];
    } else {
      const nouns = others(NOUNS, noun, n);
      const colors = others(COLORS, color, n);
      wrong = nouns.map((x, i) => [colors[i], x]);
    }
    return shuffle([task, ...wrong.map(([c, x]) => phraseTask(c, x))]);
  }
  // предложение: одна неверная делит героя, другая — вторую картинку, остальные совсем другие
  const source = sentencesByKey.get(task.key.slice(2));
  const [a, b] = source.scene;
  const same = shuffle(pickSentences.filter((s) => s.kind === source.kind && s.key !== source.key));
  const chosen = [];
  const take = (list) => {
    const found = list.find((s) => !chosen.includes(s) && s.scene.join('') !== source.scene.join(''));
    if (found && chosen.length < n) chosen.push(found);
  };
  take(same.filter((s) => s.scene[0] === a && s.scene[1] !== b));
  take(same.filter((s) => s.scene[1] === b && s.scene[0] !== a));
  for (const s of same.filter((x) => x.scene[0] !== a && x.scene[1] !== b)) take([s]);
  for (const s of same) take([s]);
  return shuffle([task, ...chosen.map(sentenceTask)]);
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

// Картинка: эмодзи -> оттенки серого -> умножение на цвет -> вырезаем по контуру эмодзи.
function tintedEmoji(emoji, hex, px = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  canvas.className = 'rpd-canvas';
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

function pictureOf(view) {
  const box = el('div', 'rpd-pic');
  if (view.tint) box.append(tintedEmoji(...view.tint));
  else {
    if (view.emojis.length > 1) box.classList.add('multi'); // предложение: две картинки рядом, помельче
    for (const emoji of view.emojis) box.append(el('span', 'rpd-emoji', emoji));
  }
  return box;
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
  const root = el('div', 'rpd');
  const dotsBox = el('div', 'rpd-dots');
  const repeatBtn = el('button', 'rpd-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'rpd-top');
  top.append(dotsBox, repeatBtn);
  const prompt = el('div', 'rpd-prompt', TEXT.prompt);
  const text = el('div', 'rpd-text');
  const cards = el('div', 'rpd-cards');
  root.append(top, prompt, text, cards);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'rpd-dot again' : 'rpd-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок выбрал верную картинку с первой попытки.
  function playTask(task) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      const say = () => ctx.speak(task.text, 'de');
      repeatBtn.onclick = () => say();
      text.textContent = task.text;
      text.dataset.size = task.text.length > 14 ? 'long' : task.text.includes(' ') ? 'mid' : 'short';
      cards.replaceChildren();

      const buttons = new Map();
      for (const option of makeOptions(task)) {
        const card = el('button', 'rpd-card');
        card.type = 'button';
        card.append(pictureOf(option.view));
        onTap(card, () => choose(option, card));
        buttons.set(option.key, card);
        cards.append(card);
      }

      async function choose(option, card) {
        if (locked || !alive) return;
        if (option.key !== task.key) {
          wrong += 1;
          card.disabled = true;
          card.classList.add('faded');
          ctx.sound('hint');
          if (wrong >= WRONG_BEFORE_POINTING) buttons.get(task.key).classList.add('point');
          return;
        }
        locked = true;
        card.classList.add('right');
        ctx.sound('correct');
        await say();
        await wait(1000);
        resolve(wrong === 0);
      }
    });
  }

  // Трудные задания из прошлых серий — в случайных местах серии.
  function planHardTasks() {
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    const tasks = ctx.hard.map(taskFromKey).filter(Boolean);
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
      const task = planned.get(i) || makeTask(level, used);
      used.add(task.key);
      const firstTry = await playTask(task);
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
      total,
      mistakes: again.map((task) => ({ key: task.key, label: task.text })),
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
