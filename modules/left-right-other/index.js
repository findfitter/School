// Лево и право другого. Человек стоит лицом к ребёнку — и его правая рука там, где у ребёнка левая.
// Четыре типа заданий: «В какой руке предмет?» и «Покажи правую/левую руку» — когда человек стоит
// лицом к тебе (лево и право наоборот) и когда спиной (как у тебя). Уровни:
//   0 — только «в какой руке», лицом; 1 — добавляется «покажи руку»; 2 — человек стоит спиной;
//   3 — всё вместе. Задания генерируются кодом.
// Против угадывания (с двумя ответами шанс 50%) — ещё два вида, с 4 вариантами:
//   what — в обеих руках разные предметы, «Что у мамы в левой руке?» (ответ — картинка из четырёх);
//   find — на экране четверо, кто-то лицом, кто-то спиной; «У кого мяч в левой руке?» (нажать на человека). Мяч держат
//   двое — в левой руке и в правой, поэтому одного предмета для ответа мало. Уровни 4–6.
// Ошибка = мягкая подсказка словами и ещё одна попытка; после двух ошибок верный ответ подсвечивается.
// После ошибки уровень падает, после двух верных подряд растёт.
// Ошибочные типы заданий повторяются в конце серии (с новыми героями и предметами).

import { TEXT } from './texts.js';

const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const WRONG_BEFORE_POINTING = 2; // после стольких ошибок верный ответ подсвечивается

