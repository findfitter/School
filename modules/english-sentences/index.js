// Hello! Слушаем предложения: звучит простое английское предложение («The cat drinks milk.», голос Sonia),
// нужно выбрать картинку: кто это и что делает. Предложения — sentences.json (текст, перевод, две картинки).
// Типы: do — «The cat sleeps», act — «The cat drinks milk», place — «The cat is on the sofa»,
// feel — «The boy is happy». Уровни: 0 — короткие (do, feel), 1 — act, 2 — place, 3 — всё вместе.
// На нижних уровнях лишние картинки совсем другие, на верхних — отличаются только героем или действием.
// После ошибки уровень падает, после двух верных подряд растёт. Ошибочные предложения повторяются в конце серии.

import { TEXT } from './texts.js';

const LEVELS = [
  { kinds: ['do', 'feel'], count: 3, near: false },
  { kinds: ['act'], count: 3, near: false },
  { kinds: ['place'], count: 4, near: true },
  { kinds: ['do', 'act', 'place', 'feel'], count: 4, near: true },
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

export async function start(ctx) {
  const { sentences } = await fetch(new URL('./sentences.json', import.meta.url)).then((r) => r.json());
  const byKey = new Map(sentences.map((s) => [s.en, s]));
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

  // ---------- разметка ----------
  const root = el('div', 'es');
  const dotsBox = el('div', 'es-dots');
  const top = el('div', 'es-top');
  top.append(dotsBox);
  let current = null;
  const speaker = button('es-speaker', '🔊', () => current && ctx.speak(current.en, 'en'));
  speaker.setAttribute('aria-label', TEXT.repeatLabel);
  const prompt = el('div', 'es-prompt', TEXT.prompt);
  const cards = el('div', 'es-cards');
  const caption = el('div', 'es-caption'); // сюда после верного ответа выводится предложение
  root.append(top, speaker, prompt, cards, caption);
  ctx.container.append(root);

  const dots = [];
  const addDot = (again) => {
    const dot = el('span', again ? 'es-dot again' : 'es-dot');
    dotsBox.append(dot);
    dots.push(dot);
  };
  for (let i = 0; i < total; i++) addDot(false);

  // ---------- задания ----------
  function makeTask(level, used) {
    const kind = pick(LEVELS[level].kinds);
    const pool = sentences.filter((s) => s.kind === kind);
    const fresh = pool.filter((s) => !used.has(s.en));
    return pick(fresh.length ? fresh : pool);
  }

  // Верная картинка + лишние из того же типа. На верхних уровнях одна лишняя делит с верной героя,
  // другая — вторую картинку (действие, место…), остальные совсем другие.
  function makeOptions(task, level) {
    const { count, near } = LEVELS[level];
    const [a, b] = task.scene;
    const same = shuffle(sentences.filter((s) => s.kind === task.kind && s.en !== task.en));
    const chosen = [];
    const take = (list) => {
      const found = list.find((s) => !chosen.includes(s));
      if (found && chosen.length < count - 1) chosen.push(found);
    };
    if (near) {
      take(same.filter((s) => s.scene[0] === a && s.scene[1] !== b));
      take(same.filter((s) => s.scene[1] === b && s.scene[0] !== a));
    }
    // совсем другие: и герой, и вторая картинка не совпадают с верными
    for (const s of same.filter((x) => x.scene[0] !== a && x.scene[1] !== b)) take([s]);
    // запас, если в типе мало вариантов
    for (const s of same) take([s]);
    return shuffle([task, ...chosen]);
  }

  // Возвращает true, если ребёнок выбрал верную картинку с первой попытки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      let wrong = 0;
      let locked = false;
      const say = () => ctx.speak(task.en, 'en');
      caption.classList.remove('show');
      caption.replaceChildren(el('div', 'es-caption-en', task.en), el('div', 'es-caption-ru', showTranslation ? task.ru : ''));
      cards.replaceChildren();

      const buttons = new Map();
      for (const option of makeOptions(task, level)) {
        const card = button('es-card', '', () => choose(option, card));
        card.append(el('div', 'es-scene', option.scene[0]), el('div', 'es-scene es-scene-2', option.scene[1]));
        buttons.set(option.en, card);
        cards.append(card);
      }

      async function choose(option, card) {
        if (locked || !alive) return;
        if (option.en !== task.en) {
          wrong += 1;
          card.disabled = true;
          card.classList.add('faded');
          ctx.sound('hint');
          if (wrong >= WRONG_BEFORE_POINTING) buttons.get(task.en).classList.add('point');
          say();
          return;
        }
        locked = true;
        card.classList.add('right');
        caption.classList.add('show');
        ctx.sound('correct');
        await say();
        await wait(1000);
        resolve(wrong === 0);
      }

      say();
    });
  }

  // Трудные предложения из прошлых серий — в случайных местах серии.
  function planHardTasks() {
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
    const tasks = ctx.hard.map((key) => byKey.get(key)).filter(Boolean);
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
      used.add(task.en);
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
        mistakes.set(task.en, task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Предложения, в которых ошиблись, — ещё раз в конце. На результат не влияют.
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
      mistakes: again.map((s) => ({ key: s.en, label: `${s.scene.join('')} ${s.en}` })),
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
