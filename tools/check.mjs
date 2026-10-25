// Проверка проекта одной командой:  node tools/check.mjs
// Ищет: синтаксические ошибки, битые импорты, расхождения манифестов и реестра, файлы, которых
// нет в офлайн-кэше (sw.js и поле files), опасные паттерны (innerHTML, eval), забытые таймеры.
// Ничего не меняет в проекте. Нужен только Node.js.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..').split('\\').join('/');
const problems = [];
const notes = [];
const add = (kind, where, text) => problems.push(`[${kind}] ${where}: ${text}`);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
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
  [/https?:\/\/(?!localhost|127\.0\.0\.1)/, 'внешний URL'],
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
  if (!knownSubjects.includes(m.subject)) add('МАНИФЕСТ', id, `неизвестный раздел ${m.subject}`);
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

// 8. Классы в CSS и JS: быстрый поиск мёртвых стилей и неопределённых переменных
const vars = new Set([...css.map(read).join('\n').matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));
for (const f of css) {
  for (const m of read(f).matchAll(/var\(--([\w-]+)/g)) if (!vars.has(m[1]) && !['i', 'x', 's', 'd'].includes(m[1])) add('CSS', rel(f), `переменная --${m[1]} нигде не определена`);
}

console.log(`JS-файлов: ${js.length}, CSS: ${css.length}, модулей: ${registry.length}`);
console.log(problems.length ? `\nНАЙДЕНО (${problems.length}):\n` + problems.join('\n') : '\nпроблем не найдено');
if (notes.length) console.log(`\nЗАМЕЧАНИЯ (${notes.length}):\n` + notes.join('\n'));
