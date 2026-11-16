// Комикс «Аглая и гусь Гордей»: печать истории, проверки, список нужных картинок.
//   node tools/comic-print.mjs            — история читаемым текстом (для вычитки)
//   node tools/comic-print.mjs --check    — проверки (код выхода 1 при ошибках)
//   node tools/comic-print.mjs --assets   — какие позы, фоны, предметы и большие кадры нужны на самом деле
//   node tools/comic-print.mjs --missing  — чего из нужных картинок ещё нет в art-data.js
// Данные: modules/comic-aglaya/story.js
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { STORY, HEROES, POSES, PROPS, BACKGROUNDS, SPLASHES } =
  await import(pathToFileURL(join(ROOT, 'modules/comic-aglaya/story.js')).href);

const args = new Set(process.argv.slice(2));
const MAX_WORDS = 10; // в облачке; в рамке рассказчика — 12
const MAX_WORDS_BOX = 12;
const TASKS_PER_CHAPTER = [8, 10];
const KIND = { say: '—', shout: '!', think: '~', whisper: '…', box: '[]' };

const words = (s) => s.replace(/___/g, 'х').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, ' ').trim();
const panelsOf = (ch) => ch.pages.flatMap((pg) => pg.panels);

// ── печать ──
if (!args.has('--check') && !args.has('--assets') && !args.has('--missing')) {
  const out = [`# ${STORY.title}`];
  for (const ch of STORY.chapters) {
    out.push('', `## Глава ${ch.id}. ${ch.title}`);
    ch.pages.forEach((pg, pi) => {
      out.push('', `### Страница ${pi + 1}`);
      pg.panels.forEach((pn, i) => {
        const cast = pn.cast.map((x) => `${HEROES[x.who].name}:${x.pose}@${x.at}`).join(', ');
        const place = pn.splash ? `большой кадр «${pn.splash}»` : `фон «${pn.bg}»`;
        out.push(`${i + 1}) ${place}${cast && !pn.splash ? ` · ${cast}` : ''}${pn.props.length ? ` · предметы: ${pn.props.map((x) => x[0]).join(', ')}` : ''}`);
        for (const b of pn.bubbles) out.push(`   ${KIND[b.kind]} ${b.who ? HEROES[b.who].name + ': ' : ''}${b.text}`);
        const fx = pn.fx.map((f) => (typeof f === 'string' ? f : `«${f.sfx}»`)).join(' ');
        if (fx) out.push(`   эффекты: ${fx}`);
        const t = pn.task;
        if (t) {
          const b = pn.bubbles[t.bubble];
          const desc = {
            ask: () => `${t.ask} → «${t.right}» (ложные: ${t.decoys?.join(' | ')})`,
            tf: () => `правда или нет: «${t.text}» → ${t.truth ? 'правда' : 'неправда'}${t.fix ? ' (так правильно: ' + t.fix + ')' : ''}`,
            who: () => `кто сказал «${b?.text}»? → ${HEROES[b?.who]?.name} (ложные: ${t.decoys?.map((d) => HEROES[d].name).join(', ')})`,
            pick: () => `выбрать фразу → «${b?.text}» (ложные: ${t.decoys?.join(' | ')})`,
            fill: () => `вставить «${t.word}» (ложные: ${t.decoys?.join(', ')})`,
            next: () => `${t.ask} → «${t.right}» (ложные: ${t.decoys?.join(' | ')})`,
            order: () => `порядок: ${t.lines?.join(' → ')}`,
          }[t.type]();
          out.push(`   ЗАДАНИЕ ${t.type}: ${desc}`);
        }
      });
    });
  }
  console.log(out.join('\n'));
  process.exit(0);
}

// ── проверки ──
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const seen = new Map(); // нормализованный текст → где встречался

function remember(text, where) {
  const k = norm(text);
  if (seen.has(k)) err(where, `повтор текста «${text}» (уже в ${seen.get(k)})`);
  else seen.set(k, where);
}

