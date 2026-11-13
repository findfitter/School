// Проверка проекта одной командой:  node tools/check.mjs
// Ищет: синтаксические ошибки, битые импорты, расхождения манифестов и реестра, файлы, которых
// нет в офлайн-кэше (sw.js и поле files), опасные паттерны (innerHTML, eval), забытые таймеры.
// Ничего не меняет в проекте. Нужен только Node.js.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..').split('\\').join('/');
const problems = [];
const notes = [];
const add = (kind, where, text) => problems.push(`[${kind}] ${where}: ${text}`);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    if (name.startsWith('.') && statSync(join(dir, name)).isDirectory()) continue; // служебные папки (.claude, .art — worktree ветки art, .art-raw)
    if (dir === ROOT && name === 'design') continue; // эскизы дизайна — справочник, не часть приложения
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const all = walk(ROOT).map((p) => p.replace(/\\/g, '/'));
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');
const js = all.filter((p) => p.endsWith('.js'));
const css = all.filter((p) => p.endsWith('.css'));
const read = (p) => readFileSync(p, 'utf8');

// 1. Синтаксис
for (const f of js) {
  try { execFileSync('node', ['--check', f], { stdio: 'pipe' }); } catch (e) { add('СИНТАКСИС', rel(f), String(e.stderr).split('\n').slice(0, 3).join(' ')); }
}

// 2. Импорты и экспорты
const exportsOf = (f) => {
  const s = read(f); const names = new Set();
  for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/g)) names.add(m[1]);
  for (const m of s.matchAll(/export\s*\{([^}]+)\}/g)) m[1].split(',').forEach((n) => names.add(n.trim().split(/\s+as\s+/).pop()));
  return names;
};
for (const f of js) {
  const s = read(f);
  for (const m of s.matchAll(/import\s+(?:\*\s+as\s+\w+|\{([^}]+)\}|(\w+))\s+from\s+'([^']+)'/g)) {
    if (!m[3].startsWith('.')) continue;
    const target = resolve(dirname(f), m[3]).replace(/\\/g, '/');
    if (!existsSync(target)) { add('ИМПОРТ', rel(f), `нет файла ${m[3]}`); continue; }
    if (m[1]) {
      const have = exportsOf(target);
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0];
        if (name && !have.has(name)) add('ИМПОРТ', rel(f), `«${name}» не экспортируется из ${m[3]}`);
      }
    }
  }
  // 3. Неиспользуемые импортированные имена
  for (const m of s.matchAll(/import\s+\{([^}]+)\}\s+from/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop();
      if (!name) continue;
      const uses = (s.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
      if (uses < 2) notes.push(`неиспользуемый импорт «${name}» в ${rel(f)}`);
    }
  }
}

