// (немецкий) Lange Sätze. Длинные предложения: как «Sätze bauen», но 6 слов. Слова лежат вперемешку,
// ребёнок ставит их по порядку (касанием или перетаскиванием на рамку). Рядом картинка-подсказка.
// Уровни: 0 — «Die Katze trinkt Milch und schläft»; 1 — «Der große Hund läuft im Wald» (с прилагательным);
// 2 — «Hund und Katze spielen im Garten»; 3 — любые, плюс одно лишнее слово.
// После ошибки уровень падает, после двух верных подряд растёт.
// Предложения, в которых ошибались, повторяются в конце серии.

import { TEXT } from './texts.js';
import { SENTENCES } from './data.js';

const LEVEL_KINDS = [['two'], ['adj'], ['pair'], ['two', 'adj', 'pair']];
const EXTRA_CHIP_LEVEL = 3; // с этого уровня добавляется лишнее слово
const CLEAN_TO_LEVEL_UP = 2;
const GHOST_AFTER_WRONG = 2; // после стольких ошибок на слоте показываем первую букву
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const sentencesByKey = new Map(SENTENCES.map((s) => [s.key, s]));

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeTask(level, used) {
  const kind = pick(LEVEL_KINDS[level]);
  const pool = SENTENCES.filter((s) => s.kind === kind);
  const fresh = pool.filter((s) => !used.has(s.key));
  return pick(fresh.length ? fresh : pool);
}

// Слова-кнопки: нужные вперемешку (и на верхнем уровне одно лишнее, не подходящее к картинке).
function makeChips(task, level) {
  const words = [...task.words];
  if (level >= EXTRA_CHIP_LEVEL) {
    const have = new Set(words.map((w) => w.toLowerCase()));
    const spare = task.extras.filter((w) => !have.has(w.toLowerCase()));
    if (spare.length) {
      words.push(pick(spare));
    }
  }
  return shuffle(words);
}

function planHardTasks(hardKeys, total) {
  const planned = new Map();
  const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
  const tasks = hardKeys.map((key) => sentencesByKey.get(key)).filter(Boolean);
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
  const root = el('div', 'rlongde');
  const dotsBox = el('div', 'rld-dots');
  const repeatBtn = el('button', 'rld-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'rld-top');
  top.append(dotsBox, repeatBtn);

  const scene = el('div', 'rld-scene');
  const frame = el('div', 'rld-frame');
  const tray = el('div', 'rld-tray');
  root.append(top, scene, frame, tray);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'rld-dot again' : 'rld-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  const sayPrompt = () => ctx.speak(TEXT.prompt, 'de', 'long-prompt');
  repeatBtn.onclick = () => sayPrompt();

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок собрал предложение без единой ошибки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      const expected = task.words;
      const slots = [];
      const wrongAt = expected.map(() => 0);
      let position = 0;
      let wrong = 0;
      let locked = false;

      scene.replaceChildren(...task.scene.map((emoji) => el('span', 'rld-pic', emoji)));
      scene.classList.remove('hop');
      frame.className = 'rld-frame';
      frame.replaceChildren();
      tray.replaceChildren();

      for (const word of expected) {
        const slot = el('span', 'rld-slot');
        slot.style.minWidth = `calc(${word.length} * 0.62em + 0.8em)`;
        slots.push(slot);
        frame.append(slot);
      }
      slots[0].classList.add('next');

      async function choose(chip) {
        if (locked || !alive || chip.classList.contains('placed')) return;
        const word = chip.dataset.word;
        if (word !== expected[position]) {
          wrong += 1;
          wrongAt[position] += 1;
          ctx.sound('hint');
          chip.classList.remove('shake');
          void chip.offsetWidth; // перезапуск анимации
          chip.classList.add('shake');
          if (wrongAt[position] >= GHOST_AFTER_WRONG) {
            slots[position].dataset.ghost = expected[position][0];
          }
          return;
        }
        // Верное слово встаёт на своё место.
        ctx.sound('tap');
        const slot = slots[position];
        slot.textContent = word;
        slot.classList.remove('next');
        slot.classList.add('filled');
        delete slot.dataset.ghost;
        chip.classList.add('placed');
        chip.disabled = true;
        position += 1;
        if (position < expected.length) {
          slots[position].classList.add('next');
          return;
        }
        locked = true;
        frame.classList.add('done');
        scene.classList.add('hop');
        ctx.sound('correct');
        ctx.speak(expected.join(' '), 'de');
        await wait(1700);
        resolve(wrong === 0);
      }

      for (const word of makeChips(task, level)) {
        const chip = el('button', 'rld-chip', word);
        chip.type = 'button';
        chip.dataset.word = word;
        makeDraggable(chip, frame, () => choose(chip));
        tray.append(chip);
      }

      sayPrompt();
    });
  }

  // Слово ставится касанием или перетаскиванием на рамку с предложением.
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
        button.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
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
      const task = hardPlan.get(i) || makeTask(level, used);
      used.add(task.key);
      const firstTry = await playTask(task, level);
      ctx.task({ ok: firstTry, level });
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
        mistakes.set(task.key, task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные предложения — ещё раз в конце. На результат не влияют.
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
      mistakes: again.map((t) => ({ key: t.key, label: `${t.scene.join('')} ${t.key}` })),
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