// Какие типы заданий бывают на каждом уровне (вес — как часто).
const LEVELS = [
  { 'hold-face': 1 },
  { 'hold-face': 1, 'hand-face': 2 },
  { 'hold-face': 1, 'hold-back': 2, 'hand-back': 2 },
  { 'hold-face': 1, 'hand-face': 1, 'hold-back': 1, 'hand-back': 1 },
  { 'what-face': 2, 'what-back': 1 },
  { 'what-face': 1, 'what-back': 1, find: 2 },
  { find: 3, 'what-face': 1, 'what-back': 1, 'hand-back': 1 },
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
// «У кого в руке?»: четверо разных людей, лицом и спиной вперемешку. Предмет, о котором спрашивают, у двоих: у одного — в левой
// руке, у другого — в правой. Верный — тот, у кого он в нужной руке (сторона на экране зависит от того, лицом человек или спиной).
function makeFindTask() {
  const heroes = shuffle(TEXT.heroes).slice(0, 4);
  const items = shuffle(TEXT.items);
  const wanted = items[0];
  const hand = pick(['left', 'right']);
  let facings;
  do {
    facings = Array.from({ length: 4 }, () => pick(['face', 'back']));
  } while (new Set(facings).size < 2);
  const people = [
    { item: wanted, heroHand: hand },
    { item: wanted, heroHand: opposite(hand) },
    { item: items[1], heroHand: pick(['left', 'right']) },
    { item: items[2], heroHand: pick(['left', 'right']) },
  ].map((p, i) => ({ ...p, hero: heroes[i], facing: facings[i] }));
  for (const p of people) p.screenSide = p.facing === 'face' ? opposite(p.heroHand) : p.heroHand;
  const order = shuffle(people);
  return { variant: 'find', kind: 'find', facing: 'mixed', people: order, answer: order.indexOf(people[0]), prompt: TEXT.findAsk(wanted, hand) };
}

function makeTask(variant) {
  if (variant === 'find') return makeFindTask();
  const [kind, facing] = variant.split('-'); // kind: hold | hand | what; facing: face | back
  const hero = pick(TEXT.heroes);
  const item = pick(TEXT.items);
  const side = pick(['left', 'right']); // для hold — где на экране предмет; для hand — какую руку просят
  const flip = facing === 'face';
  if (kind === 'what') {
    // В обеих руках разные предметы; спрашивают про левую или правую руку героя. Ответ — картинка из четырёх.
    const things = shuffle(TEXT.items).slice(0, 4);
    const held = { left: things[0], right: things[1] }; // по рукам героя
    const screenItems = flip ? { left: held.right, right: held.left } : held;
    const prompt = TEXT.whatAsk(hero, side);
    return {
      variant, kind, facing, hero, screenItems, choices: shuffle(things), answer: held[side].emoji,
      prompt: flip ? prompt : `${TEXT.backIntro(hero)} ${prompt}`,
    };
  }
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

// ---------- рисунки: человечки и рука (плоская акварель вместо больших эмодзи; фильтр wcS — общий, core/art/filters.js) ----------
const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';
function svg(markup, className) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const node = document.importNode(doc.documentElement, true);
  if (className) node.setAttribute('class', className);
  return node;
}

const SKIN = '#F2C9A5';
const SILHOUETTE = '#4A3A3A'; // спиной к тебе: тёмный силуэт
const WHITE_HAIR = '#E6E3E8';
// Внешность героев (ключ — texts.js heroes[].who): волосы, одежда, платье ли, причёска.
const LOOKS = {
  мальчик: { hair: '#7A4A2A', top: '#4372B8', bottom: '#4A5A8A', style: 'short' },
  девочка: { hair: '#C9623A', top: '#D9667F', dress: true, style: 'long' },
  мама: { hair: '#9A6B48', top: '#B8485F', dress: true, style: 'long' },
  папа: { hair: '#4A2E22', top: '#3A8D82', bottom: '#4A5A8A', style: 'short' },
  бабушка: { hair: WHITE_HAIR, top: '#6E5DB8', dress: true, style: 'bun' },
  дедушка: { hair: WHITE_HAIR, top: '#4372B8', bottom: '#4A5A8A', style: 'bald' },
};

// Человечек во весь рост: лицом (с лицом и руками по бокам) или спиной (тёмный силуэт).
function heroSvg(who, facing) {
  const look = LOOKS[who] || LOOKS.мальчик;
  const back = facing === 'back';
  const c = (color) => (back ? SILHOUETTE : color);
  const skin = c(SKIN);
  const hair = c(look.hair);
  const top = c(look.top);
  const bottom = c(look.bottom || look.top);
  const hairBehind = look.style === 'long' ? `<ellipse cx="60" cy="58" rx="35" ry="38" fill="${hair}"/>` : '';
  const hairTop = {
    short: `<path d="M30 50 C28 20 92 20 90 50 C84 36 36 36 30 50 Z" fill="${hair}"/>`,
    long: `<path d="M29 54 C26 20 94 20 91 54 C82 34 38 34 29 54 Z" fill="${hair}"/>`,
    bun: `<circle cx="60" cy="16" r="12" fill="${hair}"/><path d="M30 50 C28 20 92 20 90 50 C84 36 36 36 30 50 Z" fill="${hair}"/>`,
    bald: `<ellipse cx="31" cy="52" rx="7" ry="13" fill="${hair}"/><ellipse cx="89" cy="52" rx="7" ry="13" fill="${hair}"/>`,
  }[look.style];
  const legs = look.dress
    ? `<rect x="43" y="168" width="13" height="46" rx="6" fill="${skin}"/><rect x="64" y="168" width="13" height="46" rx="6" fill="${skin}"/>`
    : `<rect x="40" y="148" width="18" height="66" rx="8" fill="${bottom}"/><rect x="62" y="148" width="18" height="66" rx="8" fill="${bottom}"/>`;
  const shoes = `<ellipse cx="49" cy="217" rx="12" ry="6" fill="${c('#5A4636')}"/><ellipse cx="71" cy="217" rx="12" ry="6" fill="${c('#5A4636')}"/>`;
  const body = look.dress
    ? `<path d="M36 86 H84 L98 176 H22 Z" fill="${top}"/>`
    : `<rect x="32" y="84" width="56" height="74" rx="14" fill="${top}"/>`;
  const arm = (x) => `<rect x="${x}" y="88" width="16" height="46" rx="8" fill="${top}"/><rect x="${x + 1}" y="124" width="14" height="36" rx="7" fill="${skin}"/><circle cx="${x + 8}" cy="162" r="9" fill="${skin}"/>`;
  const face = back
    ? ''
    : `<circle cx="49" cy="52" r="3.4" fill="#3B2412"/><circle cx="71" cy="52" r="3.4" fill="#3B2412"/>
       <ellipse cx="42" cy="63" rx="6" ry="4" fill="#E58AA0" opacity="0.5"/><ellipse cx="78" cy="63" rx="6" ry="4" fill="#E58AA0" opacity="0.5"/>
       <path d="M50 64 Q60 73 70 64" stroke="#8A3A22" stroke-width="2.6" fill="none" stroke-linecap="round"/>
       ${who === 'дедушка' ? '<path d="M46 63 Q60 56 74 63 Q60 70 46 63 Z" fill="#E6E3E8"/><circle cx="49" cy="52" r="9" fill="none" stroke="#5A4636" stroke-width="2"/><circle cx="71" cy="52" r="9" fill="none" stroke="#5A4636" stroke-width="2"/>' : ''}`;
  return svg(`<svg ${SVG_NS} viewBox="0 0 120 230" aria-hidden="true"><g filter="url(#wcS)">
    ${hairBehind}${legs}${shoes}${body}${arm(10)}${arm(94)}
    <rect x="53" y="72" width="14" height="18" fill="${skin}"/>
    <circle cx="60" cy="50" r="30" fill="${look.style === 'long' || !back ? skin : hair}"/>
    ${back && look.style !== 'bald' ? `<circle cx="60" cy="50" r="30" fill="${hair}"/>` : ''}
    ${hairTop}${face}
  </g></svg>`, 'lo-person');
}

// Рука, на которую можно нажать («покажи руку»).
const handSvg = () => svg(`<svg ${SVG_NS} viewBox="0 0 64 84" aria-hidden="true"><g filter="url(#wcS)" fill="#E9B98F">
  <rect x="16" y="36" width="34" height="42" rx="15"/>
  <rect x="16" y="10" width="8" height="38" rx="4"/><rect x="26" y="3" width="8" height="44" rx="4"/>
  <rect x="36" y="7" width="8" height="42" rx="4"/><rect x="46" y="16" width="8" height="34" rx="4"/>
  <rect x="4" y="42" width="9" height="28" rx="4.5" transform="rotate(-38 8 56)"/>
</g></svg>`, 'lo-hand-art');

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
        if (task.kind === 'what') {
          node.append(el('span', 'lo-item', task.screenItems[side].emoji));
        } else if (task.kind === 'hold') {
          if (task.screenSide === side) node.append(el('span', 'lo-item', task.item.emoji));
        } else {
          const hand = el('button', 'lo-hand');
          hand.append(handSvg());
          hand.type = 'button';
          onTap(hand, () => choose(side, hand));
          options.set(side, hand);
          node.append(hand);
        }
        return node;
      };
      let figure; // подпрыгивает при верном ответе
      if (task.kind === 'find') {
        const crowd = el('div', 'lo-crowd');
        task.people.forEach((p, i) => {
          const button = el('button', 'lo-person-btn');
          button.type = 'button';
          const row = el('div', 'lo-scene small');
          const side = (name) => {
            const node = el('div', `lo-slot ${name}`);
            if (p.screenSide === name) node.append(el('span', 'lo-item', p.item.emoji));
            return node;
          };
          const fig = el('div', `lo-figure ${p.facing}`);
          fig.append(heroSvg(p.hero.who, p.facing));
          row.append(side('left'), fig, side('right'));
          button.append(row);
          if (i === task.answer) figure = fig;
          onTap(button, () => choose(i, button));
          options.set(i, button);
          crowd.append(button);
        });
        stage.append(crowd);
      } else {
        figure = el('div', `lo-figure ${task.facing}`);
        figure.append(heroSvg(task.hero.who, task.facing));
        const tag = el('div', 'lo-tag', `${TEXT.facingIcon[task.facing]} ${TEXT.facing[task.facing]}`);
        const middle = el('div', 'lo-middle');
        middle.append(figure, tag);
        const scene = el('div', 'lo-scene');
        scene.append(slot('left'), middle, slot('right'));
        stage.append(scene);
      }

      if (task.kind === 'what') {
        for (const thing of task.choices) {
          const button = el('button', 'lo-answer pic', thing.emoji);
          button.type = 'button';
          button.setAttribute('aria-label', thing.name);
          onTap(button, () => choose(thing.emoji, button));
          options.set(thing.emoji, button);
          answersBox.append(button);
        }
      } else if (task.kind === 'hold') {
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
        const text = task.kind === 'find' ? TEXT.hintScene : task.facing === 'face' ? TEXT.hintFace : TEXT.hintBack;
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
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
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
      ctx.task({ ok: firstTry, level });
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

    ctx.finish({ correct, total, mistakes: again, level });
  }

  run();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
