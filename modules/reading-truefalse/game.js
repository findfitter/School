// «Правда или нет»: общий движок русского и немецкого модулей (исключение из правила «модуль самодостаточен», как у
// reading-sentences/picker.js; файл перечислен в `files` манифестов обоих модулей).
//
// Ребёнок читает короткое утверждение и нажимает «Правда» или «Неправда». Ошибка — мягкая подсказка и ещё одна попытка.
// После верного ответа показывается картинка к утверждению (у смешных — смешная), а к неверному утверждению — «как правильно».
// Задания выбирает chooser.js: знание, которое ребёнок уже видел, не выпадает, пока не показан весь банк.
// Ошибочные задания повторяются в конце серии, но в ДРУГОЙ формулировке и с обратным ответом: проверяем понимание,
// а не память на ответ. Уровни (какие темы и сколько «не») — LEVELS в chooser.js; после ошибки уровень падает,
// после трёх верных подряд растёт.

import { createChooser, planSeries, LEVELS } from './chooser.js';

const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const PRAISE_MS = 1500; // сколько показывать картинку после верного ответа
const FIX_MS = 3400; // то же, если есть «как правильно» (его нужно прочитать)
const TAP_PAD = 24; // px вокруг кнопки, где отпускание пальца ещё считается нажатием

const rnd = (n) => Math.floor(Math.random() * n);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function icon(path) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('class', 'rtf-icon');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', path);
  svg.append(p);
  return svg;
}
const CHECK = 'M9 25 L20 36 L39 12';
const CROSS = 'M12 12 L36 36 M36 12 L12 36';