for (const ch of STORY.chapters) {
  const tasks = [];
  ch.pages.forEach((pg, pi) => {
    if (![3, 4].includes(pg.panels.length)) err(`гл.${ch.id} стр.${pi + 1}`, `кадров ${pg.panels.length}, нужно 3–4`);
    pg.panels.forEach((pn, i) => {
      const where = `гл.${ch.id} стр.${pi + 1} кадр ${i + 1}`;
      if (pn.splash) { if (!SPLASHES[pn.splash]) err(where, `нет большого кадра «${pn.splash}»`); }
      else if (!BACKGROUNDS[pn.bg]) err(where, `нет фона «${pn.bg}»`);
      if (pn.splash && !BACKGROUNDS[pn.bg]) err(where, `у большого кадра нужен запасной фон «${pn.bg}»`);
      for (const x of pn.cast) {
        if (!HEROES[x.who]) err(where, `нет героя «${x.who}»`);
        else if (!POSES[x.who].includes(x.pose)) err(where, `нет позы ${x.who}:${x.pose}`);
        if (!['l', 'c', 'r'].includes(x.at)) err(where, `at «${x.at}»`);
      }
      for (const [id] of pn.props) if (!PROPS.includes(id)) err(where, `нет предмета «${id}»`);
      pn.bubbles.forEach((b, bi) => {
        const n = words(b.text);
        const lim = b.kind === 'box' ? MAX_WORDS_BOX : MAX_WORDS;
        if (n > lim) err(where, `в облачке ${bi} слов ${n} > ${lim}: «${b.text}»`);
        if (b.who && !pn.cast.some((x) => x.who === b.who)) err(where, `говорит ${b.who}, а его нет в кадре`);
        if (b.kind !== 'box' && !b.who) err(where, `облачко ${bi} без автора`);
        remember(b.text, where);
      });
      const t = pn.task;
      if (!t) return;
      tasks.push(t);
      const b = pn.bubbles[t.bubble];
      const needB = ['who', 'pick', 'fill'].includes(t.type);
      if (needB && !b) { err(where, `задание ${t.type}: нет облачка ${t.bubble}`); return; }
      const dec = t.decoys || [];
      if (t.type === 'ask') {
        if (dec.length !== 2) err(where, 'ask: нужно 2 ложных ответа');
        [t.ask, t.right, ...dec].forEach((x) => remember(x, where));
        [t.right, ...dec].forEach((x) => { if (words(x) > MAX_WORDS) err(where, `ask: ответ длиннее ${MAX_WORDS} слов: «${x}»`); });
      }
      if (t.type === 'tf') {
        remember(t.text, where);
        if (words(t.text) > MAX_WORDS) err(where, `tf: утверждение длиннее ${MAX_WORDS} слов`);
        if (typeof t.truth !== 'boolean') err(where, 'tf: truth должно быть true/false');
        if (!t.truth && !t.fix) err(where, 'tf: у неверного утверждения нужно «как правильно» (fix)');
        if (t.fix) remember(t.fix, where);
      }
      if (t.type === 'who') {
        if (!b.who) err(where, 'who: у облачка нет автора');
        if (dec.length < 1 || dec.length > 3 || dec.includes(b.who) || !dec.every((d) => HEROES[d])) err(where, 'who: ложные герои заданы неверно');
        if (b.kind === 'box') err(where, 'who: облачко рассказчика');
      }
      if (t.type === 'pick') {
        if (dec.length !== 2) err(where, 'pick: нужно 2 ложные фразы');
        dec.forEach((d) => { if (words(d) > MAX_WORDS) err(where, `pick: ложная фраза длиннее ${MAX_WORDS} слов`); remember(d, where); });
      }
      if (t.type === 'fill') {
        if ((b.text.match(/___/g) || []).length !== 1) err(where, 'fill: в облачке должен быть один «___»');
        if (dec.length !== 2) err(where, 'fill: нужно 2 ложных слова');
        if (new Set([t.word, ...dec]).size !== 3) err(where, 'fill: слова должны быть разными');
      }
      if (t.type !== 'fill' && b && b.text.includes('___')) err(where, 'пропуск «___» без задания fill');
      if (t.type === 'next') {
        if (dec.length !== 2) err(where, 'next: нужно 2 ложных ответа');
        [t.ask, t.right, ...dec].forEach((s) => remember(s, where));
        if (words(t.right) > MAX_WORDS) err(where, 'next: правильный ответ длиннее лимита');
      }
      if (t.type === 'order') {
        if (t.lines.length !== 3) err(where, 'order: нужно 3 строки');
        t.lines.forEach((s) => remember(s, where));
      }
    });
  });
  if (tasks.length < TASKS_PER_CHAPTER[0] || tasks.length > TASKS_PER_CHAPTER[1]) err(`гл.${ch.id}`, `заданий ${tasks.length}, нужно ${TASKS_PER_CHAPTER.join('–')}`);
  if (!tasks.some((t) => t.type === 'order')) err(`гл.${ch.id}`, 'нет задания order');
  if (ch.id === STORY.chapters.at(-1).id) { /* последняя глава может не иметь продолжения */ }
}

