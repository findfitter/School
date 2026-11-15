// «Правда или нет» (ru и de): проверка банка утверждений и симуляция повторов.
// Запуск: node tools/truefalse-sim.mjs [серий, по умолчанию 400]
// analyze(bank, lang) — проверки банка (их же зовёт tools/check.mjs); simulate(bank, …) — прогон серий «ребёнка»
// через настоящие chooser.js и учёт слов ядра (core/storage.js, localStorage подменён на память).
// Цель владельца: утверждения повторяются очень редко, ребёнок не должен выучивать ответы.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..').split('\\').join('/');
const url = (p) => pathToFileURL(`${ROOT}/${p}`).href;

export const BANKS = [
  { id: 'reading-truefalse', lang: 'ru', ns: 'rtf' },
  { id: 'reading-truefalse-de', lang: 'de', ns: 'dtf' },
];
export const MIN_FACTS = 1500; // разных «знаний» в банке (у каждого несколько формулировок, верных и неверных)
export const MIN_COMBO = 8; // в категории с «не» каждого из четырёх сочетаний (верно/неверно × с «не»/без) — не меньше стольки фактов
export const MAX_STATEMENT = 66; // знаков в утверждении (иначе не помещается в две строки)
export const MAX_WORD = 18; // букв в слове
export const MAX_LEN_GAP = 0.5; // верные и неверные формулировки по длине (в словах) отличаются в среднем не больше

const wordsOf = (t) => t.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);

