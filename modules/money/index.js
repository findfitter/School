// Деньги в евро, только настоящие номиналы: монеты 1 и 2 €, банкноты 5, 10, 20, 50 и 100 €. Виды заданий (k в ключе):
//   count  — сколько всего денег (монеты и банкноты лежат на экране);
//   pay    — заплати ровно N € (монеты и банкноты ставятся касанием или перетаскиванием в кошелёк);
//   change — у тебя столько-то, вещь стоит столько-то, сколько сдачи;
//   basket — сколько стоят вместе 2–3 вещи;
//   shop   — у тебя столько-то, ты купил 2–3 вещи, сколько сдачи;
//   budget — у тебя столько-то, выбери две вещи: чтобы хватило (x = 0) или чтобы потратить ровно всё (x = 1).
// Уровни: 0 — сумма до 10 (монеты 1 и 2 €, банкнота 5 €); 1 — до 20 (с банкнотой 10 €); 2 — плюс «заплати»;
// 3 — «заплати» и «сдача»; 4–6 — суммы кратны десяти (банкноты 10, 20, 50 и 100 €): «сколько всего», «заплати», «сдача»;
// 7–9 — суммы с единицами (21–99 €: 37 = 20 + 10 + 5 + 2): «сколько всего», «заплати», «сдача» с 50 и 100 €;
// 10–12 — покупки: «сколько вместе», «выбери вещи», «сдача с покупки».
// С уровня INPUT_FROM_LEVEL ответ-число вводится цифрами (клавиатура), ниже — выбор из трёх.
// Центы пока не используются: суммы только в целых евро.
// После ошибки уровень падает, после трёх верных подряд растёт. Ошибочные задания повторяются в конце серии.

import { TEXT } from './texts.js';
import { createKeypad } from '../addition-10/keypad.js';

const COINS = [1, 2]; // монеты 1 и 2 €
const NOTES = [5, 10, 20, 50, 100]; // банкноты
const ALL_VALUES = [...COINS, ...NOTES];
const SMALL = [1, 2, 5, 10]; // чем набираются небольшие суммы (до 20 €)
const ITEMS = ['🍬', '🍦', '🎈', '🍎', '🚗', '🧸', '📖', '🍪'];
// big — суммы кратны десяти (банкноты 10, 20, 50 и 100 €); mixed — суммы с единицами (21–99 €).
// Виды: count, pay, change; basket2 / basket3 — сумма двух / трёх цен; shop — сдача с покупки; budget / exact — «выбери две вещи».
// Новые уровни дописываются в конец: номер уровня хранится в прогрессе.
const LEVELS = [
  { kinds: ['count'] },
  { kinds: ['count'] },
  { kinds: ['count', 'pay'] },
  { kinds: ['pay', 'change'] },
  { kinds: ['count'], big: true },
  { kinds: ['count', 'pay'], big: true },
  { kinds: ['pay', 'change'], big: true },
  { kinds: ['count'], mixed: true },
  { kinds: ['count', 'pay'], mixed: true },
  { kinds: ['pay', 'change'], mixed: true },
  { kinds: ['basket2', 'budget'] },
  { kinds: ['basket3', 'shop'] },
  { kinds: ['shop', 'exact', 'pay'], mixed: true },
];
const MIXED_POOL = [50, 20, 20, 10, 10, 10, 5, 5, 2, 2, 1, 1]; // чем набираются суммы с единицами
const INPUT_FROM_LEVEL = 5; // с этого уровня число-ответ вводится цифрами, ниже — выбор из трёх
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const MAX_ANSWER = 200;
const DRAG_THRESHOLD = 14; // px, после которого касание считается перетаскиванием

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rnd(0, list.length - 1)];
const sum = (list) => list.reduce((a, b) => a + b, 0);
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, k) => values[k]);

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Задание хранится числами, поэтому ключ можно сохранить и восстановить.
const itemIdx = (n) => shuffle(ITEMS.map((_, i) => i)).slice(0, n); // n разных вещей

