// Der, die oder das? Ein Wort mit Bild (später ohne Bild): das Kind wählt den passenden Artikel.
// Stufen: 0 — zwei Artikel zur Wahl, häufige Wörter, farbige Knöpfe; 1 — alle drei Artikel, farbig;
// 2 — ohne Farben; 3 — ohne Farben und ohne Bild (nur das Wort).
// Nach einem Fehler werden die Knöpfe farbig, nach dem zweiten Fehler leuchtet der richtige Artikel.
// Fehler werden am Ende der Serie wiederholt. Gelernte Wörter (Kern: ctx.words) kommen seltener.

import { TEXT } from './texts.js';
import { NOUNS, ARTICLES } from './data.js';

const LEVELS = [
  { options: 2, colors: true, picture: true, easyOnly: true },
  { options: 3, colors: true, picture: true },
  { options: 3, colors: false, picture: true },
  { options: 3, colors: false, picture: false },
];
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const WRONG_BEFORE_POINTING = 2;

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const byWord = new Map(NOUNS.map((n) => [n.word, n]));

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
  ctx.words.size('de-art', NOUNS.length);
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

  // ---------- Разметка ----------
  const root = el('div', 'art');
  const dotsBox = el('div', 'art-dots');
  const repeatBtn = el('button', 'art-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'art-top');
  top.append(dotsBox, repeatBtn);

  const picture = el('div', 'art-picture');
  const slot = el('span', 'art-slot', TEXT.question);
  const noun = el('span', 'art-noun');
  const phrase = el('div', 'art-phrase');
  phrase.append(slot, noun);
  const stage = el('div', 'art-stage');
  stage.append(picture, phrase);
  const options = el('div', 'art-options');
  root.append(top, stage, options);
  ctx.container.append(root);

  const dots = [];
  function addDot(again) {
    const dot = el('span', again ? 'art-dot again' : 'art-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }
  for (let i = 0; i < total; i++) addDot(false);

  const sayPrompt = () => ctx.speak(TEXT.prompt, 'de', 'articles-prompt');
  repeatBtn.onclick = () => sayPrompt();

  // ---------- Одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      const cfg = LEVELS[level];
      let wrong = 0;
      let locked = false;

      picture.textContent = cfg.picture ? task.emoji : '❓';
      picture.className = cfg.picture ? 'art-picture' : 'art-picture hidden-picture';
      slot.textContent = TEXT.question;
      slot.className = 'art-slot';
      noun.textContent = task.word;
      options.replaceChildren();

      const articles = cfg.options === 2
        ? shuffle([task.art, shuffle(ARTICLES.filter((a) => a !== task.art))[0]])
        : ARTICLES;
      const buttons = new Map();

      function choose(article) {
        if (locked || !alive) return;
        const btn = buttons.get(article);
        if (article !== task.art) {
          wrong += 1;
          btn.disabled = true;
          btn.classList.add('faded');
          ctx.sound('hint');
          for (const b of buttons.values()) b.classList.add('colored'); // подсказка: цвета артиклей
          if (wrong >= WRONG_BEFORE_POINTING) buttons.get(task.art).classList.add('point');
          return;
        }
        locked = true;
        btn.classList.add('right');
        slot.textContent = task.art;
        slot.className = `art-slot filled art-${task.art}`;
        picture.className = 'art-picture ok hop';
        picture.textContent = task.emoji;
        ctx.sound('correct');
        ctx.speak(`${task.art} ${task.word}`, 'de');
        wait(1500).then(() => resolve(wrong === 0));
      }

      for (const article of articles) {
        const btn = el('button', `art-btn art-${article}${cfg.colors ? ' colored' : ''}`, article);
        btn.type = 'button';
        onTap(btn, () => choose(article));
        buttons.set(article, btn);
        options.append(btn);
      }
      sayPrompt();
    });
  }

  // ---------- Серия ----------
  function makeTask(level, used) {
    let pool = NOUNS.filter((n) => !used.has(n.word));
    if (LEVELS[level].easyOnly) {
      const easy = pool.filter((n) => n.easy);
      if (easy.length) pool = easy;
    }
    if (!pool.length) pool = NOUNS;
    // Выученные слова выпадают реже (ядро хранит, что ребёнок знает)
    return ctx.words.pick(pool, (n) => `de-art:${n.word}`);
  }

  async function run() {
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();

    // Трудные слова из прошлых серий — в случайных местах серии.
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    for (const task of shuffle(ctx.hard.map((k) => byWord.get(k)).filter(Boolean)).slice(0, 2)) {
      if (positions.length) planned.set(positions.pop(), task);
    }

    for (let i = 0; i < total; i++) {
      const task = planned.get(i) || makeTask(level, used);
      used.add(task.word);
      const firstTry = await playTask(task, level);
      ctx.task({ ok: firstTry, level, key: `de-art:${task.word}` });
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
        mistakes.set(task.word, task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Слова, в которых ошиблись, — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i], Math.min(level, 2)); // повтор с картинкой
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      level,
      total,
      mistakes: again.map((t) => ({ key: t.word, label: `${t.emoji} ${t.art} ${t.word}` })),
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