export function runGame(ctx, { TEXT, bank, lang, ns }) {
  const total = ctx.settings.seriesLength;
  const chooser = createChooser(bank, {
    seen: (id) => ctx.words.seen(`${ns}:${id}`),
    status: (id) => ctx.words.status(`${ns}:${id}`),
  });
  let alive = true;
  let current = '';
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
  const root = el('div', 'rtf');
  const dotsBox = el('div', 'rtf-dots');
  const repeatBtn = el('button', 'rtf-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'rtf-top');
  top.append(dotsBox, repeatBtn);

  const prompt = el('p', 'rtf-prompt', TEXT.prompt);
  const card = el('div', 'rtf-card');
  const textBox = el('p', 'rtf-text');
  card.append(textBox);
  const pic = el('div', 'rtf-pic');
  const fix = el('p', 'rtf-fix');
  const stage = el('div', 'rtf-stage');
  stage.append(pic, fix);

  const yesBtn = el('button', 'rtf-btn yes');
  yesBtn.type = 'button';
  yesBtn.append(icon(CHECK), el('span', 'rtf-label', TEXT.yes));
  const noBtn = el('button', 'rtf-btn no');
  noBtn.type = 'button';
  noBtn.append(icon(CROSS), el('span', 'rtf-label', TEXT.no));
  const answers = el('div', 'rtf-answers');
  answers.append(yesBtn, noBtn);

  root.append(top, prompt, card, stage, answers);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'rtf-dot again' : 'rtf-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  repeatBtn.onclick = () => ctx.speak(current, lang);

  // Нажатие: Pointer Events (палец отпущен над кнопкой) и клавиатура (Enter / Пробел → click с detail === 0).
  function bindTap(button, onTap) {
    let armed = false;
    const inside = (e) => {
      const r = button.getBoundingClientRect();
      return e.clientX > r.left - TAP_PAD && e.clientX < r.right + TAP_PAD && e.clientY > r.top - TAP_PAD && e.clientY < r.bottom + TAP_PAD;
    };
    button.addEventListener('pointerdown', (e) => {
      if (button.disabled) return;
      armed = true;
      button.setPointerCapture?.(e.pointerId);
      button.classList.add('pressed');
    });
    button.addEventListener('pointerup', (e) => {
      const was = armed;
      armed = false;
      button.classList.remove('pressed');
      if (was && inside(e)) onTap();
    });
    button.addEventListener('pointercancel', () => {
      armed = false;
      button.classList.remove('pressed');
    });
    button.addEventListener('click', (e) => {
      if (e.detail === 0) onTap();
    });
  }

  // ---------- одно задание ----------
  // item: { fact, truth, text }. Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(item) {
    return new Promise((resolve) => {
      let locked = false;
      let wrong = 0;
      current = item.text;

      textBox.textContent = item.text;
      textBox.dataset.size = item.text.length > 46 ? 'long' : item.text.length > 30 ? 'mid' : 'short';
      prompt.textContent = TEXT.prompt;
      prompt.classList.remove('retry');
      pic.textContent = '🤔';
      pic.className = 'rtf-pic waiting';
      fix.textContent = '';
      fix.classList.remove('shown');
      card.classList.remove('shake', 'done');
      for (const b of [yesBtn, noBtn]) {
        b.disabled = false;
        b.classList.remove('faded', 'right', 'pressed');
      }

      async function answer(says) {
        if (locked || !alive) return;
        const button = says ? yesBtn : noBtn;
        const other = says ? noBtn : yesBtn;
        if (says !== item.truth) {
          // Не то: мягко подсказываем, эта кнопка бледнеет, можно ответить ещё раз.
          wrong += 1;
          ctx.sound('hint');
          button.classList.add('faded');
          button.disabled = true;
          prompt.textContent = TEXT.retry;
          prompt.classList.add('retry');
          card.classList.remove('shake');
          void card.offsetWidth; // перезапуск анимации
          card.classList.add('shake');
          return;
        }
        locked = true;
        button.classList.add('right');
        other.classList.add('faded');
        other.disabled = true; // верная кнопка остаётся «живой» (не бледнеет), повторные нажатия гасит locked
        ctx.sound('correct');
        card.classList.add('done');
        prompt.classList.remove('retry');
        prompt.textContent = TEXT.praise[rnd(TEXT.praise.length)];
        pic.textContent = item.fact.pic;
        pic.className = 'rtf-pic hop';
        let ms = PRAISE_MS;
        if (!item.truth) {
          fix.textContent = `${TEXT.fixLabel} ${chooser.fixOf(item.fact)}`;
          fix.classList.add('shown');
          ms = FIX_MS;
        }
        await wait(ms);
        resolve(wrong === 0);
      }

      handlers.yes = () => answer(true);
      handlers.no = () => answer(false);
      ctx.speak(item.text, lang);
    });
  }
  const handlers = { yes: () => {}, no: () => {} };
  bindTap(yesBtn, () => handlers.yes());
  bindTap(noBtn, () => handlers.no());

  // ---------- серия ----------
  async function run() {
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const state = chooser.newState();
    const plan = planSeries(total, level, chooser.available());
    const reserved = chooser.reserve(level, plan, state);
    const mistakes = [];

    for (let i = 0; i < total; i++) {
      let picked = reserved.get(i) || chooser.pickFact(level, plan[i], state);
      if (!picked) {
        state.used.clear(); // банк меньше серии (такого быть не должно) — разрешаем повторы
        picked = chooser.pickFact(level, plan[i], state);
      }
      const { fact, neg } = picked;
      chooser.shown(state, fact);
      const item = { fact, truth: plan[i].truth, text: chooser.formOf(fact, plan[i].truth, neg) };
      const firstTry = await playTask(item);
      ctx.task({ ok: firstTry, level, key: `${ns}:${fact.id}` });
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
        mistakes.push(item);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные — ещё раз в конце: то же знание, но другая формулировка и обратный ответ. На результат не влияет.
    mistakes.forEach(() => addDot(true));
    for (let i = 0; i < mistakes.length; i++) {
      const { fact, truth } = mistakes[i];
      await playTask({ fact, truth: !truth, text: chooser.formOf(fact, !truth, false) });
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      level,
      total,
      mistakes: mistakes.map((m) => ({ key: m.fact.id, label: `${m.fact.pic} ${m.text}` })),
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