// «Выбери две вещи»: четыре разные цены. budget — подходящих пар от 2 до 4 из 6; exact — ровно одна пара даёт g.
function makeBudget(exact) {
  const g = exact ? rnd(12, 30) : rnd(10, 20);
  const hi = exact ? Math.min(g - 1, 24) : 12;
  let ps = [];
  for (let attempt = 0; attempt < 500; attempt++) {
    ps = shuffle(Array.from({ length: hi }, (_, i) => i + 1)).slice(0, 4);
    let fit = 0;
    for (let a = 0; a < 4; a++) {
      for (let b = a + 1; b < 4; b++) {
        if (exact ? ps[a] + ps[b] === g : ps[a] + ps[b] <= g) fit += 1;
      }
    }
    if (exact ? fit === 1 : fit >= 2 && fit <= 4) break;
  }
  return { k: 'budget', g, ps, es: itemIdx(4), x: exact ? 1 : 0 };
}

function makeTask(level, used) {
  let task;
  for (let attempt = 0; attempt < 50; attempt++) {
    const kind = pick(LEVELS[level].kinds);
    const big = Boolean(LEVELS[level].big);
    const mixed = Boolean(LEVELS[level].mixed);
    if (kind === 'basket2' || kind === 'basket3') {
      const n = kind === 'basket2' ? 2 : 3;
      let ps;
      do {
        ps = Array.from({ length: n }, () => (n === 2 ? rnd(1, 9) : rnd(2, 18)));
      } while (n === 2 ? sum(ps) < 6 || sum(ps) > 20 : sum(ps) < 15 || sum(ps) > 50);
      task = { k: 'basket', ps, es: itemIdx(n) };
    } else if (kind === 'shop') {
      const given = pick([20, 50]);
      const n = rnd(2, 3);
      const [lo, hi] = given === 20 ? [2, 9] : [3, 18];
      let ps;
      do {
        ps = Array.from({ length: n }, () => rnd(lo, hi));
      } while (sum(ps) >= given || sum(ps) < given / 4);
      task = { k: 'shop', g: given, ps, es: itemIdx(n) };
    } else if (kind === 'budget' || kind === 'exact') {
      task = makeBudget(kind === 'exact');
    } else if (kind === 'count' && mixed) {
      let coins;
      do {
        coins = Array.from({ length: rnd(3, 5) }, () => pick(MIXED_POOL));
      } while (
        sum(coins) < 21 ||
        sum(coins) > 99 ||
        coins.filter((v) => v >= 50).length > 1 ||
        !coins.some((v) => v >= 10) ||
        !coins.some((v) => v < 10)
      );
      task = { k: 'count', c: coins.sort((a, b) => b - a) };
    } else if (kind === 'pay' && mixed) {
      let price;
      do {
        price = rnd(21, 99);
      } while (price % 10 === 0);
      task = { k: 'pay', p: price, e: rnd(0, ITEMS.length - 1) };
    } else if (kind === 'change' && mixed) {
      const given = pick([50, 100]);
      let price;
      do {
        price = rnd(11, given - 1);
      } while (price % 10 === 0);
      task = { k: 'change', g: given, p: price, e: rnd(0, ITEMS.length - 1) };
    } else if (kind === 'count' && big) {
      let coins;
      do {
        coins = Array.from({ length: rnd(2, 4) }, () => pick([10, 10, 20, 20, 50, 100]));
      } while (sum(coins) < 30 || sum(coins) > 150 || coins.filter((v) => v >= 50).length > 2 || !coins.some((v) => v >= 50));
      task = { k: 'count', c: coins.sort((a, b) => b - a) };
    } else if (kind === 'pay' && big) {
      task = { k: 'pay', p: 10 * rnd(3, 15), e: rnd(0, ITEMS.length - 1) };
    } else if (kind === 'change' && big) {
      const given = pick([50, 100, 100]);
      task = { k: 'change', g: given, p: 10 * rnd(1, given / 10 - 1), e: rnd(0, ITEMS.length - 1) };
    } else if (kind === 'count') {
      const pool = level === 0 ? [1, 2, 5] : SMALL;
      const [lo, hi] = level === 0 ? [4, 10] : [8, 20];
      let coins;
      do {
        coins = Array.from({ length: rnd(2, level === 0 ? 5 : 6) }, () => pick(pool));
      } while (sum(coins) < lo || sum(coins) > hi || (level > 0 && !coins.includes(10) && Math.random() < 0.6));
      task = { k: 'count', c: coins.sort((a, b) => b - a) };
    } else if (kind === 'pay') {
      task = { k: 'pay', p: rnd(3, level === 2 ? 15 : 20), e: rnd(0, ITEMS.length - 1) };
    } else {
      const given = pick([5, 10, 10, 20]);
      task = { k: 'change', g: given, p: rnd(1, given - 1), e: rnd(0, ITEMS.length - 1) };
    }
    if (!used.has(JSON.stringify(task))) break;
  }
  return task;
}

