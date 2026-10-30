// Лево и право другого. Человек стоит лицом к ребёнку — и его правая рука там, где у ребёнка левая.
// Четыре типа заданий: «В какой руке предмет?» и «Покажи правую/левую руку» — когда человек стоит
// лицом к тебе (лево и право наоборот) и когда спиной (как у тебя). Уровни:
//   0 — только «в какой руке», лицом; 1 — добавляется «покажи руку»; 2 — человек стоит спиной;
//   3 — всё вместе. Задания генерируются кодом.
// Ошибка = мягкая подсказка словами и ещё одна попытка; после двух ошибок верный ответ подсвечивается.
// После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные типы заданий повторяются в конце серии (с новыми героями и предметами).

import { TEXT } from './texts.js';

const CLEAN_TO_LEVEL_UP = 2;
const WRONG_BEFORE_POINTING = 2; // после стольких ошибок верный ответ подсвечивается

// Какие типы заданий бывают на каждом уровне (вес — как часто).
const LEVELS = [
  { 'hold-face': 1 },
  { 'hold-face': 1, 'hand-face': 2 },
  { 'hold-face': 1, 'hold-back': 2, 'hand-back': 2 },
  { 'hold-face': 1, 'hand-face': 1, 'hold-back': 1, 'hand-back': 1 },
];

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const opposite = (side) => (side === 'left' ? 'right' : 'left');

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickVariant(weights, avoid) {
  const entries = Object.entries(weights).filter(([variant]) => variant !== avoid);
  if (!entries.length) return avoid;
  let r = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [variant, w] of entries) {
    r -= w;
    if (r < 0) return variant;
  }
  return entries[0][0];
}

// Задание: герой, предмет, сторона на экране (где предмет / какую руку просят) и верный ответ.
// Если человек стоит лицом к ребёнку, сторона относительно него — противоположная той, что на экране.
function makeTask(variant) {
  const [kind, facing] = variant.split('-'); // kind: hold | hand; facing: face | back
  const hero = pick(TEXT.heroes);
  const item = pick(TEXT.items);
  const side = pick(['left', 'right']); // для hold — где на экране предмет; для hand — какую руку просят
  const flip = facing === 'face';
  let answer;
  let prompt;
  if (kind === 'hold') {
    answer = flip ? opposite(side) : side; // «в левой» / «в правой» руке героя
    prompt = TEXT.holdAsk(hero, item);
  } else {
    answer = flip ? opposite(side) : side; // на какой стороне экрана нужная рука
    prompt = TEXT.handAsk(hero, side);
  }
  if (!flip) prompt = `${TEXT.backIntro(hero)} ${prompt}`;
  return { variant, kind, facing, hero, item, screenSide: side, answer, prompt };
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
  const root = el('div', 'leftother');
  const dotsBox = el('div', 'lo-dots');
  const repeatBtn = el('button', 'lo-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'lo-top');
  top.append(dotsBox, repeatBtn);

  const promptBox = el('div', 'lo-prompt');
  const hintBox = el('div', 'lo-hint'); // место под подсказку зарезервировано, чтобы экран не прыгал
  const stage = el('div', 'lo-stage');
  const answersBox = el('div', 'lo-answers');
  root.append(top, promptBox, hintBox, stage, answersBox);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'lo-dot again' : 'lo-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      const options = new Map(); // ответ ('left' | 'right') -> кнопка

      promptBox.textContent = task.prompt;
      hintBox.textContent = '';
      hintBox.classList.remove('show');
      stage.replaceChildren();
      answersBox.replaceChildren();

      // Сцена: слева — слот, в центре — человек (лицом или спиной) с подписью, справа — слот.
      const slot = (side) => {
        const node = el('div', `lo-slot ${side}`);
        if (task.kind === 'hold') {
          if (task.screenSide === side) node.append(el('span', 'lo-item', task.item.emoji));
        } else {
          const hand = el('button', 'lo-hand', '✋');
          hand.type = 'button';
          onTap(hand, () => choose(side, hand));
          options.set(side, hand);
          node.append(hand);
        }
        return node;
      };
      const figure = el('div', `lo-figure ${task.facing}`, task.hero.emoji);
      const tag = el('div', 'lo-tag', `${TEXT.facingIcon[task.facing]} ${TEXT.facing[task.facing]}`);
      const middle = el('div', 'lo-middle');
      middle.append(figure, tag);
      const scene = el('div', 'lo-scene');
      scene.append(slot('left'), middle, slot('right'));
      stage.append(scene);

      if (task.kind === 'hold') {
        for (const side of ['left', 'right']) {
          const button = el('button', 'lo-answer', TEXT.answers[side]);
          button.type = 'button';
          onTap(button, () => choose(side, button));
          options.set(side, button);
          answersBox.append(button);
        }
      }

      const sayTask = () => ctx.speak(task.prompt, 'ru');
      repeatBtn.onclick = () => sayTask();

      // Подсказка: словами, почему лево и право у человека не такие, как у тебя (или такие же).
      async function hint() {
        const text = task.facing === 'face' ? TEXT.hintFace : TEXT.hintBack;
        hintBox.textContent = text;
        hintBox.classList.add('show');
        await ctx.speak(text, 'ru');
      }

      async function choose(value, button) {
        if (locked || !alive) return;
        if (value !== task.answer) {
          wrong += 1;
          button.disabled = true;
          button.classList.add('faded');
          ctx.sound('hint');
          if (wrong >= WRONG_BEFORE_POINTING) options.get(task.answer).classList.add('point');
          hint();
          return;
        }
        locked = true;
        button.classList.add('right');
        figure.classList.add('hop');
        ctx.sound('correct');
        ctx.speak(pick(TEXT.praise), 'ru');
        await wait(1600);
        resolve(wrong === 0);
      }

      sayTask();
    });
  }

  // ---------- серия ----------
  async function run() {
    let level = 0;
    let clean = 0;
    let correct = 0;
    let previous = null;
    const mistakes = new Map();
    const hardPlan = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    for (const key of shuffle(ctx.hard.filter((k) => k in TEXT.labels)).slice(0, 2)) {
      if (positions.length) hardPlan.set(positions.pop(), key);
    }

    for (let i = 0; i < total; i++) {
      const variant = hardPlan.get(i) || pickVariant(LEVELS[level], previous);
      previous = variant;
      const firstTry = await playTask(makeTask(variant));
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
        mistakes.set(variant, { key: variant, label: TEXT.labels[variant] });
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные типы — ещё раз в конце, с новыми героями и предметами. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(makeTask(again[i].key));
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({ correct, total, mistakes: again });
  }

  run();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
