// Сложное задание: короткий текст (3–4 предложения) и один вопрос с вариантами ответа. За верный ответ
// ребёнок получает косточку 🦴 (это делает ядро, core/challenges.js). Задание висит в своём разделе,
// пока не пройдено. Раздел приходит в ctx.challenge.subject:
//   russian, german — рассказы из pools/ru.js, pools/de.js; english — рассказы с озвучкой (pools/en.json,
//   голос Sonia, audio/en/ch-…); math, orientation — задания строятся кодом (pools/math.js, pools/orientation.js).
// Текст остаётся на экране, пока выбирается ответ. Ошибка = мягкая подсказка (подсвечивается нужное
// предложение) и ещё попытка. Зерно ctx.challenge.seed делает выбор задания постоянным: если выйти и
// вернуться, текст тот же.

import { TEXT, LANG_OF } from './texts.js';
import { STORIES as RU_STORIES } from './pools/ru.js';
import { STORIES as DE_STORIES } from './pools/de.js';
import { makeMathTask } from './pools/math.js';
import { makeOrientationTask } from './pools/orientation.js';

// Генератор случайных чисел с зерном (mulberry32).
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

// Из пула берётся ещё не пройденный рассказ (если все пройдены — любой).
function pickFromPool(pool, rng, used) {
  const fresh = pool.filter((s) => !used.includes(s.id));
  const list = fresh.length ? fresh : pool;
  return { ...list[Math.floor(rng() * list.length)], pooled: true };
}

// Варианты: строка -> { t }; порядок перемешивается, номер верного пересчитывается.
function shuffleOptions(item, rng) {
  const options = item.options.map((o) => (typeof o === 'string' ? { t: o } : o));
  const right = options[item.answer];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answer: options.indexOf(right) };
}

export async function start(ctx) {
  const { subject, seed, used } = ctx.challenge;
  const lang = LANG_OF[subject] || 'ru';
  const T = TEXT[lang];
  const rng = seeded(seed);

  let item;
  if (subject === 'russian') item = pickFromPool(RU_STORIES, rng, used);
  else if (subject === 'german') item = pickFromPool(DE_STORIES, rng, used);
  else if (subject === 'math') item = makeMathTask(rng);
  else if (subject === 'orientation') item = makeOrientationTask(rng);
  else if (subject === 'english') {
    const { stories } = await fetch(new URL('./pools/en.json', import.meta.url)).then((r) => r.json());
    item = pickFromPool(stories, rng, used);
  } else {
    item = pickFromPool(RU_STORIES, rng, used);
  }
  const { options, answer } = shuffleOptions(item, rng);
  const english = lang === 'en';
  const showTranslation = english && Boolean(ctx.settings.translation);

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
  const root = el('div', 'ch');
  const head = el('div', 'ch-head');
  head.append(el('div', 'ch-title', `🦴 ${T.header}`), el('div', 'ch-note', T.note));

  const story = el('div', 'ch-story');
  const lines = item.sentences.map((sentence, i) => {
    const line = el('p', 'ch-line', sentence);
    if (showTranslation && item.tr) line.append(el('small', 'ch-tr', item.tr[i]));
    story.append(line);
    return line;
  });
  const listen = el('button', 'ch-listen', '🔊');
  listen.type = 'button';
  listen.setAttribute('aria-label', T.repeatLabel);
  listen.hidden = !ctx.voice;
  if (ctx.voice) story.append(listen);

  const ask = el('div', 'ch-ask');
  const question = el('h2', 'ch-question', item.question);
  if (showTranslation && item.questionTr) question.append(el('small', 'ch-tr', item.questionTr));
  const list = el('div', 'ch-options');
  const hint = el('div', 'ch-hint');
  ask.append(question, list, hint);
  const body = el('div', 'ch-body');
  body.append(story, ask);
  root.append(head, body);
  ctx.container.append(root);

  // ---------- озвучка (английский) ----------
  const say = async () => {
    if (!ctx.voice) return;
    await ctx.speak(item.sentences.join(' '), 'en', `ch-${item.id}-story`);
    if (!alive) return;
    await ctx.speak(item.question, 'en', `ch-${item.id}-q`);
  };
  listen.addEventListener('click', () => say());

  // ---------- ответы ----------
  let wrong = 0;
  let locked = false;
  const buttons = options.map((option, i) => {
    const b = el('button', 'ch-option');
    b.type = 'button';
    if (option.e) b.append(el('span', 'ch-opt-emoji', option.e));
    if (option.c) {
      const swatch = el('span', 'ch-opt-swatch');
      swatch.style.background = option.c;
      b.append(swatch);
    }
    if (option.n != null) b.append(el('span', 'ch-opt-digit', String(option.n)));
    if (option.t) b.append(el('span', 'ch-opt-text', option.t));
    if (!option.t) b.classList.add('ch-visual'); // картинка, цвет или число — на белой кнопке, чтобы цвет не путался с фоном
    onTap(b, () => choose(i, b));
    list.append(b);
    return b;
  });

  async function choose(index, b) {
    if (locked || !alive) return;
    if (index !== answer) {
      wrong += 1;
      b.disabled = true;
      b.classList.add('faded');
      ctx.sound('hint');
      if (item.clue != null) lines[item.clue].classList.add('clue');
      hint.textContent = T[item.hintKey] || (item.clue != null ? T.hint : T.hintPlain);
      hint.classList.add('show');
      return;
    }
    locked = true;
    b.classList.add('right');
    ctx.sound('correct');
    hint.classList.remove('show');
    await wait(1100);
    if (!alive) return;
    ctx.finish({
      correct: wrong === 0 ? 1 : 0,
      total: 1,
      mistakes: wrong ? [{ key: item.id, label: item.question }] : [],
      challengeId: item.pooled ? item.id : null,
    });
  }

  say();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