const answerOf = (task) => {
  if (task.k === 'count') return sum(task.c);
  if (task.k === 'change') return task.g - task.p;
  if (task.k === 'basket') return sum(task.ps);
  if (task.k === 'shop') return task.g - sum(task.ps);
  return task.p ?? task.g; // pay — цена; budget — сколько денег
};

function labelOf(task) {
  if (task.k === 'count') return `${TEXT.labels.count} ${task.c.join(' + ')}`;
  if (task.k === 'pay') return `${TEXT.labels.pay} ${task.p} €`;
  if (task.k === 'basket') return `${TEXT.labels.basket}: ${task.ps.join(' + ')}`;
  if (task.k === 'shop') return `${TEXT.labels.shop}: ${task.g} − (${task.ps.join(' + ')})`;
  if (task.k === 'budget') return `${TEXT.labels.budget}: ${task.g} € (${task.ps.join(', ')})`;
  return `${TEXT.labels.change}: ${task.g} − ${task.p}`;
}

// Деньги, которыми «дали» сумму (20 € = одна банкнота, 7 € = 5 + 2).
function coinsFor(amount) {
  const coins = [];
  let left = amount;
  for (const value of [100, 50, 20, 10, 5, 2, 1]) {
    while (left >= value && coins.length < 4) {
      coins.push(value);
      left -= value;
    }
  }
  return coins;
}

// Варианты ответа: верный и два соседних (у больших сумм — соседние десятки).
function makeChoices(answer) {
  const step = answer > 20 && answer % 10 === 0 ? 10 : 1;
  const options = new Set([answer]);
  for (const v of shuffle([-2, -1, 1, 2].map((d) => answer + d * step))) {
    if (v >= 0 && v <= MAX_ANSWER && options.size < 3) options.add(v);
  }
  return shuffle([...options]);
}

function planHardTasks(hardKeys, total) {
  const planned = new Map();
  const positions = shuffle(Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1));
  const tasks = hardKeys
    .map((key) => {
      try {
        const t = JSON.parse(key);
        const prices = (list, n, max) => Array.isArray(list) && list.length === n && list.every((p) => Number.isInteger(p) && p >= 1 && p <= max);
        const things = (list, n) => Array.isArray(list) && list.length === n && list.every((e) => ITEMS[e]);
        if (t.k === 'count' && Array.isArray(t.c) && t.c.length && t.c.length <= 6 && t.c.every((c) => ALL_VALUES.includes(c))) return t;
        if (t.k === 'pay' && Number.isInteger(t.p) && t.p >= 1 && t.p <= 150 && (t.p <= 99 || t.p % 10 === 0) && ITEMS[t.e]) return t;
        if (t.k === 'change' && [5, 10, 20, 50, 100].includes(t.g) && t.p >= 1 && t.p < t.g && ITEMS[t.e]) return t;
        if (t.k === 'basket' && Array.isArray(t.ps) && [2, 3].includes(t.ps.length) && prices(t.ps, t.ps.length, 30) && things(t.es, t.ps.length)) return t;
        if (t.k === 'shop' && [20, 50].includes(t.g) && Array.isArray(t.ps) && [2, 3].includes(t.ps.length) && prices(t.ps, t.ps.length, 30) && sum(t.ps) < t.g && things(t.es, t.ps.length)) return t;
        if (t.k === 'budget' && Number.isInteger(t.g) && t.g >= 1 && t.g <= 40 && prices(t.ps, 4, 30) && things(t.es, 4) && [0, 1].includes(t.x)) return t;
      } catch {
        // неразборчивый ключ пропускаем
      }
      return null;
    })
    .filter(Boolean);
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