// ---------- проверки банка ----------
export async function analyze(bank, lang, K) {
  const problems = [];
  const notes = [];
  const bad = (text) => problems.push(text);
  const texts = new Map(); // текст → { truth, id }
  const ids = new Set();
  let statements = 0;
  let lenT = 0;
  let lenF = 0;
  let nT = 0;
  let nF = 0;
  const catLen = {};
  const letters = lang === 'ru' ? /^[А-ЯЁ]/ : /^[A-ZÄÖÜ]/;

  for (const f of bank) {
    if (ids.has(f.id)) bad(`факт «${f.id}» повторяется`);
    ids.add(f.id);
    if (!f.t.length || !f.f.length) bad(`у «${f.id}» нет верных или неверных формулировок`);
    if (!f.pic) bad(`у «${f.id}» нет картинки`);
    for (const [truth, list] of [[true, f.t], [false, f.f]]) {
      for (const x of list) {
        statements += 1;
        const w = wordsOf(x.t);
        const prev = texts.get(x.t);
        if (prev) bad(prev.truth === truth ? `утверждение «${x.t}» стоит в банке дважды («${prev.id}» и «${f.id}»)` : `«${x.t}» верно в «${prev.id}» и неверно в «${f.id}»`);
        texts.set(x.t, { truth, id: f.id });
        if (!letters.test(x.t) || !x.t.endsWith('.')) bad(`«${x.t}» (${f.id}): должно начинаться с большой буквы и кончаться точкой`);
        if (x.t.length > MAX_STATEMENT) bad(`«${x.t}» (${f.id}): ${x.t.length} знаков, больше ${MAX_STATEMENT}`);
        if (w.some((word) => [...word].length > MAX_WORD)) bad(`«${x.t}» (${f.id}): слово длиннее ${MAX_WORD} букв`);
        if (/\s{2,}|\s[.,]/.test(x.t)) bad(`«${x.t}» (${f.id}): лишний пробел`);
        // метка «не»: ru — слово «не», de — nicht/kein
        const hasNot = lang === 'ru' ? /(^|\s)(не|нет)(\s|$)/i.test(x.t) : /\b(nicht|kein\w*)\b/i.test(x.t);
        if (x.n !== hasNot && !(f.cat === 'num' || f.cat === 'cmp')) bad(`«${x.t}» (${f.id}): метка «не» (${x.n}) не совпадает с текстом`);
        const wc = w.length;
        if (truth) { lenT += wc; nT += 1; } else { lenF += wc; nF += 1; }
        const c = (catLen[f.cat] ||= { t: 0, f: 0, nt: 0, nf: 0 });
        if (truth) { c.t += wc; c.nt += 1; } else { c.f += wc; c.nf += 1; }
      }
    }
    for (const x of f.fix) if (!texts.has(x) && !bank.some((b) => b.t.some((y) => y.t === x))) bad(`«как правильно» «${x}» (${f.id}) не найдено среди верных утверждений`);
  }
  if (bank.length < MIN_FACTS) bad(`в банке ${bank.length} фактов — нужно не меньше ${MIN_FACTS}`);

  // средняя длина верных и неверных — чтобы ответ нельзя было угадать по длине
  const gap = lenT / nT - lenF / nF;
  if (Math.abs(gap) > MAX_LEN_GAP) bad(`верные и неверные формулировки отличаются по длине на ${gap.toFixed(2)} слова (допустимо ${MAX_LEN_GAP})`);
  for (const [cat, c] of Object.entries(catLen)) {
    const g = c.t / c.nt - c.f / c.nf;
    if (Math.abs(g) > 1.2) bad(`категория ${cat}: верные и неверные отличаются по длине на ${g.toFixed(2)} слова`);
  }

  // пулы: в категориях, где бывает «не», должно хватать фактов под каждое сочетание
  const byCat = {};
  for (const f of bank) (byCat[f.cat] ||= []).push(f);
  const pools = {};
  for (const [cat, list] of Object.entries(byCat)) {
    const capable = list.some((f) => [...f.t, ...f.f].some((x) => x.n));
    if (!capable) continue;
    const count = (truth, neg) => list.filter((f) => (truth ? f.t : f.f).some((x) => x.n === neg)).length;
    const row = { 'верно': count(true, false), 'верно, с «не»': count(true, true), 'неверно': count(false, false), 'неверно, с «не»': count(false, true) };
    pools[cat] = row;
    for (const [name, n] of Object.entries(row)) if (n < MIN_COMBO) bad(`категория ${cat}: утверждений «${name}» только ${n} — меньше ${MIN_COMBO} (ответ угадывается по форме)`);
  }

  notes.push(`${bank.length} фактов (знаний), ${statements} формулировок (${nT} верных, ${nF} неверных), длина верных ${(lenT / nT).toFixed(2)} / неверных ${(lenF / nF).toFixed(2)} слова`);
  notes.push(`по категориям: ${Object.entries(byCat).map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
  void K;
  return { problems, notes, pools };
}

// ---------- симуляция ----------
// Ребёнок: отвечает верно с первой попытки с вероятностью `accuracy`; ошибочные в конце серии повторяются (на учёт не влияют).
export async function simulate(bank, { ns, series = 400, total = 10, accuracy = 0.85, startLevel = 0 } = {}) {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  globalThis.window = globalThis.window || { addEventListener() {} };
  const storage = await import(`${url('core/storage.js')}?sim=${Math.random()}`);
  const { createChooser, planSeries, LEVELS } = await import(url('modules/reading-truefalse/chooser.js'));
  const chooser = createChooser(bank, { seen: (id) => storage.wordInfo(`${ns}:${id}`).n > 0, status: (id) => storage.wordInfo(`${ns}:${id}`).status });
  const windows = [];
  const stat = { windows, tasks: 0, trueCount: 0, negT: 0, negF: 0, nT: 0, nF: 0, repeatFacts: 0, repeatTexts: 0, firstRepeatSeries: null, firstRepeatTextSeries: null, perCat: {}, levelSeries: [0, 0, 0], replays: 0 };
  const seenFacts = new Map(); // id → в какой серии впервые
  const seenTexts = new Set();
  let level = startLevel;
  let clean = 0;
  for (let s = 1; s <= series; s++) {
    const state = chooser.newState();
    const plan = planSeries(total, level, chooser.available());
    const reserved = chooser.reserve(level, plan, state);
    stat.levelSeries[level] += 1;
    const wrongs = [];
    for (let i = 0; i < total; i++) {
      let picked = reserved.get(i) || chooser.pickFact(level, plan[i], state);
      if (!picked) { state.used.clear(); picked = chooser.pickFact(level, plan[i], state); }
      const { fact, neg } = picked;
      chooser.shown(state, fact);
      const truth = plan[i].truth;
      if (plan[i].neg) stat[truth ? 'planNegT' : 'planNegF'] = (stat[truth ? 'planNegT' : 'planNegF'] || 0) + 1;
      if (plan[i].neg !== neg) stat.planMiss = (stat.planMiss || 0) + 1;
      const text = chooser.formOf(fact, truth, neg);
      stat.tasks += 1;
      if (truth) stat.trueCount += 1;
      const isNeg = [...fact.t, ...fact.f].find((x) => x.t === text)?.n;
      if (truth) { stat.nT += 1; if (isNeg) stat.negT += 1; } else { stat.nF += 1; if (isNeg) stat.negF += 1; }
      stat.perCat[fact.cat] = (stat.perCat[fact.cat] || 0) + 1;
      if (seenFacts.has(fact.id)) {
        stat.repeatFacts += 1;
        if (stat.firstRepeatSeries === null) stat.firstRepeatSeries = s;
      } else seenFacts.set(fact.id, s);
      if (seenTexts.has(text)) {
        stat.repeatTexts += 1;
        if (stat.firstRepeatTextSeries === null) stat.firstRepeatTextSeries = s;
      }
      seenTexts.add(text);
      const ok = Math.random() < accuracy;
      storage.recordWord(`${ns}:${fact.id}`, ok);
      if (ok) {
        clean += 1;
        if (clean >= 3 && level < LEVELS.length - 1) { level += 1; clean = 0; }
      } else {
        wrongs.push(fact);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }
    stat.replays += wrongs.length;
    if (s % 25 === 0) { windows.push({ upTo: s, negT: stat.negT - (windows.at(-1)?.cumT ?? 0), negF: stat.negF - (windows.at(-1)?.cumF ?? 0), cumT: stat.negT, cumF: stat.negF }); }
  }
  stat.distinctFacts = seenFacts.size;
  stat.distinctTexts = seenTexts.size;
  return stat;
}

export async function loadBank(bank) {
  const mod = await import(url(`modules/${bank.id}/data.js`));
  return mod.BANK;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const series = Number(process.argv[2]) || 400;
  const K = await import(url('modules/reading-truefalse/knowledge.js'));
  for (const b of BANKS) {
    const bank = await loadBank(b);
    const { problems, notes, pools } = await analyze(bank, b.lang, K);
    console.log(`\n== ${b.id} (${b.lang}) ==`);
    for (const n of notes) console.log(n);
    console.log('пулы (фактов с такой формулировкой):');
    for (const [cat, row] of Object.entries(pools)) console.log(`  ${cat.padEnd(5)}`, Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('; '));
    console.log(problems.length ? `ПРОБЛЕМЫ (${problems.length}):\n  ${problems.slice(0, 30).join('\n  ')}` : 'проблем в банке нет');
    const total = 10;
    const st = await simulate(bank, { ns: b.ns, series, total });
    console.log(`симуляция: ${series} серий по ${total} (${st.tasks} заданий), верно с первой попытки 85%`);
    console.log(`  разных фактов показано: ${st.distinctFacts} из ${bank.length}; разных формулировок: ${st.distinctTexts}`);
    console.log(`  первый повтор факта в серии: ${st.firstRepeatSeries ?? 'не было'}; повторов факта всего: ${st.repeatFacts} (${((st.repeatFacts / st.tasks) * 100).toFixed(1)}%)`);
    console.log(`  первый повтор точной формулировки: ${st.firstRepeatTextSeries ?? 'не было'}; повторов формулировки: ${st.repeatTexts}`);
    console.log(`  правда: ${((st.trueCount / st.tasks) * 100).toFixed(1)}%; «не» среди верных ${((st.negT / st.nT) * 100).toFixed(1)}%, среди неверных ${((st.negF / st.nF) * 100).toFixed(1)}%`);
    console.log(`  «не» по окнам по 25 серий (верные/неверные, штук): ${st.windows.map((w) => `${w.upTo}: ${w.negT}/${w.negF}`).join('  ')}`);
    console.log(`  серий по уровням: ${st.levelSeries.join(' / ')}; повторов ошибок в конце серий: ${st.replays}`);
    console.log(`  по категориям: ${Object.entries(st.perCat).map(([k, v]) => `${k} ${((v / st.tasks) * 100).toFixed(0)}%`).join(', ')}`);
  }
}