// 4. Опасные и подозрительные паттерны
const patterns = [
  [/\.innerHTML\s*=/, 'innerHTML (риск XSS)'],
  [/\beval\(|new Function\(/, 'eval/Function'],
  [/document\.write/, 'document.write'],
  [/\bconsole\.log\(/, 'console.log'],
  [/\bTODO\b|\bFIXME\b|\bXXX\b/, 'TODO/FIXME'],
  [/\bdebugger\b/, 'debugger'],
  // адрес пространства имён SVG (xmlns) — не обращение к сети
  [/https?:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org\/2000\/svg)/, 'внешний URL'],
  [/localStorage|sessionStorage/, 'прямое обращение к localStorage'],
];
for (const f of js) {
  const s = read(f);
  for (const [re, label] of patterns) {
    const hits = s.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => re.test(l) && !l.trim().startsWith('//'));
    if (!hits.length) continue;
    if (label.startsWith('прямое') && f.endsWith('core/storage.js')) continue;
    for (const [n, l] of hits) add('ПАТТЕРН', `${rel(f)}:${n}`, `${label}: ${l.trim().slice(0, 90)}`);
  }
}

// 5. Таймеры и слушатели без очистки в модулях
for (const f of js.filter((p) => p.includes('/modules/') && p.endsWith('index.js'))) {
  const s = read(f);
  if (/setInterval\(/.test(s) && !/clearInterval/.test(s)) add('ТАЙМЕР', rel(f), 'setInterval без clearInterval');
  if (/document\.addEventListener/.test(s) && !/removeEventListener/.test(s)) add('СЛУШАТЕЛЬ', rel(f), 'слушатель на document без удаления');
  if (/window\.addEventListener/.test(s) && !/removeEventListener/.test(s)) add('СЛУШАТЕЛЬ', rel(f), 'слушатель на window без удаления');
  if (!/return\s*\(\)\s*=>\s*\{/.test(s)) add('ОЧИСТКА', rel(f), 'модуль не возвращает функцию очистки');
}

// 6. Файлы ядра против sw.js
const sw = read(`${ROOT}/sw.js`);
const swList = [...sw.matchAll(/'((?:core|modules|icons)\/[^']+|index\.html|manifest\.webmanifest)'/g)].map((m) => m[1]);
const coreFiles = all.filter((p) => /\/core\/.*\.(js|css)$/.test(p)).map(rel);
for (const f of coreFiles) if (!swList.includes(f)) add('ОФЛАЙН', 'sw.js', `файла ядра нет в CORE_FILES: ${f}`);
for (const f of swList) if (!existsSync(`${ROOT}/${f}`)) add('ОФЛАЙН', 'sw.js', `в CORE_FILES несуществующий файл: ${f}`);

// 7. Модули: манифест, реестр, files, импорты, стили
const registry = JSON.parse(read(`${ROOT}/modules/registry.json`));
const moduleDirs = readdirSync(`${ROOT}/modules`).filter((n) => statSync(`${ROOT}/modules/${n}`).isDirectory());
for (const d of moduleDirs) if (!registry.includes(d)) add('РЕЕСТР', d, 'папка модуля не в registry.json');
const knownSubjects = ['math', 'orientation', 'russian', 'german', 'english'];
for (const id of registry) {
  const dir = `${ROOT}/modules/${id}`;
  if (!existsSync(`${dir}/manifest.json`)) { add('РЕЕСТР', id, 'нет manifest.json'); continue; }
  const m = JSON.parse(read(`${dir}/manifest.json`));
  if (m.id !== id) add('МАНИФЕСТ', id, `id «${m.id}» не совпадает с папкой`);
  for (const k of ['title', 'subject', 'icon', 'description', 'version']) if (!m[k]) add('МАНИФЕСТ', id, `нет поля ${k}`);
  if (m.glyph !== undefined && (typeof m.glyph !== 'string' || !m.glyph.trim() || [...m.glyph].length > 6)) add('МАНИФЕСТ', id, 'glyph — короткий знак (1–6 символов)');
  if (!m.challenge && !knownSubjects.includes(m.subject)) add('МАНИФЕСТ', id, `неизвестный раздел ${m.subject}`);
  if (m.challenge) for (const subject of Object.keys(m.challenge.subjects || {})) if (!knownSubjects.includes(subject)) add('МАНИФЕСТ', id, `сложное задание: неизвестный раздел ${subject}`);
  if (!existsSync(`${dir}/index.js`)) add('МАНИФЕСТ', id, 'нет index.js');
  const listed = new Set([...(m.styles || []), ...(m.files || [])].map((f) => resolve(dir, f).replace(/\\/g, '/')));
  for (const f of listed) if (!existsSync(f)) add('МАНИФЕСТ', id, `в манифесте нет файла на диске: ${rel(f)}`);
  for (const f of m.styles || []) if (!existsSync(`${dir}/${f}`)) add('МАНИФЕСТ', id, `нет стиля ${f}`);
  // все локальные импорты и fetch модуля должны быть перечислены в files (иначе не попадут в офлайн-кэш)
  const files = readdirSync(dir).filter((n) => n.endsWith('.js') || n.endsWith('.json')).filter((n) => n !== 'index.js' && n !== 'manifest.json');
  for (const n of files) if (!listed.has(`${dir}/${n}`)) add('ОФЛАЙН', id, `файл ${n} не перечислен в files манифеста`);
  // импорт из core/ запрещён контрактом
  if (/from\s+'\.\.\/\.\.\/core|from\s+'\.\.\/core/.test(read(`${dir}/index.js`))) add('КОНТРАКТ', id, 'модуль импортирует из core/');
  // аудио из манифеста
  for (const f of m.files || []) if (f.endsWith('.mp3') && !existsSync(resolve(dir, f))) add('АУДИО', id, `нет файла ${f}`);
}

// 7б. Английский словарь: повторы слов и картинок (иначе в тесте два одинаковых варианта),
// озвучка на каждое слово и её наличие в списках files обоих английских модулей
const wordsPath = `${ROOT}/modules/english-words/words.json`;
if (existsSync(wordsPath)) {
  const slug = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const topics = JSON.parse(read(wordsPath)).topics;
  const seenWord = new Map();
  const seenPicture = new Map();
  const englishModules = ['english-words', 'english-quiz', 'english-say'].filter((id) => existsSync(`${ROOT}/modules/${id}/manifest.json`));
  const listedAudio = new Map(englishModules.map((id) => [id, new Set((JSON.parse(read(`${ROOT}/modules/${id}/manifest.json`)).files || []))]));
  let wordCount = 0;
  for (const topic of topics) {
    if (topic.words.length < 4) add('СЛОВАРЬ', topic.id, `в теме меньше 4 слов (${topic.words.length}) — тест не сможет подобрать варианты`);
    for (const w of topic.words) {
      wordCount++;
      const key = w.en.toLowerCase();
      if (seenWord.has(key)) add('СЛОВАРЬ', w.en, `слово повторяется (${seenWord.get(key)} и ${topic.id})`);
      seenWord.set(key, topic.id);
      const picture = w.emoji || w.color || `number-${w.number}`;
      if (!picture || picture === 'number-undefined') add('СЛОВАРЬ', w.en, 'нет картинки (emoji, color или number)');
      if (seenPicture.has(picture)) add('СЛОВАРЬ', w.en, `картинка ${picture} уже у слова «${seenPicture.get(picture)}»`);
      seenPicture.set(picture, w.en);
      const audio = `audio/en/${slug(w.en)}.mp3`;
      if (!existsSync(`${ROOT}/${audio}`)) add('АУДИО', w.en, `нет озвучки ${audio} — запустите tools/make_audio.py`);
      for (const [id, files] of listedAudio) {
        if (!files.has(`../../${audio}`)) add('ОФЛАЙН', id, `озвучка «${w.en}» не в списке files манифеста — запустите tools/make_audio.py`);
      }
    }
  }
  notes.push(`английский словарь: ${topics.length} тем, ${wordCount} слов`);
}

// 7б2. Английские «два слова» и предложения: слова из phrases.json есть в словаре, озвучка каждого
// сочетания и предложения существует и перечислена в files манифеста, у предложений нет повторов
if (existsSync(wordsPath) && existsSync(`${ROOT}/modules/english-phrases/phrases.json`)) {
  const slugOf = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const dictionary = new Map(JSON.parse(read(wordsPath)).topics.flatMap((t) => t.words).map((w) => [w.en, w]));
  const setup = JSON.parse(read(`${ROOT}/modules/english-phrases/phrases.json`));
  const checkAudio = (moduleId, texts) => {
    const listed = new Set(JSON.parse(read(`${ROOT}/modules/${moduleId}/manifest.json`)).files || []);
    for (const text of texts) {
      const audio = `audio/en/${slugOf(text)}.mp3`;
      if (!existsSync(`${ROOT}/${audio}`)) add('АУДИО', moduleId, `нет озвучки «${text}» — запустите tools/make_audio.py`);
      else if (!listed.has(`../../${audio}`)) add('ОФЛАЙН', moduleId, `озвучка «${text}» не в списке files манифеста — запустите tools/make_audio.py`);
    }
  };
  for (const id of setup.colors) if (!dictionary.get(id)?.color) add('СЛОВАРЬ', 'english-phrases', `цвет «${id}» не найден в words.json`);
  for (const id of setup.nouns) if (!dictionary.get(id)?.emoji) add('СЛОВАРЬ', 'english-phrases', `предмет «${id}» не найден в words.json или без эмодзи`);
  if (new Set(setup.nouns.map((n) => dictionary.get(n)?.emoji)).size !== setup.nouns.length) add('СЛОВАРЬ', 'english-phrases', 'у двух предметов одна картинка');
  checkAudio('english-phrases', setup.colors.flatMap((c) => setup.nouns.map((n) => `${c} ${n}`)));

  const { sentences } = JSON.parse(read(`${ROOT}/modules/english-sentences/sentences.json`));
  const seenText = new Set();
  const seenScene = new Set();
  for (const s of sentences) {
    if (seenText.has(s.en)) add('ПРЕДЛОЖЕНИЯ', 'english-sentences', `«${s.en}» повторяется`);
    seenText.add(s.en);
    const sceneKey = `${s.kind}|${s.scene.join('')}`;
    if (seenScene.has(sceneKey)) add('ПРЕДЛОЖЕНИЯ', 'english-sentences', `у «${s.en}» та же картинка, что у другого предложения типа ${s.kind} — ответ неоднозначен`);
    seenScene.add(sceneKey);
    if (!s.ru || s.scene.length !== 2 || s.scene.some((e) => !e)) add('ПРЕДЛОЖЕНИЯ', 'english-sentences', `у «${s.en}» нет перевода или двух картинок`);
  }
  for (const kind of ['do', 'act', 'place', 'feel']) {
    if (sentences.filter((s) => s.kind === kind).length < 5) add('ПРЕДЛОЖЕНИЯ', 'english-sentences', `в типе ${kind} меньше 5 предложений — не хватит неверных картинок`);
  }
  checkAudio('english-sentences', sentences.map((s) => s.en));
  notes.push(`английский: сочетаний ${setup.colors.length * setup.nouns.length}, предложений ${sentences.length}`);
}

// 7в. Русские и немецкие банки: слова для чтения (тихо отбрасываются повторы слова и картинки),
// существительные для «двух слов» и предложения (уникальные ключи, нет повторов слова внутри предложения)
const bankUrl = (p) => 'file:///' + `${ROOT}/modules/${p}`;
for (const [id, lang] of [['reading-ru', 'ru'], ['reading-de', 'de']]) {
  const path = `${ROOT}/modules/${id}/words.js`;
  if (!existsSync(path)) continue;
  const pairs = read(path).match(/const PAIRS = `([\s\S]*?)`/);
  const tokens = pairs ? pairs[1].split(/[\n|]/).map((t) => t.trim()).filter(Boolean) : [];
  const { WORDS } = await import(bankUrl(`${id}/words.js`));
  if (tokens.length !== WORDS.length) {
    const seenToken = new Set();
    for (const t of tokens) {
      const [w, e] = t.split(/\s+/);
      if (seenToken.has(w.toLowerCase()) || seenToken.has(e)) add('СЛОВАРЬ', id, `«${t}» тихо отброшено: слово или картинка уже есть выше`);
      seenToken.add(w.toLowerCase()); seenToken.add(e);
    }
  }
  const tooLong = WORDS.filter((x) => [...x.word].length > 10);
  for (const x of tooLong) add('СЛОВАРЬ', id, `слово «${x.word}» длиннее 10 букв — не помещается на карточку`);
  notes.push(`${id}: слов для чтения ${WORDS.length}`);
}
for (const id of ['reading-phrases', 'reading-phrases-de']) {
  const path = `${ROOT}/modules/${id}/data.js`;
  if (!existsSync(path)) continue;
  const { NOUNS } = await import(bankUrl(`${id}/data.js`));
  const words = new Set(); const emojis = new Set();
  for (const n of NOUNS) {
    if (words.has(n.word.toLowerCase())) add('СЛОВАРЬ', id, `предмет «${n.word}» повторяется`);
    if (emojis.has(n.emoji)) add('СЛОВАРЬ', id, `картинка ${n.emoji} («${n.word}») повторяется`);
    words.add(n.word.toLowerCase()); emojis.add(n.emoji);
  }
  notes.push(`${id}: предметов ${NOUNS.length}`);
}
// Артикли в немецком: у каждого существительного артикль der/die/das, нет повторов слова и картинки
if (existsSync(`${ROOT}/modules/german-articles/data.js`)) {
  const { NOUNS: artNouns, ARTICLES } = await import(bankUrl('german-articles/data.js'));
  const seenWord = new Set(); const seenEmoji = new Set();
  for (const n of artNouns) {
    if (!ARTICLES.includes(n.art)) add('СЛОВАРЬ', 'german-articles', `у «${n.word}» неверный артикль «${n.art}»`);
    if (seenWord.has(n.word)) add('СЛОВАРЬ', 'german-articles', `слово «${n.word}» повторяется`);
    if (seenEmoji.has(n.emoji)) add('СЛОВАРЬ', 'german-articles', `картинка ${n.emoji} («${n.word}») повторяется`);
    seenWord.add(n.word); seenEmoji.add(n.emoji);
  }
  const perArticle = ARTICLES.map((a) => `${a}: ${artNouns.filter((n) => n.art === a).length}`).join(', ');
  notes.push(`german-articles: существительных ${artNouns.length} (${perArticle}), лёгких ${artNouns.filter((n) => n.easy).length}`);
}
// Банки предложений: ru/de, «Собери предложение» и «Длинные предложения». Проверяем повторы, картинки и перекос по словам:
// частота слов — tools/word-freq.mjs (тот же расчёт: доля предложений банка, в которых слово встречается)
const { BANKS, frequency, MAX_SHARE } = await import(pathToFileURL(`${ROOT}/tools/word-freq.mjs`).href);
for (const bank of BANKS) {
  const id = bank.id;
  const path = `${ROOT}/modules/${id}/data.js`;
  if (!existsSync(path)) continue;
  const { SENTENCES } = await import(bankUrl(`${id}/data.js`));
  const keys = new Set();
  const sceneOf = new Map();
  for (const s of SENTENCES) {
    if (keys.has(s.key)) add('ПРЕДЛОЖЕНИЯ', id, `предложение «${s.key}» повторяется`);
    keys.add(s.key);
    const lower = s.words.map((w) => w.toLowerCase().replace(/[,.!?;:]+$/, '')); // «спит,» и «спит» — одно слово
    if (new Set(lower).size !== lower.length) add('ПРЕДЛОЖЕНИЯ', id, `в «${s.key}» слово повторяется — фишки перепутаются`);
    if (id.startsWith('reading-long') && (s.words.length < 5 || s.words.length > 6)) add('ПРЕДЛОЖЕНИЯ', id, `«${s.key}»: в длинном предложении 5–6 слов, а не ${s.words.length}`);
    if (s.nopic) {
      // предложение без картинки: картинки нет, лишних фишек нет (по картинке их не отличить)
      if (s.scene.length || s.extras.length) add('ПРЕДЛОЖЕНИЯ', id, `«${s.key}»: без картинки (nopic) — без scene и extras`);
      if (s.words.length < 3 || s.words.length > 6) add('ПРЕДЛОЖЕНИЯ', id, `«${s.key}»: в предложении без картинки должно быть 3–6 слов, а не ${s.words.length}`);
    } else {
      if (!s.scene.length || s.scene.some((e) => !e)) add('ПРЕДЛОЖЕНИЯ', id, `у «${s.key}» нет картинки`);
      // одна картинка — одно предложение внутри вида: иначе по картинке не понять, какое собирать
      const sceneKey = `${s.kind}|${s.scene.join('')}`;
      if (sceneOf.has(sceneKey)) add('ПРЕДЛОЖЕНИЯ', id, `у «${s.key}» та же картинка ${s.scene.join('')}, что у «${sceneOf.get(sceneKey)}» (вид ${s.kind})`);
      sceneOf.set(sceneKey, s.key);
    }
  }
  // перекос: ни одно слово (кроме служебных) не должно стоять больше чем в MAX_SHARE предложений банка
  const rows = frequency(SENTENCES, bank.function).filter((r) => !r.function);
  for (const r of rows.filter((x) => x.share > MAX_SHARE)) {
    add('ПОВТОРЫ СЛОВ', id, `слово «${r.word}» стоит в ${(r.share * 100).toFixed(1)}% предложений (больше ${(MAX_SHARE * 100).toFixed(0)}%) — ребёнок узнаёт его по привычке; добавьте других героев, глаголы, предметы или предложения без картинки`);
  }
  const free = SENTENCES.filter((s) => s.nopic).length;
  notes.push(`${id}: предложений ${SENTENCES.length}${free ? ` (без картинки ${free})` : ''}, разных слов ${rows.length + frequency(SENTENCES, bank.function).filter((r) => r.function).length}, самое частое «${rows[0].word}» ${(rows[0].share * 100).toFixed(1)}%`);
}

// 7г. Правило кругов: у каждого модуля любого раздела (английский тоже) должен быть cycle
// (пройденный модуль закрывается, пока не пройдены все; потом супер-наклейка и круг заново)
for (const id of registry) {
  const manifestPath = `${ROOT}/modules/${id}/manifest.json`;
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(read(manifestPath));
  if (!manifest.challenge && !manifest.cycle) add('КРУГ', id, 'у модуля нет cycle — он не закрывается после серии и не участвует в супер-наклейках');
}

// 7д. Сложные задания (modules/challenge): рассказы русского, немецкого и английского, задания математики и
// «право и лево» из генераторов, озвучка английских рассказов
const challengeDir = `${ROOT}/modules/challenge`;
if (existsSync(`${challengeDir}/manifest.json`)) {
  const slugOf = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const manifest = JSON.parse(read(`${challengeDir}/manifest.json`));
  const listed = new Set(manifest.files || []);
  const checkItem = (where, item, { sentencesMin = 3, sentencesMax = 4 } = {}) => {
    const label = `${where} ${item.id}`;
    if (!item.sentences || item.sentences.length < sentencesMin || item.sentences.length > sentencesMax) add('ЗАДАНИЕ', label, `в тексте должно быть ${sentencesMin}–${sentencesMax} предложения`);
    if (!item.question) add('ЗАДАНИЕ', label, 'нет вопроса');
    const options = item.options || [];
    if (options.length < 3 || options.length > 4) add('ЗАДАНИЕ', label, `вариантов ответа ${options.length}, нужно 3–4`);
    const keys = options.map((o) => JSON.stringify(typeof o === 'string' ? { t: o } : o));
    if (new Set(keys).size !== keys.length) add('ЗАДАНИЕ', label, 'есть одинаковые варианты ответа');
    if (!(item.answer >= 0 && item.answer < options.length)) add('ЗАДАНИЕ', label, 'номер верного ответа вне списка вариантов');
    if (item.clue != null && !(item.clue >= 0 && item.clue < (item.sentences || []).length)) add('ЗАДАНИЕ', label, 'подсвечиваемое предложение вне текста');
  };
  const pools = [['ru', 'ru.js'], ['de', 'de.js']];
  let storyCount = 0;
  for (const [lang, file] of pools) {
    const { STORIES } = await import(bankUrl(`challenge/pools/${file}`));
    const ids = new Set();
    for (const story of STORIES) {
      checkItem(lang, story);
      if (ids.has(story.id)) add('ЗАДАНИЕ', story.id, 'id повторяется');
      ids.add(story.id);
      storyCount++;
    }
  }
  const { stories } = JSON.parse(read(`${challengeDir}/pools/en.json`));
  const enIds = new Set();
  for (const story of stories) {
    checkItem('en', story);
    if (enIds.has(story.id)) add('ЗАДАНИЕ', story.id, 'id повторяется');
    enIds.add(story.id);
    if (!story.tr || story.tr.length !== story.sentences.length) add('ЗАДАНИЕ', story.id, 'нужен перевод каждого предложения (tr)');
    for (const key of [`ch-${story.id}-story`, `ch-${story.id}-q`]) {
      const audio = `audio/en/${slugOf(key)}.mp3`;
      if (!existsSync(`${ROOT}/${audio}`)) add('АУДИО', story.id, `нет озвучки ${audio} — запустите tools/make_audio.py`);
      else if (!listed.has(`../../${audio}`)) add('ОФЛАЙН', 'challenge', `озвучка ${key} не в списке files манифеста — запустите tools/make_audio.py`);
    }
    storyCount++;
  }
  // Генераторы: много случайных заданий, у каждого верный ответ среди вариантов, числа в пределах 0–20
  const { makeMathTask } = await import(bankUrl('challenge/pools/math.js'));
  const { makeOrientationTask } = await import(bankUrl('challenge/pools/orientation.js'));
  const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 1; i <= 400; i++) {
    const math = makeMathTask(lcg(i));
    checkItem('math', math, { sentencesMin: 3, sentencesMax: 3 });
    for (const o of math.options) if (!(o.n >= 0 && o.n <= 40)) add('ЗАДАНИЕ', 'math', `число ${o.n} вне разумных пределов (${math.sentences.join(' ')})`);
    const orient = makeOrientationTask(lcg(i * 7919));
    checkItem('orientation', orient, { sentencesMin: 4, sentencesMax: 4 });
  }
  notes.push(`сложные задания: рассказов ${storyCount} (ru, de, en), математика и право-лево — генераторы`);
}

// 7б. Ежедневная миссия «Уборка комнаты»: файлы, данные, строки и переходы между фазами (хранилище на заглушке localStorage)
{
  const MISSION_FILES = ['core/mission-data.js', 'core/mission.js', 'core/screens/mission.js', 'core/screens/room-art.js', 'core/styles/mission.css'];
  for (const f of MISSION_FILES) if (!swList.includes(f)) add('МИССИЯ', 'sw.js', `файла миссии нет в CORE_FILES: ${f}`);
  if (!read(`${ROOT}/index.html`).includes('core/styles/mission.css')) add('МИССИЯ', 'index.html', 'не подключён core/styles/mission.css');

  const coreUrl = (p) => 'file:///' + `${ROOT}/core/${p}`;
  const data = await import(coreUrl('mission-data.js'));
  const { STR } = await import(coreUrl('strings.js'));
  const ids = data.ZONES.map((z) => z.id);
  if (new Set(ids).size !== ids.length) add('МИССИЯ', 'mission-data.js', 'в ZONES повторяются id');
  const icons = data.ZONES.map((z) => z.icon);
  if (icons.some((i) => !i) || new Set(icons).size !== icons.length) add('МИССИЯ', 'mission-data.js', 'у каждой зоны свой значок, значки не повторяются');
  for (const z of data.ZONES) {
    if (!['A', 'B'].includes(z.view)) add('МИССИЯ', z.id, 'view зоны — A или B');
    if (!STR.mission.zones?.[z.id]) add('МИССИЯ', z.id, 'нет названия зоны в STR.mission.zones');
    if (!STR.mission.zonePick?.[z.id]) add('МИССИЯ', z.id, 'нет реплики собаки при выборе зоны в STR.mission.zonePick');
  }
  for (const id of Object.keys(STR.mission.zones || {})) if (!ids.includes(id)) add('МИССИЯ', 'strings.js', `название для несуществующей зоны ${id}`);
  for (const z of data.ZONES) {
    const inFrame = (p) => Array.isArray(p) && p[0] >= 0 && p[0] <= 380 && p[1] >= 0 && p[1] <= 250;
    if (!data.VIEWS.includes(z.view) || !Array.isArray(z.views) || !z.views.includes(z.view)) add('МИССИЯ', z.id, 'view должен быть одним из views');
    for (const v of z.views || []) if (!inFrame(z.stand?.[v]) || !inFrame(z.spot?.[v])) add('МИССИЯ', z.id, `stand и spot для вида ${v} — точки в кадре комнаты 380×250`);
    if (!data.GESTURES.includes(z.gesture)) add('МИССИЯ', z.id, `жест «${z.gesture}» не из GESTURES`);
  }
  for (const g of data.GESTURES) if (!read(`${ROOT}/core/styles/mission.css`).includes(`.mz-actor.g-${g}`)) add('МИССИЯ', 'mission.css', `нет анимации жеста ${g}`);
  if (ids.length !== 7) add('МИССИЯ', 'mission-data.js', `зон должно быть семь (раздел 8.4 ТЗ), а их ${ids.length}`);
  if (!data.REWARD_TYPES.includes(data.REWARD.type)) add('МИССИЯ', 'mission-data.js', `REWARD.type «${data.REWARD.type}» не из REWARD_TYPES`);
  // Все ключи STR.mission используются в коде ядра.
  const coreCode = js.filter((p) => p.includes('/core/') && !p.endsWith('/strings.js')).map(read).join('\n');
  for (const key of Object.keys(STR.mission)) {
    if (!new RegExp(`\\b${key}\\b`).test(coreCode)) add('МИССИЯ', 'strings.js', `ключ STR.mission.${key} нигде не используется`);
  }

  // Рисунок комнаты (раздел 8 ТЗ): оба вида собираются, у каждой зоны есть группа data-zone хотя бы в одном виде,
  // палитра --room-* определена в mission.css, id внутри рисунка не повторяются, внешних адресов нет.
  const { roomMarkup } = await import(coreUrl('screens/room-art.js'));
  const foundBy = {}; // какие зоны нарисованы в каком виде (ТЗ 8.11): сверяем с views в ZONES
  const seen = new Set();
  const cssVars = new Set([...css.map(read).join('\n').matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));
  for (const view of ['A', 'B']) {
    const svg = roomMarkup(view);
    if (!svg.startsWith('<svg') || !svg.trim().endsWith('</svg>')) add('КОМНАТА', `вид ${view}`, 'разметка не SVG');
    if (/NaN|undefined|\[object/.test(svg)) add('КОМНАТА', `вид ${view}`, 'в разметке NaN/undefined');
    const found = new Set([...svg.matchAll(/data-zone="(\w+)"/g)].map((m) => m[1]));
    foundBy[view] = found;
    for (const id of found) { seen.add(id); if (!ids.includes(id)) add('КОМНАТА', `вид ${view}`, `data-zone «${id}» нет в ZONES`); }
    const idList = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    if (new Set(idList).size !== idList.length) add('КОМНАТА', `вид ${view}`, 'повторяются id внутри рисунка');
    if (/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(svg)) add('КОМНАТА', `вид ${view}`, 'внешний адрес в рисунке');
    for (const m of svg.matchAll(/var\((--room-[\w-]+)\)/g)) if (!cssVars.has(m[1].slice(2))) add('КОМНАТА', `вид ${view}`, `цвет ${m[1]} не определён в mission.css`);
  }
  for (const id of ids) if (!seen.has(id)) add('КОМНАТА', id, 'зоны нет ни в одном виде комнаты');
  for (const z of data.ZONES) {
    const drawn = data.VIEWS.filter((v) => foundBy[v]?.has(z.id));
    if (drawn.join() !== [...z.views].sort().join()) add('КОМНАТА', z.id, `views в ZONES (${z.views}) не совпадают с видами, где зона нарисована (${drawn})`);
  }
  if (!read(`${ROOT}/core/styles/mission.css`).includes('.mz-turn')) add('КОМНАТА', 'mission.css', 'нет стиля кнопки «Повернуть комнату»');

  // Карточка родителя: строки STR.parent.mission* / dayShort используются в parent.js, дней недели семь
  const parentCode = read(`${ROOT}/core/screens/parent.js`);
  for (const key of Object.keys(STR.parent).filter((k) => /^mission|^dayShort$/.test(k))) {
    if (!new RegExp(`\\b${key}\\b`).test(parentCode)) add('МИССИЯ', 'strings.js', `ключ STR.parent.${key} нигде не используется`);
  }
  // вкладки экрана родителя: у каждой есть название, и каждое название относится к вкладке
  const tabIds = [...parentCode.matchAll(/\{ id: '(\w+)', build:/g)].map((m) => m[1]);
  for (const id of tabIds) if (!STR.parent.tabs?.[id]) add('МИССИЯ', 'strings.js', `нет названия вкладки родителя «${id}» в STR.parent.tabs`);
  for (const id of Object.keys(STR.parent.tabs || {})) if (!tabIds.includes(id)) add('МИССИЯ', 'strings.js', `название вкладки «${id}» есть, а вкладки в parent.js нет`);
  if (tabIds.length < 6 || !tabIds.includes('tester')) add('МИССИЯ', 'parent.js', 'на экране родителя должны быть вкладки и вкладка «tester»');
  if (STR.parent.dayShort.length !== 7) add('МИССИЯ', 'strings.js', 'STR.parent.dayShort — семь дней недели');
  for (const key of ['off', 'choose', 'timer', 'wait', 'done', 'doneNoZone', 'skipped']) if (!STR.parent.missionStatus?.[key]) add('МИССИЯ', 'strings.js', `нет STR.parent.missionStatus.${key}`);

  // Хранилище и переходы. storage.js ждёт браузер, поэтому даём ему заглушки window и localStorage.
  const mem = new Map();
  globalThis.window = { addEventListener() {} };
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const storage = await import(coreUrl('storage.js'));
  const mission = await import(coreUrl('mission.js'));
  const must = (cond, text) => { if (!cond) add('МИССИЯ', 'поведение', text); };
  const today = storage.dayKey();
  const yesterday = data.shiftDay(today, -1);
  // Чтение сохранения возвращает настройки по умолчанию, где поздравление с днём рождения включено; если сегодня как раз
  // день рождения из настроек (12-14 ноября), миссии не было бы, поэтому поздравление отключаем.
  const importData = (d) => {
    storage.importJson(JSON.stringify({ app: 'school-app', version: 1, data: d }));
    storage.setSettings({ birthday: { enabled: false } });
  };

  // Расписание собаки в таймере: дорога, работа и отдых по кругу, финал; после продления времени — сразу работа
  const mm = mission;
  const plan = mm.dogPlan;
  const okPlan = (r, mode) => r.mode === mode;
  must(okPlan(plan(0, 300000), 'walk') && plan(0, 300000).t === 0, 'dogPlan: в начале собака идёт, доля пути 0');
  must(okPlan(plan(mm.DOG_WALK_MS / 2, 290000), 'walk') && Math.abs(plan(mm.DOG_WALK_MS / 2, 290000).t - 0.5) < 1e-9, 'dogPlan: на середине дороги t = 0,5');
  must(okPlan(plan(mm.DOG_WALK_MS + 1000, 280000), 'work'), 'dogPlan: после дороги работает');
  must(okPlan(plan(mm.DOG_WALK_MS + mm.DOG_WORK_MS + 500, 270000), 'rest'), 'dogPlan: после рабочего отрезка отдыхает');
  must(okPlan(plan(mm.DOG_WALK_MS + mm.DOG_WORK_MS + mm.DOG_REST_MS + 500, 260000), 'work'), 'dogPlan: цикл работа-отдых повторяется');
  must(okPlan(plan(100000, mm.DOG_PROUD_MS), 'proud') && okPlan(plan(300000, 0), 'proud'), 'dogPlan: в последние секунды и после конца собака гордо сидит');
  must(okPlan(plan(0, 300000, false), 'work'), 'dogPlan: после «Ещё нет» собака не идёт от двери заново');


  // старое сохранение (без миссии) читается: миссия выключена, настройки по умолчанию
  importData({ stars: 3 });
  must(storage.stars() === 3, 'старое сохранение без миссии не прочиталось');
  must(storage.settings().mission.enabled === false && storage.settings().mission.minutes === 5 && storage.settings().mission.days.length === 7, 'настройки миссии по умолчанию: выключена, 5 минут, все дни');
  must(!mission.missionPending(), 'выключенная миссия не должна быть нужна');
  storage.setSettings({ mission: { enabled: true } });
  must(storage.settings().mission.minutes === 5, 'setSettings({ mission: { enabled } }) затёр остальные настройки миссии');
  must(mission.missionPending(), 'включённая миссия сегодня должна быть нужна');
  storage.setSettings({ mission: { days: [1, 2, 3, 4, 5, 6, 7].filter((d) => d !== data.isoWeekday(today)) } });
  must(!mission.missionPending(), 'в «чужой» день недели миссии быть не должно');
  storage.setSettings({ mission: { days: 'мусор', minutes: 999 } });
  must(storage.settings().mission.days.length === 7 && storage.settings().mission.minutes === 15, 'плохие настройки миссии должны стать безопасными');

  // полный день: зона → таймер → «убралась» → «ещё нет» → подтверждение один раз
  must(!mission.startTimer(), 'таймер нельзя запустить без зоны');
  must(!mission.chooseZone('нет-такой'), 'выбор несуществующей зоны принят');
  must(mission.chooseZone('desk') && mission.chooseZone('bed'), 'ребёнок до «Начнём!» должна менять выбор');
  const t0 = Date.now() - 600000; // начали 10 минут назад (хранилище не принимает моменты из будущего)
  must(mission.startTimer(t0) && storage.mission().phase === 'timer' && storage.mission().endsAt === t0 + 15 * 60000, 'старт таймера');
  must(!mission.chooseZone('desk') && storage.mission().zone === 'bed', 'после «Начнём!» зона меняться не должна');
  must(mission.msLeft(t0 + 60000) === 14 * 60000, 'msLeft считается от endsAt');
  must(mission.timerProgress(t0) === 0 && Math.abs(mission.timerProgress(t0 + 7.5 * 60000) - 0.5) < 1e-9 && mission.timerProgress(t0 + 20 * 60000) === 1, 'timerProgress: 0, 0,5 и 1 на начале, середине и конце отрезка');
  must(mission.markCleaned(t0 + 90000) && storage.mission().phase === 'wait' && mission.missionPending(), '«Я убралась!» переводит в ожидание взрослого, миссия ещё не закрыта');
  must(mission.addTime(t0 + 100000) && storage.mission().phase === 'timer' && storage.mission().extra === 1, '«Ещё нет» возвращает таймер');
  must(mission.timerProgress(t0 + 100000) === 0, 'после «Ещё нет» отрезок таймера начинается заново (progress = 0)');
  mission.markCleaned(t0 + 120000);
  const gift = mission.confirmDone();
  const m1 = storage.mission();
  must(gift && m1.phase === 'done' && m1.streak === 1 && m1.lastDoneDay === today, 'подтверждение: фаза done, серия 1');
  must(m1.history[today]?.result === 'done' && m1.history[today].zone === 'bed' && m1.history[today].sec === 120 && m1.history[today].extra === 1, 'запись в истории (зона, секунды, добавления)');
  must(mission.confirmDone() === null && !mission.skipToday(), 'подарок или пропуск второй раз за день');
  must(!mission.missionPending(), 'после подтверждения миссии быть не должно');

  // перезагрузка: экспорт → импорт сохраняет миссию, настройки и время миссии
  storage.addMissionUsage(7);
  const before = JSON.stringify(storage.mission());
  const dump = storage.exportJson();
  storage.reset();
  must(storage.mission().phase === 'choose' && Object.keys(storage.mission().history).length === 0 && storage.missionUsageOn() === 0, 'reset() стирает историю и время миссии');
  must(storage.settings().mission.minutes === 15, 'reset() не должен стирать настройки миссии');
  storage.importJson(dump);
  must(JSON.stringify(storage.mission()) === before && storage.missionUsageOn() === 7, 'экспорт/импорт теряет данные миссии');
  must(storage.usageOn() === 0, 'время миссии попало в дневной лимит');

  // вчерашняя недоделанная миссия сгорает, серия и история остаются; серия продолжается через «не миссионные» дни
  const base = { settings: { mission: { enabled: true, minutes: 5, days: [1, 2, 3, 4, 5, 6, 7] } } };
  importData({ ...base, mission: { day: yesterday, phase: 'wait', zone: 'desk', startedAt: Date.now() - 5000, streak: 4, lastDoneDay: yesterday, history: { [yesterday]: { zone: 'desk', result: 'done', sec: 60, extra: 0 } } } });
  const m2 = storage.mission();
  must(m2.day === today && m2.phase === 'choose' && m2.zone === '' && m2.streak === 4 && m2.history[yesterday], 'новый день: миссия заново, серия и история на месте');
  must(mission.currentStreak() === 4, 'серия за вчерашний день должна продолжаться');
  mission.chooseZone('floor'); mission.startTimer(); mission.confirmDone();
  must(storage.mission().streak === 5, 'серия растёт на следующий день');
  importData({ ...base, mission: { day: today, phase: 'choose', streak: 4, lastDoneDay: data.shiftDay(today, -3) } });
  must(mission.currentStreak() === 0, 'пропущенный день миссии обнуляет серию');
  must(data.continuesStreak(data.shiftDay(today, -3), today, [data.isoWeekday(data.shiftDay(today, -1))]) === false, 'continuesStreak: пропущены «миссионные» дни');
  must(data.continuesStreak(data.shiftDay(today, -3), today, []) === true, 'continuesStreak: между ними нет «миссионных» дней');

  // пробный запуск из раздела для родителя: короткий таймер, настоящее состояние, история и время миссии не меняются
  storage.reset();
  storage.setSettings({ mission: { enabled: true } });
  const realBefore = JSON.stringify(storage.mission());
  const minutesBefore = mission.timerMs();
  storage.startMissionTest();
  must(storage.missionTestOn() && mission.timerMs() === data.MISSION_TEST_MS, 'пробный запуск: таймер короткий');
  mission.chooseZone('sofa'); mission.startTimer(); mission.markCleaned();
  must(mission.confirmDone() !== null && storage.mission().phase === 'done', 'пробный запуск доходит до конца');
  storage.addMissionUsage(50);
  storage.endMissionTest();
  must(!storage.missionTestOn() && mission.timerMs() === minutesBefore, 'после пробного запуска таймер снова по настройкам');
  must(JSON.stringify(storage.mission()) === realBefore && storage.missionUsageOn() === 0, 'пробный запуск изменил настоящую миссию, историю или время миссии');

  // подарок за уборку — косточка, один раз; пропуск за звёзды списывает с баланса и подарка не даёт; пробный запуск ничего не меняет
  must(data.REWARD.type === 'bones' && data.REWARD.amount === 1, 'REWARD: за уборку — одна косточка');
  storage.reset();
  storage.setSettings({ mission: { enabled: true } });
  must(storage.bonesBalance() === 0, 'в начале косточек нет');
  mission.chooseZone('desk'); mission.startTimer(); mission.markCleaned();
  mission.confirmDone();
  must(storage.bonesBalance() === 1 && storage.mission().reward?.type === 'bones', 'подтверждение уборки даёт одну косточку');
  mission.confirmDone();
  must(storage.bonesBalance() === 1, 'косточка за день выдаётся один раз');
  storage.reset();
  storage.addStars(150);
  storage.setSettings({ mission: { enabled: true } });
  const starsBefore = storage.stars();
  must(mission.skipForStars() && storage.balance() === 50 && storage.stars() === starsBefore, 'пропуск за 100 звёзд списывает с баланса, заработанные звёзды не уменьшаются');
  const paid = storage.mission();
  must(paid.phase === 'skipped' && paid.history[today]?.result === 'skipped' && paid.history[today].paid === data.SKIP_COST && storage.bonesBalance() === 0 && !mission.missionPending(), 'пропуск за звёзды: фаза skipped, paid в истории, косточки нет');
  must(!mission.skipForStars() && storage.balance() === 50, 'второй пропуск за день звёзды не тратит');
  storage.reset();
  storage.addStars(99);
  storage.setSettings({ mission: { enabled: true } });
  must(!mission.skipForStars() && storage.balance() === 99 && mission.missionPending(), 'не хватает звёзд: пропуска нет, звёзды на месте');
  storage.startMissionTest();
  must(mission.skipForStars() && storage.balance() === 99, 'пробный запуск: пропуск за звёзды ничего не тратит');
  mission.chooseZone('desk');
  storage.endMissionTest();
  storage.reset();

  // «Открыть сегодняшнюю миссию заново» (вкладка тестировщика): день стирается, серия пересчитывается по истории, выданное не возвращается
  storage.reset();
  storage.setSettings({ mission: { enabled: true } });
  storage.setMission({ streak: 2, lastDoneDay: data.shiftDay(today, -1), history: { [data.shiftDay(today, -2)]: { zone: 'desk', result: 'done', sec: 90, extra: 0, paid: 0 }, [data.shiftDay(today, -1)]: { zone: 'bed', result: 'done', sec: 90, extra: 0, paid: 0 } } });
  mission.chooseZone('floor'); mission.startTimer(); mission.markCleaned(); mission.confirmDone();
  must(storage.mission().streak === 3 && storage.bonesBalance() === 1, 'перед повторным открытием: серия 3, косточка 1');
  storage.reopenMission();
  const reopened = storage.mission();
  must(reopened.phase === 'choose' && reopened.zone === '' && !reopened.history[today] && reopened.streak === 2 && reopened.lastDoneDay === data.shiftDay(today, -1), 'reopenMission: день открыт заново, записи за сегодня нет, серия вернулась к 2');
  must(storage.bonesBalance() === 1, 'reopenMission не отбирает уже выданную косточку');
  storage.startMissionTest();
  storage.reopenMission();
  must(storage.mission().phase === 'choose' && storage.missionTestOn(), 'reopenMission в пробном запуске ничего не делает');
  storage.endMissionTest();
  storage.reset();

  // повреждённые данные
  const soon = Date.now() + 10 * 86400000;
  importData({ mission: { day: today, phase: 'timer', zone: 'desk', startedAt: Date.now() - 1000, endsAt: soon } });
  must(storage.mission().phase === 'timer' && storage.mission().endsAt <= Date.now() + 3600000 + 1000, 'endsAt слишком далеко в будущем');
  importData({ mission: { day: today, phase: 'timer', zone: 'не-зона', startedAt: 1, endsAt: 2 } });
  must(storage.mission().phase === 'choose', 'таймер без допустимой зоны должен вернуться к выбору');
  importData({ mission: 'мусор', missionUsage: { 'не-день': 5, [today]: 'x' } });
  must(storage.mission().phase === 'choose' && storage.missionUsageOn() === 0, 'мусор в миссии и времени миссии');
  // раздел «Уборка комнаты» в отчёте для анализа: без данных — пометка, с данными — цифры и CSV по дням
  const report = await import(coreUrl('report.js'));
  const emptyApp = { manifests: [] };
  storage.reset();
  const textEmpty = report.buildReport(emptyApp);
  must(textEmpty.includes(`## ${STR.report.mission.title}`) && textEmpty.includes(STR.report.mission.none) && !report.hasData(), 'отчёт без данных миссии: раздел с пометкой «данных нет»');
  const dayAgo = (n) => data.shiftDay(today, -n);
  importData({
    settings: { mission: { enabled: true, minutes: 5, days: [1, 2, 3, 4, 5, 6, 7] } },
    mission: {
      day: today, phase: 'choose', streak: 2, lastDoneDay: dayAgo(1),
      history: {
        [dayAgo(1)]: { zone: 'desk', result: 'done', sec: 200, extra: 0 },
        [dayAgo(2)]: { zone: 'desk', result: 'done', sec: 300, extra: 1 },
        [dayAgo(3)]: { zone: 'bed', result: 'skipped', sec: 0, extra: 0 },
        [dayAgo(20)]: { zone: 'sofa', result: 'done', sec: 100, extra: 0 },
      },
    },
    missionUsage: { [dayAgo(1)]: 250, [dayAgo(2)]: 330 },
  });
  const text = report.buildReport(emptyApp);
  must(report.hasData(), 'hasData() должна видеть историю миссии');
  must(text.includes('выполнено 2, пропущено взрослым 1') && text.includes('выполнено 3, пропущено взрослым 1'), 'отчёт: счёт выполнено/пропущено за 14 и 30 дней');
  must(text.includes('Стол 2') && text.includes('Диван 1') && text.includes('Ни разу не выбрано'), 'отчёт: зоны и невыбранные зоны');
  must(text.includes('медиана 3:20') && text.includes('(дней с замером: 3)'), 'отчёт: медиана времени уборки (200, 300, 100 с → 3:20)');
  must(text.includes('Взрослый добавлял время (30 дней): 1 раз в 1 дн.') && text.includes('сейчас 2, лучшая') && text.includes('14 дн. — 9:40'), 'отчёт: добавления времени, серия, время на экранах миссии');
  must(text.includes(STR.report.mission.rawHead) && text.includes(`${dayAgo(2)},mission,desk,done,300,1,0,330`), 'отчёт: CSV миссии по дням с полем mission');
  must(!/NaN|undefined|\[object/.test(text), 'в отчёте NaN или undefined');
  storage.reset();
  notes.push('миссия «Уборка комнаты»: зоны, строки, хранилище, переходы и раздел отчёта проверены');
}

// 7б3. День рождения ребёнка: даты, настройки по умолчанию, подарки один раз в год, уборки в этот день нет
{
  const BD_FILES = ['core/birthday-data.js', 'core/birthday.js', 'core/screens/birthday.js', 'core/styles/birthday.css'];
  for (const f of BD_FILES) if (!swList.includes(f)) add('ДЕНЬ РОЖДЕНИЯ', 'sw.js', `файла нет в CORE_FILES: ${f}`);
  if (!read(`${ROOT}/index.html`).includes('core/styles/birthday.css')) add('ДЕНЬ РОЖДЕНИЯ', 'index.html', 'не подключён core/styles/birthday.css');

  const coreUrl = (p) => 'file:///' + `${ROOT}/core/${p}`;
  const data = await import(coreUrl('birthday-data.js'));
  const { STR } = await import(coreUrl('strings.js'));
  const { stickerById } = await import(coreUrl('rewards.js'));
  const { itemById } = await import(coreUrl('dog-items.js'));
  const storage = await import(coreUrl('storage.js'));
  const bd = await import(coreUrl('birthday.js'));
  const mission = await import(coreUrl('mission.js'));
  const must = (cond, text) => { if (!cond) add('ДЕНЬ РОЖДЕНИЯ', 'поведение', text); };
  const importData = (d) => storage.importJson(JSON.stringify({ app: 'school-app', version: 1, data: d }));
  const now = new Date();
  const todayCfg = { month: now.getMonth() + 1, day: now.getDate() };
  const pad = (n) => String(n).padStart(2, '0');
  const yesterday = (() => { const d = new Date(now); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
  const today = storage.dayKey();

  // подарки существуют: колпак есть в каталоге вещей, наклейки — в каталоге наклеек
  must(itemById.has(data.GIFT.hat), `колпак ${data.GIFT.hat} из GIFT нет в core/dog-items.js`);
  for (const id of data.GIFT.stickers) must(stickerById.has(id), `наклейки ${id} из GIFT нет в каталоге core/rewards.js`);
  must(data.GIFT.bones > 0, 'в GIFT нет косточек');
  const coreCode = all.filter((p) => p.includes('/core/') && p.endsWith('.js') && !p.endsWith('/strings.js')).map(read).join('\n');
  for (const key of Object.keys(STR.birthday)) {
    if (!new RegExp(`\\b${key}\\b`).test(coreCode)) add('ДЕНЬ РОЖДЕНИЯ', 'strings.js', `ключ STR.birthday.${key} нигде не используется`);
  }

  // даты: сам день, «догоняющие» дни, до и после окна; 31 декабря → январь; 29 февраля
  const cfg = { month: 11, day: 12, year: 2019 };
  const at = (y, m, d) => data.birthdayAge(new Date(y, m - 1, d, 12), cfg);
  must(at(2026, 11, 12)?.age === 7 && at(2026, 11, 12)?.daysAfter === 0, 'в день рождения 12.11.2026 ребёнку 7 лет, daysAfter 0');
  must(at(2026, 11, 14)?.daysAfter === data.LATE_DAYS, 'через два дня поздравление ещё ждёт');
  must(at(2026, 11, 15) === null && at(2026, 11, 11) === null && at(2026, 3, 1) === null, 'вне окна поздравления быть не должно');
  must(data.birthdayAge(new Date(2027, 0, 1, 12), { month: 12, day: 31, year: 2019 })?.year === 2026, 'день рождения 31 декабря догоняет в январе (год — прошлый)');
  must(data.birthdayAge(new Date(2027, 1, 28, 12), { month: 2, day: 29, year: 2020 })?.daysAfter === 0, '29 февраля в невисокосный год — 28-го');
  must(data.yearsLabel(1) === '1 год' && data.yearsLabel(2) === '2 года' && data.yearsLabel(5) === '5 лет' && data.yearsLabel(7) === '7 лет' && data.yearsLabel(11) === '11 лет' && data.yearsLabel(21) === '21 год', 'склонение «год / года / лет»');

  // настройки по умолчанию и плохие значения
  importData({ stars: 1 });
  const def = storage.settings().birthday;
  must(def.enabled === true && def.name === 'Алиса' && def.month === 11 && def.day === 12 && def.year === 2019, 'настройки поздравления по умолчанию: Алиса, 12 ноября 2019');
  storage.setSettings({ birthday: { month: 99, day: -4, year: 1800, name: '  ' + 'я'.repeat(40) } });
  const bad = storage.settings().birthday;
  must(bad.month === 12 && bad.day === 1 && bad.year === 1990 && bad.name.length === 20, 'плохие настройки поздравления должны стать безопасными');
  storage.setSettings({ birthday: { enabled: false } });
  must(storage.settings().birthday.month === 12 && storage.settings().birthday.enabled === false, 'setSettings({ birthday: { enabled } }) затёр остальные поля');

  // поздравление нужно в день рождения, один раз за год; уборки в этот день нет
  importData({ settings: { birthday: { enabled: true, ...todayCfg, year: now.getFullYear() - 7 }, mission: { enabled: true } }, mission: { day: today, phase: 'choose', streak: 3, lastDoneDay: yesterday, history: {} } });
  const info = bd.birthdayInfo();
  must(info && info.age === 7 && info.daysAfter === 0 && info.year === now.getFullYear(), 'сегодня день рождения: поздравление ждёт, ребёнку 7');
  must(bd.birthdayToday() && !mission.missionPending(), 'в день рождения уборки комнаты нет');
  const before = { bones: storage.bones(), owned: storage.owned().length };
  const got = bd.claimBirthday(info);
  must(got && got.bones === data.GIFT.bones && got.hat === data.GIFT.hat && got.sticker === data.GIFT.stickers[0], 'подарок: косточки, колпак, первая наклейка');
  must(storage.bones() === before.bones + data.GIFT.bones && storage.owned().length === before.owned + 1 && storage.owned().includes(got.sticker), 'подарок выдан в хранилище: косточки и наклейка');
  must(storage.dogApi('real').items().includes(data.GIFT.hat), 'колпак добавлен в вещи');
  must(bd.claimBirthday(info) === null && bd.birthdayInfo() === null && !bd.birthdayPending(), 'второй раз за год подарок не выдаётся, поздравление больше не нужно');
  must(storage.mission().phase === 'skipped' && storage.mission().history[today]?.result === 'skipped' && storage.mission().lastDoneDay === today && storage.mission().streak === 3, 'уборка в день рождения закрыта без подарка, серия дней не прервалась');
  storage.reset();
  must(storage.birthdayDoneYear() === now.getFullYear(), 'сброс прогресса не должен возвращать поздравление этого года');

  // колпак надевается на собаку без шапки; следующий год — следующая наклейка; поздравление «задним числом» уборку не отменяет
  importData({ bones: 10, settings: { birthday: { enabled: true, ...todayCfg, year: now.getFullYear() - 7 }, mission: { enabled: true } }, mission: { day: today, phase: 'choose' }, dogsVersion: 2 });
  storage.dogApi('real').buyDog({ name: 'Рекс', breed: 'labrador', color: 'gold', age: 3 });
  must(storage.dogApi('real').dogs()[0]?.outfit.hat === '', 'у новой собаки нет шапки');
  const late = storage.claimBirthday(now.getFullYear(), data.GIFT, 1);
  must(late && storage.dogApi('real').dogs()[0]?.outfit.hat === data.GIFT.hat, 'колпак надет на собаку без шапки');
  must(storage.mission().phase === 'choose', 'поздравление «задним числом» (daysAfter > 0) уборку не отменяет');
  const next = storage.claimBirthday(now.getFullYear() + 1, data.GIFT, 1);
  must(next && next.sticker === data.GIFT.stickers[1], 'в следующий год — следующая ещё не собранная наклейка');
  must(storage.claimBirthday(now.getFullYear() + 1, data.GIFT, 1) === null, 'повторный подарок за тот же год');
  storage.reopenBirthday();
  must(storage.birthdayDoneYear() === 0, 'reopenBirthday сбрасывает отметку');

  // выключенное поздравление не показывается
  storage.setSettings({ birthday: { enabled: false } });
  must(bd.birthdayInfo() === null && !bd.birthdayToday(), 'выключенное поздравление не должно появляться');
  storage.reset();
  notes.push('день рождения: даты, настройки, подарки раз в год, колпак на собаку, нет уборки в этот день проверены');
}

// 7б4. Наклейки: обычные (альбомы) и супер-наклейки (миры) должны быть разными картинками.
// Внутри альбомов эмодзи не повторяются; общими с мирами могут быть только эмодзи из ALBUM_WORLD_SHARED
// (решение владельца: повторы альбомов заменены, эти 12 оставлены сознательно).
{
  const ALBUM_WORLD_SHARED = ['🐻', '👸', '🧚‍♀️', '🧜‍♀️', '🎠', '⭐', '🌟', '🐠', '🐴', '🌸', '🚢', '🎈'];
  const { ALBUMS, WORLDS } = await import('file:///' + `${ROOT}/core/rewards.js`);
  const norm = (e) => e.replace(/️/g, ''); // ⛸️ и ⛸ — одна картинка
  const shared = new Set(ALBUM_WORLD_SHARED.map(norm));
  const seen = new Map();
  for (const album of ALBUMS) {
    for (const s of album.items) {
      const e = norm(s.emoji);
      if (seen.has(e)) add('НАКЛЕЙКИ', 'core/rewards.js', `${s.emoji} повторяется в альбомах: ${seen.get(e)} и ${s.id}`);
      else seen.set(e, s.id);
    }
  }
  for (const world of WORLDS) {
    for (const it of world.items) {
      const e = norm(it.emoji);
      if (seen.has(e) && !shared.has(e)) add('НАКЛЕЙКИ', 'core/rewards.js', `${it.emoji} есть и в альбоме (${seen.get(e)}), и в мире ${world.id} — обычная и супер-наклейка должны быть разными`);
    }
  }
  notes.push('наклейки: в альбомах нет повторов, с мирами общие только разрешённые эмодзи');
}

// 8. Классы в CSS и JS: быстрый поиск мёртвых стилей и неопределённых переменных
const vars = new Set([...css.map(read).join('\n').matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));
for (const f of css) {
  for (const m of read(f).matchAll(/var\(--([\w-]+)/g)) if (!vars.has(m[1]) && !['i', 'x', 's', 'd'].includes(m[1])) add('CSS', rel(f), `переменная --${m[1]} нигде не определена`);
}

console.log(`JS-файлов: ${js.length}, CSS: ${css.length}, модулей: ${registry.length}`);
console.log(problems.length ? `\nНАЙДЕНО (${problems.length}):\n` + problems.join('\n') : '\nпроблем не найдено');
if (notes.length) console.log(`\nЗАМЕЧАНИЯ (${notes.length}):\n` + notes.join('\n'));
