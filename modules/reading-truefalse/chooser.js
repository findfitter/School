// Выбор следующего задания в «Правде или нет». Чистая логика без DOM — её же гоняет tools/truefalse-sim.mjs.
//
// Главное требование владельца: утверждения должны повторяться как можно реже (ребёнок быстро запоминает ответы).
// Поэтому выбирается не предложение, а ЗНАНИЕ (факт банка, у него несколько формулировок и верных, и неверных):
//   1. Факт, который ребёнок уже видел (учёт слов ядра: `<ns>:<id факта>`), не выпадает, пока в банке есть ещё не виденные.
//      Только когда виден весь банк, идут повторы: сначала «пора повторить», потом те, где были ошибки, потом остальные.
//   2. Правда это или нет — решается ПЕРЕД выбором факта и ровно пополам в серии (planSeries). У каждого факта есть обе формы,
//      так что одна и та же тема бывает и верной, и неверной. Слово «не» ставится независимо от ответа: LEVELS[].neg —
//      доля утверждений с «не», и среди верных и неверных их в серии поровну (иначе «есть „не“ — значит правда» стало бы подсказкой).
//   3. Темы чередуются: категория не идёт два раза подряд, предмет из последних заданий не повторяется,
//      а большие категории (числа, сравнения) не вытесняют маленькие (вес — корень из числа ещё не виденных фактов).
//   4. Формулировка выбирается случайно из нескольких: тот же факт при повторе выглядит иначе.

export const LEVELS = [
  { cats: ['ab', 'sd', 'has', 'prop', 'job'], neg: 0.12 },
  { cats: ['ab', 'sd', 'has', 'prop', 'job', 'eat', 'home', 'use', 'cnt', 'cmp'], neg: 0.2 },
  { cats: ['ab', 'sd', 'has', 'prop', 'job', 'eat', 'home', 'use', 'cnt', 'cmp', 'num', 'time'], neg: 0.28 },
];
export const CAT_WEIGHT = { ab: 1, sd: 0.7, has: 1, prop: 1, job: 1.2, eat: 0.9, home: 1, use: 0.8, cnt: 0.5, cmp: 1.2, num: 0.9, time: 0.8 };
const SAME_CAT_PENALTY = 0.3; // категория, которая только что была, выпадает втрое реже
const RECENT_SUBJECTS = 6; // сколько последних предметов не повторять в серии
const NEG_RESERVE = 4; // на одно «не» в серии должно быть хотя бы столько ещё не виденных подходящих фактов
const STATUS_RANK = { due: 1, learning: 2, known: 3 };

const rndInt = (rnd, n) => Math.floor(rnd() * n);
const pickOne = (rnd, list) => list[rndInt(rnd, list.length)];

