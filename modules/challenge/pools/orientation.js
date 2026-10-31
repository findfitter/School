// Сложные задания про право и лево: короткие истории, где нужно представить, кто где стоит (или куда полетела
// пчёлка), и ответить на вопрос. Строятся кодом; rng — генератор случайных чисел [0, 1) с зерном.

const ANIMALS = [
  { name: 'кот', gen: 'кота', emoji: '🐱' },
  { name: 'заяц', gen: 'зайца', emoji: '🐰' },
  { name: 'мышка', gen: 'мышки', emoji: '🐭' },
  { name: 'собака', gen: 'собаки', emoji: '🐶' },
  { name: 'лиса', gen: 'лисы', emoji: '🦊' },
  { name: 'медведь', gen: 'медведя', emoji: '🐻' },
  { name: 'лягушка', gen: 'лягушки', emoji: '🐸' },
];

const cap = (text) => text[0].toUpperCase() + text.slice(1);

// Четыре зверя сидят в ряд; про каждую соседнюю пару сказано, кто слева, а кто справа.
function makeRow(rng) {
  const int = (n) => Math.floor(rng() * n);
  const pool = [...ANIMALS];
  const row = [];
  while (row.length < 4) row.push(pool.splice(int(pool.length), 1)[0]); // слева направо
  const relations = [0, 1, 2].map((i) => {
    const a = row[i];
    const b = row[i + 1];
    return rng() < 0.5
      ? { text: `${cap(a.name)} сидит слева от ${b.gen}.`, pair: i }
      : { text: `${cap(b.name)} сидит справа от ${a.gen}.`, pair: i };
  });
  // перемешиваем порядок предложений
  for (let i = relations.length - 1; i > 0; i--) {
    const j = int(i + 1);
    [relations[i], relations[j]] = [relations[j], relations[i]];
  }
  const sentences = ['На скамейке в ряд сидят четыре зверя.', ...relations.map((r) => r.text)];

  // Вопрос: кто справа/слева от кого или кто сидит с краю.
  const kind = int(4);
  let question;
  let answer;
  let clue = null;
  if (kind === 0) {
    const i = int(3); // у кого есть сосед справа
    question = `Кто сидит справа от ${row[i].gen}?`;
    answer = row[i + 1];
  } else if (kind === 1) {
    const i = 1 + int(3); // у кого есть сосед слева
    question = `Кто сидит слева от ${row[i].gen}?`;
    answer = row[i - 1];
  } else if (kind === 2) {
    question = 'Кто сидит самым левым?';
    answer = row[0];
  } else {
    question = 'Кто сидит самым правым?';
    answer = row[3];
  }
  // Подсвечиваем предложение про самую крайнюю пару, если вопрос про край; иначе — без подсветки.
  if (kind >= 2) {
    const pair = kind === 2 ? 0 : 2;
    clue = 1 + relations.findIndex((r) => r.pair === pair);
  }
  const options = [answer, ...row.filter((a) => a !== answer)].map((a) => ({ t: cap(a.name), e: a.emoji }));
  return {
    id: `orient-row-${row.map((a) => a.emoji).join('')}-${kind}`,
    sentences,
    question,
    options,
    answer: 0,
    clue,
    hintKey: 'hintOrientation',
  };
}

// Пчёлка вылетает из улья и делает три шага; в конце она ровно слева, справа, над или под ульем.
function makeBee(rng) {
  const int = (n) => Math.floor(rng() * n);
  const MOVES = { налево: [-1, 0], направо: [1, 0], вверх: [0, 1], вниз: [0, -1] };
  const names = Object.keys(MOVES);
  let steps;
  let net;
  for (let attempt = 0; attempt < 200; attempt++) {
    steps = [0, 1, 2].map(() => names[int(4)]);
    net = steps.reduce((sum, s) => [sum[0] + MOVES[s][0], sum[1] + MOVES[s][1]], [0, 0]);
    if ((net[0] === 0) !== (net[1] === 0)) break; // не в улье и не по диагонали
  }
  const where = net[0] < 0 ? 'Слева от улья' : net[0] > 0 ? 'Справа от улья' : net[1] > 0 ? 'Над ульем' : 'Под ульем';
  const sentences = [
    'Пчёлка вылетела из улья.',
    `Сначала она полетела ${steps[0]}.`,
    `Потом — ${steps[1]}.`,
    `И наконец — ${steps[2]}.`,
  ];
  const options = [where, ...['Слева от улья', 'Справа от улья', 'Над ульем', 'Под ульем'].filter((o) => o !== where)].map((t) => ({ t }));
  return {
    id: `orient-bee-${steps.join('-')}`,
    sentences,
    question: 'Где пчёлка теперь?',
    options,
    answer: 0,
    clue: null,
    hintKey: 'hintOrientation',
  };
}

export function makeOrientationTask(rng) {
  return rng() < 0.6 ? makeRow(rng) : makeBee(rng);
}
