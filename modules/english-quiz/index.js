// Hello! Угадай слово: звучит английское слово (голос Sonia), нужно выбрать картинку.
// Тема выбирается в начале (или «Mix» — все слова). Уровни: 0 — 3 картинки из разных тем;
// 1 — 3 картинки из одной темы; 2 и 3 — 4 картинки из одной темы.
// После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные слова повторяются в конце серии. Слова — modules/english-words/words.json.

import { TEXT } from './texts.js';

const OPTIONS_BY_LEVEL = [3, 3, 4, 4]; // сколько картинок на выбор
const SAME_TOPIC_FROM_LEVEL = 1; // с этого уровня лишние картинки берутся из той же темы
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

// Картинка слова: эмодзи, цветной кружок или число с предметами.
function picture(word) {
  const box = el('div', 'eq-pic');
  if (word.color) {
    const swatch = el('div', 'eq-swatch');
    swatch.style.background = word.color;
    box.append(swatch);
  } else if (word.number) {
    box.append(el('div', 'eq-digit', String(word.number)), el('div', 'eq-stars', '⭐'.repeat(word.number)));
  } else {
    box.append(el('div', 'eq-emoji', word.emoji));
  }
  return box;
}

const iconOf = (word) => word.emoji || (word.color ? '🎨' : String(word.number));

export async function start(ctx) {
  const { topics } = await fetch(new URL('../english-words/words.json', import.meta.url)).then((r) => r.json());
  const all = topics.flatMap((t) => t.words.map((w) => ({ ...w, topic: t.id })));
  const byKey = new Map(all.map((w) => [w.en, w]));
  const total = ctx.settings.seriesLength;
  const showTranslation = Boolean(ctx.settings.translation);
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

  const root = el('div', 'eq');
  ctx.container.append(root);

  // ---------- выбор темы ----------
  function showTopics() {
    const tile = (info, pool) => {
      const node = button('eq-topic', '', () => run(pool));
      node.append(el('span', 'eq-topic-icon', info.icon), el('span', 'eq-topic-title', info.title), el('span', 'eq-topic-ru', info.ru));
      return node;
    };
    const grid = el('div', 'eq-topics');
    grid.append(
      ...topics.map((t) => tile(t, all.filter((w) => w.topic === t.id))),
      tile(TEXT.mix, all));
    root.replaceChildren(el('div', 'eq-heading', TEXT.chooseTopic), grid);
  }

  // ---------- разметка серии ----------
  function buildSeries(onSpeak) {
    const dotsBox = el('div', 'eq-dots');
    const top = el('div', 'eq-top');
    top.append(dotsBox);
    const speaker = button('eq-speaker', '🔊', onSpeak);
    speaker.setAttribute('aria-label', TEXT.repeatLabel);
    const prompt = el('div', 'eq-prompt', TEXT.prompt);
    const cards = el('div', 'eq-cards');
    root.replaceChildren(top, speaker, prompt, cards);
    const dots = [];
    const addDot = (again) => {
      const dot = el('span', again ? 'eq-dot again' : 'eq-dot');
      dotsBox.append(dot);
      dots.push(dot);
    };
    for (let i = 0; i < total; i++) addDot(false);
    return { dots, addDot, cards };
  }

  // Верная картинка + лишние. На нижнем уровне лишние из других тем (их легко отличить).
  function makeOptions(word, level) {
    const count = OPTIONS_BY_LEVEL[level];
    const same = all.filter((w) => w.topic === word.topic && w.en !== word.en);
    const other = all.filter((w) => w.topic !== word.topic);
    const source = level >= SAME_TOPIC_FROM_LEVEL ? [...shuffle(same), ...shuffle(other)] : shuffle(other);
    return shuffle([word, ...source.slice(0, count - 1)]);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок выбрал верную картинку с первой попытки.
  function playTask(ui, word, level) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      const say = () => ctx.speak(word.en, 'en');
      ui.cards.classList.remove('show-labels');
      ui.cards.replaceChildren();

      const buttons = new Map();
      for (const option of makeOptions(word, level)) {
        const card = button('eq-card', '', () => choose(option, card));
        card.append(picture(option), el('div', 'eq-label', showTranslation ? `${option.en} · ${option.ru}` : option.en));
        buttons.set(option.en, card);
        ui.cards.append(card);
      }

      async function choose(option, card) {
        if (locked || !alive) return;
        if (option.en !== word.en) {
          wrong += 1;
          card.disabled = true;
          card.classList.add('faded');
          ctx.sound('hint');
          ui.cards.classList.add('show-labels'); // подсказка: под картинками появляются слова
          if (wrong >= WRONG_BEFORE_POINTING) buttons.get(word.en).classList.add('point');
          say();
          return;
        }
        locked = true;
        card.classList.add('right');
        ui.cards.classList.add('show-labels');
        ctx.sound('correct');
        await ctx.speak(word.en, 'en');
        await wait(900);
        resolve(wrong === 0);
      }

      say();
    });
  }

  // ---------- серия ----------
  async function run(pool) {
    // Большая кнопка «услышать ещё раз» озвучивает текущее слово.
    let current = null;
    const ui = buildSeries(() => current && ctx.speak(current.en, 'en'));

    let level = 0;
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const count = total;

    // Трудные слова из прошлых серий этой темы — в случайных местах серии.
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, count - 1) }, (_, i) => i + 1));
    const poolKeys = new Set(pool.map((w) => w.en));
    for (const word of shuffle(ctx.hard.map((k) => byKey.get(k)).filter((w) => w && poolKeys.has(w.en))).slice(0, 2)) {
      if (positions.length) planned.set(positions.pop(), word);
    }

    for (let i = 0; i < count; i++) {
      const fresh = pool.filter((w) => !used.has(w.en));
      const word = planned.get(i) || pick(fresh.length ? fresh : pool);
      used.add(word.en);
      current = word;
      const firstTry = await playTask(ui, word, level);
      ctx.task({ ok: firstTry, level });
      if (!alive) return;
      ui.dots[i].classList.add('done');
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < OPTIONS_BY_LEVEL.length - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(word.en, word);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Слова, в которых ошиблись, — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => ui.addDot(true));
    for (let i = 0; i < again.length; i++) {
      current = again[i];
      await playTask(ui, again[i], level);
      if (!alive) return;
      ui.dots[count + i].classList.add('done');
    }

    ctx.finish({
      correct,
      total: count,
      mistakes: again.map((w) => ({ key: w.en, label: `${iconOf(w)} ${w.en}` })),
    });
  }

  showTopics();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
