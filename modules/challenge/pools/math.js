// Сложные задачи по математике: короткая история из 3–4 предложений и вопрос в два действия.
// Числа и герои подставляются кодом, числа не больше 20. rng — генератор случайных чисел [0, 1)
// (с зерном: после выхода из задания она остаётся той же).

const NAMES = [
  { name: 'Маша', gen: 'Маши', dat: 'Маше', f: true },
  { name: 'Аня', gen: 'Ани', dat: 'Ане', f: true },
  { name: 'Лена', gen: 'Лены', dat: 'Лене', f: true },
  { name: 'Миша', gen: 'Миши', dat: 'Мише', f: false },
  { name: 'Петя', gen: 'Пети', dat: 'Пете', f: false },
  { name: 'Ваня', gen: 'Вани', dat: 'Ване', f: false },
];

// [один, два–четыре, много]
const THINGS = [
  ['яблоко', 'яблока', 'яблок'],
  ['конфета', 'конфеты', 'конфет'],
  ['шарик', 'шарика', 'шариков'],
  ['наклейка', 'наклейки', 'наклеек'],
  ['карандаш', 'карандаша', 'карандашей'],
  ['машинка', 'машинки', 'машинок'],
];
const COINS = ['монета', 'монеты', 'монет'];
const YEARS = ['год', 'года', 'лет'];
const PAGES = ['страница', 'страницы', 'страниц'];
const STEPS = ['ступенька', 'ступеньки', 'ступенек'];

const plural = (n, forms) => {
  const last = n % 10;
  const tens = n % 100;
  if (tens >= 11 && tens <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
};
const withNumber = (n, forms) => `${n} ${plural(n, forms)}`;

export function makeMathTask(rng) {
  const int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const who = pick(NAMES);
  const thing = pick(THINGS);
  const verb = (female, male) => (who.f ? female : male);

  const templates = [
    // получил, отдал, снова получил
    () => {
      const a = int(8, 14);
      const b = int(2, 6);
      const c = int(2, 6);
      return {
        sentences: [
          `У ${who.gen} было ${withNumber(a, thing)}.`,
          `${verb('Она отдала', 'Он отдал')} ${withNumber(b, thing)} другу.`,
          `Потом ${who.name} ${verb('получила', 'получил')} в подарок ещё ${withNumber(c, thing)}.`,
        ],
        question: `Сколько ${thing[2]} стало у ${who.gen}?`,
        answer: a - b + c,
        wrong: [a + b + c, a - b, a + c],
        clue: 1,
      };
    },
    // две коробки, во второй на сколько-то меньше
    () => {
      const a = int(6, 10);
      const d = int(1, 4);
      return {
        sentences: [
          `В первой коробке лежит ${withNumber(a, thing)}.`,
          `Во второй коробке на ${withNumber(d, thing)} меньше, чем в первой.`,
          'Третья коробка пустая.',
        ],
        question: `Сколько ${thing[2]} в двух коробках вместе?`,
        answer: a + (a - d),
        wrong: [a - d, a + d, 2 * a],
        clue: 1,
      };
    },
    // покупка двух вещей и сдача
    () => {
      const p1 = int(5, 9);
      const p2 = int(2, 6);
      const m = int(Math.max(p1 + p2 + 2, 16), 20);
      return {
        sentences: [
          `Тетрадь стоит ${withNumber(p1, COINS)}.`,
          `Ручка стоит ${withNumber(p2, COINS)}.`,
          `У ${who.gen} ${withNumber(m, COINS)}.`,
        ],
        question: `Сколько монет останется после покупки тетради и ручки?`,
        answer: m - p1 - p2,
        wrong: [m - p1, p1 + p2, m - p1 + p2],
        clue: 2,
      };
    },
    // возраст
    () => {
      const a = int(5, 8);
      const d = int(2, 5);
      const k = int(2, 4);
      return {
        sentences: [
          `Сейчас ${who.dat} ${withNumber(a, YEARS)}.`,
          `Старшему брату на ${withNumber(d, YEARS)} больше.`,
          `Через ${withNumber(k, YEARS)} они вместе пойдут на праздник.`,
        ],
        question: `Сколько лет будет брату через ${withNumber(k, YEARS)}?`,
        answer: a + d + k,
        wrong: [a + d, a + k, a + d - k],
        clue: 1,
      };
    },
    // книга и страницы
    () => {
      const b = int(5, 8);
      const c = int(4, 7);
      return {
        sentences: [
          'В книге двадцать страниц.',
          `В понедельник ${who.name} ${verb('прочитала', 'прочитал')} ${withNumber(b, PAGES)}.`,
          `Во вторник ${verb('она прочитала', 'он прочитал')} ${withNumber(c, PAGES)}.`,
        ],
        question: 'Сколько страниц осталось прочитать?',
        answer: 20 - b - c,
        wrong: [20 - b, b + c, 20 - c],
        clue: 0,
      };
    },
    // лестница вверх и вниз
    () => {
      const b = int(8, 15);
      const c = int(2, 6);
      return {
        sentences: [
          'На лестнице двадцать ступенек.',
          `${who.name} ${verb('поднялась', 'поднялся')} на ${withNumber(b, STEPS)}.`,
          `Потом ${verb('она спустилась', 'он спустился')} на ${withNumber(c, STEPS)}.`,
        ],
        question: `На какой ступеньке теперь стоит ${who.name}?`,
        answer: b - c,
        wrong: [b + c, b, b - c + 1],
        clue: 2,
      };
    },
  ];

  const t = pick(templates)();
  // Верный ответ и три неверных (по типичным ошибкам и «рядом»), без повторов и отрицательных чисел.
  const set = [t.answer];
  for (const w of [...t.wrong, t.answer + 1, t.answer - 1, t.answer + 2, t.answer - 2]) {
    if (set.length < 4 && w >= 0 && !set.includes(w)) set.push(w);
  }
  return {
    id: `math-${t.answer}-${t.sentences.length}`,
    sentences: t.sentences,
    question: t.question,
    options: set.map((n) => ({ n })),
    answer: 0, // верный первый; порядок перемешивается в index.js
    clue: t.clue,
    hintKey: 'hintMath',
  };
}