// Монета (круглая) или банкнота (прямоугольная, с числом в углах и знаком €).
const coinEl = (value, tag = 'div') => {
  if (NOTES.includes(value)) {
    const note = el(tag, `mn-note n${value}`);
    note.dataset.value = String(value);
    note.append(el('span', 'mn-note-corner a', String(value)), el('span', 'mn-note-main', String(value)), el('span', 'mn-note-sign', '€'), el('span', 'mn-note-corner b', String(value)));
    return note;
  }
  const coin = el(tag, `mn-coin c${value}`, String(value));
  coin.dataset.value = String(value);
  return coin;
};

// Чем платить в задании «заплати»: до 20 € — монеты 1, 2 и банкноты 5, 10; круглые суммы больше 20 — банкноты 10, 20, 50, 100;
// суммы с единицами (21–99 €, не кратные десяти) — всё от 1 до 50 €.
const trayFor = (task) => (task.p <= 20 ? SMALL : task.p % 10 === 0 ? [10, 20, 50, 100] : [1, 2, 5, 10, 20, 50]);

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
  const root = el('div', 'money');
  const dotsBox = el('div', 'mn-dots');
  const repeatBtn = el('button', 'mn-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice; // без озвучки «повторить» не нужна
  const top = el('div', 'mn-top');
  top.append(dotsBox, repeatBtn);

  const prompt = el('div', 'mn-prompt');
  const stage = el('div', 'mn-stage');
  const bottom = el('div', 'mn-bottom');
  root.append(top, prompt, stage, bottom);
  ctx.container.append(root);

  const dots = [];
  for (let i = 0; i < total; i++) addDot(false);

  function addDot(again) {
    const dot = el('span', again ? 'mn-dot again' : 'mn-dot');
    dotsBox.append(dot);
    dots.push(dot);
  }

  // Ответ-число выбором из трёх (ниже INPUT_FROM_LEVEL).
  function numberAnswers(answer, onChoose) {
    for (const value of makeChoices(answer)) {
      const button = el('button', 'mn-answer', `${value}`);
      button.type = 'button';
      onTap(button, () => onChoose(value, button));
      bottom.append(button);
    }
  }

  // Строка «пример = ?»: подсказка-пример (прячется до первой ошибки) и место для ответа, которое заполняет клавиатура.
  function makeEq(pre) {
    const box = el('div', 'mn-eq');
    const slot = el('span', 'mn-slot', '?');
    box.append(el('span', 'mn-eq-pre', pre), slot, el('span', 'mn-eq-eur', ' €'));
    return { box, slot };
  }

  // Вещь с ценником.
  function itemEl(emoji, price, small) {
    const item = el('div', small ? 'mn-item small' : 'mn-item');
    item.append(el('span', 'mn-emoji', ITEMS[emoji]), el('span', 'mn-tag', `${price} €`));
    return item;
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок ответил верно с первой попытки.
  function playTask(task, level) {
    return new Promise((resolve) => {
      const answer = answerOf(task);
      const useKeypad = level >= INPUT_FROM_LEVEL;
      let wrong = 0;
      let locked = false;
      let slot = null; // место ответа (клавиатура и покупки)
      let pad = null;

      stage.replaceChildren();
      bottom.replaceChildren();
      stage.className = `mn-stage ${task.k}`;

      const finish = async (button) => {
        locked = true;
        button?.classList.add('right');
        if (slot) {
          slot.textContent = String(answer);
          slot.classList.add('ok');
        }
        ctx.sound('correct');
        await wait(1500);
        resolve(wrong === 0);
      };

      // Ключ озвучки по тексту задания (у «сколько вместе» текст всегда один).
      const speakKey =
        task.k === 'budget' ? `money-budget-${task.g}-${task.x}` : task.k === 'shop' ? `money-shop-${task.g}` : task.k === 'basket' ? 'money-basket' : `money-${task.k}-${answer}`;
      const sayTask = (text) => ctx.speak(text, 'ru', speakKey);

      // Ответ-число: клавиатура или три варианта. onHint — подсказка после ошибки.
      const askNumber = (onHint) => {
        const check = (value, button) => {
          if (locked || !alive) return;
          if (value !== answer) {
            wrong += 1;
            ctx.sound('hint');
            onHint();
            if (button) {
              button.disabled = true;
              button.classList.add('faded');
            } else if (slot) {
              pad.lock(true);
              slot.classList.add('kp-wobble');
              wait(450).then(() => {
                slot.classList.remove('kp-wobble');
                pad.clear();
                pad.lock(false);
              });
            }
            return;
          }
          finish(button);
        };
        if (useKeypad) {
          pad = createKeypad({
            digits: String(answer).length,
            onInput: (text) => {
              if (slot) slot.textContent = text || '?';
            },
            onComplete: (text) => check(Number(text), null),
          });
          bottom.append(pad.el);
        } else {
          numberAnswers(answer, check);
        }
      };

      if (task.k === 'count') {
        prompt.textContent = TEXT.countAsk;
        const row = el('div', task.c.length >= 4 ? 'mn-coins dense' : 'mn-coins');
        let running = 0;
        for (const value of task.c) {
          running += value;
          const holder = el('div', 'mn-holder');
          holder.append(coinEl(value), el('div', 'mn-running', String(running)));
          row.append(holder);
        }
        stage.append(row);
        if (useKeypad) {
          const eq = makeEq('');
          slot = eq.slot;
          stage.append(eq.box);
        }
        askNumber(() => stage.classList.add('show-running')); // подсказка: промежуточные суммы под монетами
        repeatBtn.onclick = () => sayTask(TEXT.countAsk);
        sayTask(TEXT.countAsk);
      } else if (task.k === 'change') {
        const text = fill(TEXT.changeAsk, { given: task.g, price: task.p });
        prompt.textContent = text;
        const given = el('div', 'mn-coins');
        for (const value of coinsFor(task.g)) given.append(coinEl(value));
        const item = itemEl(task.e, task.p);
        if (useKeypad) {
          const eq = makeEq(`${task.g} − ${task.p} = `);
          slot = eq.slot;
          stage.append(given, item, eq.box);
        } else {
          stage.append(given, item, el('div', 'mn-sub', `${task.g} − ${task.p} = ?`));
        }
        askNumber(() => stage.classList.add('show-sub')); // подсказка: пример на вычитание
        repeatBtn.onclick = () => sayTask(text);
        sayTask(text);
      } else if (task.k === 'basket' || task.k === 'shop') {
        const shop = task.k === 'shop';
        const text = shop ? fill(TEXT.shopAsk, { given: task.g }) : TEXT.basketAsk;
        prompt.textContent = text;
        const goods = el('div', 'mn-goods');
        task.ps.forEach((p, i) => goods.append(itemEl(task.es[i], p, true)));
        if (shop) {
          const given = el('div', 'mn-coins');
          for (const value of coinsFor(task.g)) given.append(coinEl(value));
          stage.append(given);
        }
        // Подсказка: сумма цен (для «сдачи» — сразу с результатом, остаётся вычесть).
        const eq = makeEq(shop ? `${task.ps.join(' + ')} = ${sum(task.ps)};  ${task.g} − ${sum(task.ps)} = ` : `${task.ps.join(' + ')} = `);
        slot = eq.slot;
        stage.append(goods, eq.box);
        askNumber(() => stage.classList.add('show-sub'));
        repeatBtn.onclick = () => sayTask(text);
        sayTask(text);
      } else if (task.k === 'budget') {
        const text = fill(task.x ? TEXT.budgetExactAsk : TEXT.budgetAsk, { given: task.g });
        prompt.textContent = text;
        const shelf = el('div', 'mn-shelf');
        const status = el('div', 'mn-paid');
        const chosen = []; // индексы выбранных вещей
        const cards = task.ps.map((p, i) => {
          const card = el('button', 'mn-card');
          card.type = 'button';
          card.append(el('span', 'mn-emoji', ITEMS[task.es[i]]), el('span', 'mn-tag', `${p} €`));
          shelf.append(card);
          return card;
        });
        const showStatus = (message) => {
          const now = chosen.reduce((a, i) => a + task.ps[i], 0);
          status.textContent = message || fill(TEXT.budgetSum, { sum: now, given: task.g });
        };
        showStatus();
        stage.append(shelf, status);

        const pickCard = (i) => {
          if (locked || !alive) return;
          const at = chosen.indexOf(i);
          if (at >= 0) {
            chosen.splice(at, 1);
            cards[i].classList.remove('sel');
            ctx.sound('tap');
            showStatus();
            return;
          }
          chosen.push(i);
          cards[i].classList.add('sel');
          ctx.sound('tap');
          showStatus();
          if (chosen.length < 2) return;
          const now = chosen.reduce((a, j) => a + task.ps[j], 0);
          if (task.x ? now === task.g : now <= task.g) {
            for (const j of chosen) cards[j].classList.add('right');
            status.classList.add('ok');
            finish(null);
            return;
          }
          // Не подошло: мягко говорим почему, убираем выбор и даём попробовать ещё раз.
          wrong += 1;
          locked = true;
          ctx.sound('hint');
          status.classList.add('over');
          showStatus(fill(now > task.g ? TEXT.budgetLack : TEXT.budgetLeft, { n: Math.abs(now - task.g) }));
          wait(1100).then(() => {
            if (!alive) return;
            chosen.length = 0;
            for (const card of cards) card.classList.remove('sel');
            status.classList.remove('over');
            showStatus();
            locked = false;
          });
        };
        cards.forEach((card, i) => onTap(card, () => pickCard(i)));
        repeatBtn.onclick = () => sayTask(text);
        sayTask(text);
      } else {
        const text = fill(TEXT.payAsk, { price: task.p });
        prompt.textContent = text;
        const item = itemEl(task.e, task.p);
        const wallet = el('div', 'mn-wallet');
        const paid = el('div', 'mn-paid');
        const placed = [];
        const updatePaid = () => {
          paid.textContent = fill(TEXT.paid, { sum: sum(placed) });
        };
        updatePaid();
        stage.append(item, wallet, paid);

        const trayValues = trayFor(task);
        const tray = el('div', trayValues.length > 4 ? 'mn-tray dense' : 'mn-tray');
        bottom.append(tray);

        const add = (value) => {
          if (locked || !alive) return;
          placed.push(value);
          const chip = coinEl(value, 'button');
          chip.type = 'button';
          chip.classList.add('small');
          // Монету в кошельке можно убрать касанием.
          onTap(chip, () => {
            if (locked) return;
            placed.splice(placed.indexOf(value), 1);
            chip.remove();
            updatePaid();
          });
          wallet.append(chip);
          ctx.sound('tap');
          updatePaid();
          const now = sum(placed);
          if (now === task.p) {
            wallet.classList.add('ok');
            finish(null);
          } else if (now > task.p) {
            // Больше, чем нужно: мягко очищаем кошелёк и даём попробовать ещё раз.
            wrong += 1;
            ctx.sound('hint');
            wallet.classList.add('over');
            wait(700).then(() => {
              placed.length = 0;
              wallet.replaceChildren();
              wallet.classList.remove('over');
              updatePaid();
            });
          }
        };

        for (const value of trayValues) {
          const coin = coinEl(value, 'button');
          coin.type = 'button';
          makeDraggable(coin, wallet, () => add(value));
          tray.append(coin);
        }
        repeatBtn.onclick = () => sayTask(text);
        sayTask(text);
      }
    });
  }

  // Монета ставится касанием или перетаскиванием в кошелёк.
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
        button.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
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
    let level = Math.min(ctx.level ?? 0, LEVELS.length - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const hardPlan = planHardTasks(ctx.hard, total);

    for (let i = 0; i < total; i++) {
      const task = hardPlan.get(i) || makeTask(level, used);
      used.add(JSON.stringify(task));
      const firstTry = await playTask(task, level);
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
        mistakes.set(JSON.stringify(task), task);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Ошибочные задания — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    again.forEach(() => addDot(true));
    for (let i = 0; i < again.length; i++) {
      await playTask(again[i], level);
      if (!alive) return;
      dots[total + i].classList.add('done');
    }

    ctx.finish({
      correct,
      level,
      total,
      mistakes: again.map((t) => ({ key: JSON.stringify(t), label: labelOf(t) })),
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
