// ТЕСТ. Собери слово из букв: показана картинка, буквы лежат вперемешку, ребёнок ставит их по порядку
// (касанием или перетаскиванием на ряд клеток). Слова — из «Читаем слова» (../reading-ru/words.js).
// Уровни — длина слова: 0 — 3–4 буквы; 1 — 4–5; 2 — 5–6; 3 — 6–9 и две лишние буквы.
// Неверная буква мягко «трясётся»; после двух ошибок на одной клетке подсвечивается нужная буква.
// После ошибки уровень падает, после двух верных подряд растёт. Ошибочные слова повторяются в конце серии.

import { TEXT } from './texts.js';
import { WORDS } from '../reading-ru/words.js';

const LEVEL_LEN = [[3, 4], [4, 5], [5, 6], [6, 9]]; // длина слова на каждом уровне: от и до
const EXTRA_LETTERS_LEVEL = 3; // с этого уровня добавляются две лишние буквы
const CLEAN_TO_LEVEL_UP = 2;
const POINT_AFTER_WRONG = 2; // после стольких ошибок на клетке подсвечивается нужная буква
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием
const ALPHABET = [...'абвгдежзийклмнопрстуфхцчшщыэюя'];

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const wordsByText = new Map(WORDS.map((w) => [w.word, w]));

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeTask(level, used) {
  const [min, max] = LEVEL_LEN[level];
  const pool = WORDS.filter((w) => w.word.length >= min && w.word.length <= max);
  const fresh = pool.filter((w) => !used.has(w.word));
  return pick(fresh.length ? fresh : pool);
}

// Буквы-кнопки: нужные вперемешку (и на верхнем уровне две лишние, которых нет в слове).
function makeLetters(item, level) {
  const letters = [...item.word];
  if (level >= EXTRA_LETTERS_LEVEL) {
    const spare = ALPHABET.filter((l) => !letters.includes(l));
    letters.push(...shuffle(spare).slice(0, 2));
  }
  // Не оставляем буквы в том же порядке, что и в слове.
  let mixed = shuffle(letters);
  for (let attempt = 0; attempt < 10 && mixed.join('').startsWith(item.word); attempt++) mixed = shuffle(letters);
  return mixed;
}

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
  const root = el('div', 'rletters');
  const dotsBox = el('div', 'rt-dots');
  const repeatBtn = el('button', 'rt-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'rt-top');
  top.append(dotsBox, repeatBtn);

  const picture = el('div', 'rt-picture');
  const prompt = el('div', 'rt-prompt', TEXT.prompt);
  const frame = el('div', 'rt-frame');
  const tray = el('div', 'rt-tray');
  root.append(top, picture, prompt, frame, tray);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'rt-dot again' : 'rt-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок собрал слово без единой ошибки.
  function playTask(item, level) {
    return new Promise((resolve) => {
      const expected = [...item.word];
      const slots = [];
      const tiles = [];
      const wrongAt = expected.map(() => 0);
      let position = 0;
      let wrong = 0;
      let locked = false;

      repeatBtn.onclick = () => ctx.speak(item.word, 'ru');
      picture.textContent = item.emoji;
      picture.classList.remove('hop');
      frame.className = 'rt-frame';
      frame.replaceChildren();
      tray.replaceChildren();

      for (let i = 0; i < expected.length; i++) {
        const slot = el('span', 'rt-slot');
        slots.push(slot);
        frame.append(slot);
      }
      slots[0].classList.add('next');

      async function choose(tile) {
        if (locked || !alive || tile.classList.contains('placed')) return;
        const letter = tile.dataset.letter;
        if (letter !== expected[position]) {
          wrong += 1;
          wrongAt[position] += 1;
          ctx.sound('hint');
          tile.classList.remove('shake');
          void tile.offsetWidth; // перезапуск анимации
          tile.classList.add('shake');
          if (wrongAt[position] >= POINT_AFTER_WRONG) {
            tiles.find((t) => !t.classList.contains('placed') && t.dataset.letter === expected[position])?.classList.add('point');
          }
          return;
        }
        // Верная буква встаёт на своё место.
        ctx.sound('tap');
        const slot = slots[position];
        slot.textContent = letter;
        slot.classList.remove('next');
        slot.classList.add('filled');
        tile.classList.remove('point');
        tile.classList.add('placed');
        tile.disabled = true;
        position += 1;
        if (position < expected.length) {
          slots[position].classList.add('next');
          return;
        }
        locked = true;
        frame.classList.add('done');
        picture.classList.add('hop');
        ctx.sound('correct');
        ctx.speak(item.word, 'ru');
        await wait(1700);
        resolve(wrong === 0);
      }

      for (const letter of makeLetters(item, level)) {
        const tile = el('button', 'rt-tile', letter);
        tile.type = 'button';
        tile.dataset.letter = letter;
        makeDraggable(tile, frame, () => choose(tile));
        tiles.push(tile);
        tray.append(tile);
      }
    });
  }

  // Буква ставится касанием или перетаскиванием на ряд клеток.
  function makeDraggable(button, target, onChoose) {
    let origin = null;
    let dragging = false;

    const overTarget = (x, y) => {
      const r = target.getBoundingClientRect();
      const pad = 40;
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
    let level = 0;
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const hardPlan = planHardTasks(ctx.hard, total);

    for (let i = 0; i < total; i++) {
      const item = hardPlan.get(i) || makeTask(level, used);
      used.add(item.word);
      const firstTry = await playTask(item, level);
      if (!alive) return;
      dots[i].classList.add('done');
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < LEVEL_LEN.length - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(item.word, item);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Слова, в которых ошиблись, — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i], level);
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      total,
      mistakes: again.map((item) => ({ key: item.word, label: `${item.emoji} ${item.word}` })),
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