// План серии: для каждого задания — правда это или нет и будет ли в нём «не». Правды ровно пополам, «не» — поровну
// среди верных и неверных, подряд не больше трёх одинаковых ответов. avail — сколько ещё не виденных фактов годится под
// «верно с „не“» и «неверно с „не“» (chooser.available): когда фактов с «не» мало, «не» убирается у обоих сразу,
// чтобы слово «не» не стало подсказкой.
export function planSeries(total, level, avail = { t: Infinity, f: Infinity }, rnd = Math.random) {
  const nT = Math.ceil(total / 2) - (total % 2 && rnd() < 0.5 ? 1 : 0);
  const nF = total - nT;
  const both = Math.min(nT, nF);
  const share = both * LEVELS[level].neg;
  const wanted = Math.min(both, Math.floor(share) + (rnd() < share - Math.floor(share) ? 1 : 0));
  const k = Math.min(wanted, Math.floor(avail.t / NEG_RESERVE), Math.floor(avail.f / NEG_RESERVE));
  const tasks = [];
  for (let i = 0; i < nT; i++) tasks.push({ truth: true, neg: i < k });
  for (let i = 0; i < nF; i++) tasks.push({ truth: false, neg: i < k });
  for (let attempt = 0; attempt < 30; attempt++) {
    for (let i = tasks.length - 1; i > 0; i--) {
      const j = rndInt(rnd, i + 1);
      [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
    }
    let run = 1;
    let ok = true;
    for (let i = 1; i < tasks.length; i++) {
      run = tasks[i].truth === tasks[i - 1].truth ? run + 1 : 1;
      if (run > 3) ok = false;
    }
    if (ok) break;
  }
  return tasks;
}

// bank — факты (bank.js); seen(id) — виден ли факт раньше; status(id) — 'new' | 'learning' | 'known' | 'due'
export function createChooser(bank, { seen, status, rnd = Math.random }) {
  const byCat = new Map();
  for (const f of bank) {
    if (!byCat.has(f.cat)) byCat.set(f.cat, []);
    byCat.get(f.cat).push(f);
  }
  const hasForm = (f, truth, neg) => (truth ? f.t : f.f).some((x) => x.n === neg);
  const allCats = [...byCat.keys()];

  // Выбрать факт для задания плана { truth, neg }. state: { used: Set<id>, recent: string[] (предметы), lastCat }
  function pickFact(level, { truth, neg: wantNeg }, state) {
    const catSets = [LEVELS[level].cats, allCats];
    const recent = new Set(state.recent);
    const fresh = (f) => !state.used.has(f.id) && !seen(f.id);
    const strict = (f) => fresh(f) && f.subj.every((s) => !recent.has(s));

    // 1) ещё не виденные факты. Форму («не» / без «не») не меняем: верных фактов с «не» меньше, чем неверных, и подмена формы
    //    сделала бы «не» подсказкой. Лучше показать уже виденный факт (п. 2), чем нарушить баланс.
    for (const cats of catSets) {
      for (const accept of [strict, fresh]) {
        const groups = [];
        for (const cat of cats) {
          const list = (byCat.get(cat) || []).filter((f) => accept(f) && hasForm(f, truth, wantNeg));
          if (list.length) groups.push({ cat, list });
        }
        if (groups.length) return { fact: weighted(groups, state.lastCat), neg: wantNeg };
      }
    }
    // 2) виден весь банк: сначала «пора повторить», потом непрочные, потом остальные
    let best = null;
    for (const cats of catSets) {
      for (const neg of [wantNeg, !wantNeg]) {
        const groups = [];
        let rank = Infinity;
        for (const cat of cats) {
          for (const f of byCat.get(cat) || []) {
            if (state.used.has(f.id) || !hasForm(f, truth, neg)) continue;
            const r = STATUS_RANK[status(f.id)] ?? 2;
            if (r < rank) rank = r;
          }
        }
        for (const cat of cats) {
          const list = (byCat.get(cat) || []).filter((f) => !state.used.has(f.id) && hasForm(f, truth, neg) && (STATUS_RANK[status(f.id)] ?? 2) === rank);
          if (list.length) groups.push({ cat, list });
        }
        if (groups.length && (!best || rank < best.rank)) best = { rank, groups, neg };
      }
    }
    if (best) return { fact: weighted(best.groups, state.lastCat), neg: best.neg };
    return null;
  }

  function weighted(groups, lastCat) {
    const weights = groups.map((g) => (CAT_WEIGHT[g.cat] ?? 1) * Math.sqrt(g.list.length) * (g.cat === lastCat ? SAME_CAT_PENALTY : 1));
    let roll = rnd() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < groups.length; i++) {
      roll -= weights[i];
      if (roll < 0) return pickOne(rnd, groups[i].list);
    }
    return pickOne(rnd, groups[groups.length - 1].list);
  }

  // Формулировка: из подходящих по «не» (если такие есть), иначе любая.
  function formOf(fact, truth, neg) {
    const list = truth ? fact.t : fact.f;
    const styled = list.filter((x) => x.n === neg);
    return pickOne(rnd, styled.length ? styled : list).t;
  }

  // «Как правильно» к неверному утверждению: сначала подсказка факта, иначе верная формулировка.
  function fixOf(fact) {
    if (fact.fix.length) return pickOne(rnd, fact.fix);
    return pickOne(rnd, fact.t).t;
  }

  // Сколько фактов годится под «верно с „не“» (t) и «неверно с „не“» (f): среди не виденных, а если весь банк виден — среди всех.
  function available() {
    let pool = bank.filter((f) => !seen(f.id));
    if (!pool.length) pool = bank;
    return { t: pool.filter((f) => hasForm(f, true, true)).length, f: pool.filter((f) => hasForm(f, false, true)).length };
  }

  // Факты под задания с «не» берём в начале серии, пока их не растащили задания без «не» (верных фактов с «не» меньше,
  // чем неверных). Парами: если для одного из пары факта нет, «не» убирается у обоих, и баланс не нарушается.
  // Возвращает Map: номер задания → { fact, neg }; plan при необходимости правится (neg → false).
  function reserve(level, plan, state) {
    const picks = new Map();
    const idx = (truth) => plan.map((t, i) => (t.neg && t.truth === truth ? i : -1)).filter((i) => i >= 0);
    const fs = idx(false);
    const ts = idx(true);
    for (let j = 0; j < Math.min(fs.length, ts.length); j++) {
      const pf = pickFact(level, plan[fs[j]], state);
      if (!pf || !pf.neg) {
        plan[fs[j]].neg = false;
        plan[ts[j]].neg = false;
        continue;
      }
      state.used.add(pf.fact.id);
      const pt = pickFact(level, plan[ts[j]], state);
      if (!pt || !pt.neg) {
        state.used.delete(pf.fact.id);
        plan[fs[j]].neg = false;
        plan[ts[j]].neg = false;
        continue;
      }
      state.used.add(pt.fact.id);
      picks.set(fs[j], pf);
      picks.set(ts[j], pt);
    }
    // лишние «не» без пары (не должно быть: у верных и неверных их поровну)
    for (const i of [...fs, ...ts]) if (plan[i].neg && !picks.has(i)) plan[i].neg = false;
    return picks;
  }

  return {
    pickFact,
    available,
    reserve,
    formOf,
    fixOf,
    newState: () => ({ used: new Set(), recent: [], lastCat: null }),
    // факт показан: запомнить предметы и категорию
    shown(state, fact) {
      state.used.add(fact.id);
      state.lastCat = fact.cat;
      state.recent.push(...fact.subj);
      while (state.recent.length > RECENT_SUBJECTS) state.recent.shift();
    },
  };
}