const totalTasks = STORY.chapters.reduce((s, ch) => s + panelsOf(ch).filter((pn) => pn.task).length, 0);
const totalPanels = STORY.chapters.reduce((s, ch) => s + panelsOf(ch).length, 0);

if (args.has('--check')) {
  if (errors.length) { console.error(errors.map((e) => '  ✗ ' + e).join('\n')); console.error(`Ошибок: ${errors.length}`); process.exit(1); }
  console.log(`комикс «${STORY.title}»: ${STORY.chapters.length} глав, ${totalPanels} кадров, ${totalTasks} заданий, ${seen.size} разных текстов — без повторов, всё в рамках`);
}

// ── ресурсы ──
if (args.has('--assets')) {
  const poses = {}; const bgs = {}; const props = {}; const splashes = {}; const spots = {};
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
  for (const ch of STORY.chapters) for (const pn of panelsOf(ch)) {
    if (pn.splash) inc(splashes, pn.splash); else inc(bgs, pn.bg);
    for (const x of pn.cast) if (!pn.splash) inc(poses, `${x.who}:${x.pose}`);
    for (const [id] of pn.props) inc(props, id);
  }
  const sorted = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(', ');
  console.log('# Нужные картинки\n');
  for (const h of Object.keys(HEROES)) {
    const used = Object.keys(poses).filter((k) => k.startsWith(h + ':')).map((k) => k.slice(h.length + 1));
    const unused = POSES[h].filter((p) => !used.includes(p));
    console.log(`${HEROES[h].name} (${h}): нужно поз ${used.length} из ${POSES[h].length}: ${sorted(Object.fromEntries(Object.entries(poses).filter(([k]) => k.startsWith(h + ':')).map(([k, v]) => [k.slice(h.length + 1), v])))}`);
    if (unused.length) console.log(`   не используются (не рисовать): ${unused.join(', ')}`);
  }
  console.log(`\nПредметы: ${sorted(props)}; не используются: ${PROPS.filter((x) => !props[x]).join(', ') || '—'}`);
  console.log(`Фоны (${Object.keys(bgs).length}): ${sorted(bgs)}`);
  console.log(`Большие кадры (${Object.keys(splashes).length}): ${sorted(splashes)}`);
  console.log(`\nВсего: ${STORY.chapters.length} глав, ${totalPanels} кадров, ${totalTasks} заданий`);
}

// ── чего не хватает ──
if (args.has('--missing')) {
  const { ART_DATA } = await import(pathToFileURL(join(ROOT, 'modules/comic-aglaya/art-data.js')).href);
  const need = { 'фоны': new Set(), 'позы': new Set(), 'предметы': new Set(), 'большие кадры': new Set() };
  for (const ch of STORY.chapters) for (const pn of panelsOf(ch)) {
    if (pn.splash) { if (!ART_DATA.splash[pn.splash]) need['большие кадры'].add(pn.splash); continue; }
    if (!ART_DATA.bg[pn.bg]) need['фоны'].add(pn.bg);
    for (const x of pn.cast) if (!ART_DATA.hero[x.who]?.[x.pose]) need['позы'].add(`${x.who}:${x.pose}`);
    for (const [id] of pn.props) if (!ART_DATA.prop[id]) need['предметы'].add(id);
  }
  let any = false;
  for (const [k, set] of Object.entries(need)) if (set.size) { any = true; console.log(`не хватает — ${k}: ${[...set].join(', ')}`); }
  if (!any) console.log('все нужные картинки на месте');
}
