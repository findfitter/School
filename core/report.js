// Отчёт для анализа: из журнала серий (core/journal.js) собирается один markdown-файл — сводка по всем модулям,
// недели, уровни, частые ошибки, время по дням и сырые строки за 28 дней. Файл отдают Claude Code, чтобы он
// оценил, насколько легки задания, и предложил усложнения. Тексты — в STR.report (core/strings.js).

import { STR } from './strings.js';
import { format } from './dom.js';
import * as storage from './storage.js';
import * as journal from './journal.js';

const R = STR.report;
const DAY_MS = 86400000;
const MIN_TASKS = 20; // меньше заданий — вывод ненадёжен
const RAW_DAYS = 28;
const RAW_MAX_ROWS = 800;
const NO_SERIES = new Set(['english-words']); // знакомство со словами: серий и проверок нет, в журнал не пишет

const pad = (n) => String(n).padStart(2, '0');
const dateOf = (t) => storage.dayKey(new Date(t));
const timeOf = (t) => `${pad(new Date(t).getHours())}:${pad(new Date(t).getMinutes())}`;
const pct = (ok, n) => (n ? `${Math.round((ok / n) * 100)}%` : '—');
const sec1 = (ms) => (Math.round(ms / 100) / 10).toString();

function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Понедельник недели, в которую попадает момент t («2026-10-26»).
function weekStart(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return storage.dayKey(d);
}

const csv = (value) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Итог по набору серий одного модуля.
function stats(list) {
  const done = list.filter((e) => e.done);
  const tasks = list.flatMap((e) => e.tasks);
  const sumOk = done.reduce((n, e) => n + e.ok, 0);
  const sumLen = done.reduce((n, e) => n + e.len, 0);
  const times = tasks.map((t) => t[2]).filter((ms) => ms > 0);
  return { list, done, tasks, sumOk, sumLen, times, abandoned: list.length - done.length };
}

function verdict(s) {
  if (s.sumLen < MIN_TASKS) return R.verdict.few;
  const acc = s.sumOk / s.sumLen;
  const abandonedShare = s.list.length ? s.abandoned / s.list.length : 0;
  if (acc < 0.6 || abandonedShare > 0.3) return R.verdict.hard;
  if (acc >= 0.93) return R.verdict.easy;
  if (acc >= 0.7) return R.verdict.ok;
  return R.verdict.border;
}

function levelsLine(tasks) {
  const byLevel = new Map();
  for (const [level, ok] of tasks) {
    const key = level == null ? '?' : level;
    const item = byLevel.get(key) || { n: 0, ok: 0 };
    item.n += 1;
    item.ok += ok;
    byLevel.set(key, item);
  }
  return [...byLevel.entries()]
    .sort((a, b) => (a[0] === '?' ? 1 : b[0] === '?' ? -1 : a[0] - b[0]))
    .map(([level, { n, ok }]) => `L${level}: ${n} (${pct(ok, n)})`)
    .join(' · ');
}

function endLevelsLine(list) {
  const counts = new Map();
  for (const e of list) {
    const last = e.tasks[e.tasks.length - 1];
    if (!last || last[0] == null) continue;
    counts.set(last[0], (counts.get(last[0]) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([level, n]) => `L${level}: ${n}`).join(' · ');
}

function weeklyLine(done) {
  const weeks = new Map();
  for (const e of done) {
    const key = weekStart(e.t);
    const item = weeks.get(key) || { ok: 0, len: 0, n: 0 };
    item.ok += e.ok;
    item.len += e.len;
    item.n += 1;
    weeks.set(key, item);
  }
  return [...weeks.entries()].sort().slice(-8).map(([key, w]) => `${key}: ${pct(w.ok, w.len)}, ${w.n}`).join(' · ');
}

function mistakesLine(done, labelOf) {
  const counts = new Map();
  for (const e of done) for (const key of e.miss) counts.set(key, (counts.get(key) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return top.length ? top.map(([key, n]) => `${labelOf(key)} ×${n}`).join(' · ') : R.noMistakes;
}

export function hasData() {
  return journal.count() > 0;
}

export function buildReport(app, now = Date.now()) {
  const entries = journal.all();
  const manifests = app.manifests;
  const out = [];
  const regular = entries.filter((e) => !e.ch);
  const challenges = entries.filter((e) => e.ch);
  const recentFrom = now - 14 * DAY_MS;

  const doneAll = entries.filter((e) => e.done).length;
  out.push(`# ${R.title}`, '');
  out.push(format(R.created, {
    date: `${dateOf(now)} (${R.weekdays[new Date(now).getDay()]})`,
    first: entries.length ? dateOf(entries[0].t) : '—',
    last: entries.length ? dateOf(entries[entries.length - 1].t) : '—',
    series: entries.length,
    done: doneAll,
    abandoned: entries.length - doneAll,
  }), '');
  out.push(...R.intro, '');
  out.push(`## ${R.contextTitle}`, ...R.context.map((line) => `- ${line}`), '');
  out.push(`## ${R.readTitle}`, ...R.read.map((line) => `- ${line}`), '');
  out.push(`## ${R.askTitle}`, ...R.ask.map((line, i) => `${i + 1}. ${line}`), '');

  // ---------- Сводка по разделам и модулям ----------
  out.push(`## ${R.summaryTitle}`, '');
  const notStarted = [];
  const details = [];
  for (const subject of STR.subjectOrder) {
    const mods = manifests.filter((m) => m.subject === subject && !NO_SERIES.has(m.id));
    if (!mods.length) continue;
    out.push(`### ${STR.subjects[subject].icon} ${STR.subjects[subject].title}`, '');
    const rows = [];
    for (const m of mods) {
      const list = regular.filter((e) => e.id === m.id);
      if (!list.length) {
        notStarted.push(m.title);
        continue;
      }
      const all = stats(list);
      const recent = stats(list.filter((e) => e.t >= recentFrom));
      const med = quantile(all.times, 0.5);
      const p90 = quantile(all.times, 0.9);
      rows.push(`| ${m.title} (\`${m.id}\`) | ${list.length} / ${recent.list.length} | ${pct(all.sumOk, all.sumLen)} | ${pct(recent.sumOk, recent.sumLen)} | ${med == null ? '—' : `${sec1(med)} / ${sec1(p90)}`} | ${all.abandoned} | ${verdict(all)} |`);

      const hard = storage.moduleProgress(m.id).hard;
      const labelOf = (key) => hard[key]?.label || key;
      details.push([m, all, labelOf, hard]);
    }
    if (rows.length) out.push(`| ${R.tableHead.join(' | ')} |`, `|${R.tableHead.map(() => '---').join('|')}|`, ...rows);
    else out.push(R.noData);
    out.push('');
  }
  if (notStarted.length) out.push(format(R.notStarted, { list: notStarted.join(', ') }), '');

  // ---------- Подробности ----------
  out.push(`## ${R.detailsTitle}`, '');
  for (const [m, all, labelOf, hard] of details) {
    out.push(`### ${m.title} (\`${m.id}\`)`);
    out.push(`- ${R.levels}: ${levelsLine(all.tasks) || '—'}`);
    out.push(`- ${R.levelsEnd}: ${endLevelsLine(all.list) || '—'}`);
    out.push(`- ${R.weekly}: ${weeklyLine(all.done) || '—'}`);
    out.push(`- ${R.mistakes}: ${mistakesLine(all.done, labelOf)}`);
    const hardList = Object.entries(hard).sort((a, b) => b[1].count - a[1].count).slice(0, 6);
    if (hardList.length) out.push(`- ${R.hard}: ${hardList.map(([key, h]) => `${h.label || key} (${h.count})`).join(' · ')}`);
    out.push('');
  }

  // ---------- Сложные задания ----------
  if (challenges.length) {
    out.push(`## ${R.challengeTitle}`, '');
    for (const subject of STR.subjectOrder) {
      const list = challenges.filter((e) => e.sub === subject);
      if (!list.length) continue;
      const okN = list.filter((e) => e.ok).length;
      const wrong = list.filter((e) => !e.ok).map((e) => e.tag || e.miss[0] || '?');
      out.push(`- ${format(R.challengeRow, { subject: STR.subjects[subject].title, n: list.length, ok: pct(okN, list.length) })}${wrong.length ? `; ${format(R.challengeWrong, { list: wrong.join(', ') })}` : ''}`);
    }
    out.push('');
  }

  // ---------- Время по дням ----------
  out.push(`## ${R.timeTitle}`, '');
  const days = storage.usageDays(RAW_DAYS);
  const seriesByDay = new Map();
  for (const e of entries) seriesByDay.set(dateOf(e.t), (seriesByDay.get(dateOf(e.t)) || 0) + 1);
  const sums = { wd: 0, we: 0, dwd: 0, dwe: 0 };
  const rows = days.filter(({ key, seconds }) => seconds >= 30 || seriesByDay.has(key)).map(({ key, date, seconds }) => {
    const minutes = Math.round(seconds / 60);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (minutes > 0) {
      sums[weekend ? 'we' : 'wd'] += minutes;
      sums[weekend ? 'dwe' : 'dwd'] += 1;
    }
    return format(R.dayRow, { date: key, wd: R.weekdays[date.getDay()], min: minutes, n: seriesByDay.get(key) || 0 });
  });
  out.push(...rows.reverse().map((r) => `- ${r}`), '');
  out.push(format(R.timeAvg, {
    wd: sums.dwd ? Math.round(sums.wd / sums.dwd) : 0,
    we: sums.dwe ? Math.round(sums.we / sums.dwe) : 0,
    dwd: sums.dwd,
    dwe: sums.dwe,
  }), '');

  // ---------- Сырые данные ----------
  out.push(`## ${R.rawTitle}`, '', R.rawNote, '', '```csv', R.rawHead);
  const raw = entries.filter((e) => e.t >= now - RAW_DAYS * DAY_MS).slice(-RAW_MAX_ROWS);
  for (const e of raw) {
    const module = e.ch ? `challenge${e.tag ? `:${e.tag}` : ''}` : e.id;
    out.push([
      dateOf(e.t), timeOf(e.t), module, e.sub, e.len, e.ok, e.done, e.sec,
      e.tasks.map((t) => (t[0] == null ? '-' : t[0])).join(';'),
      e.tasks.map((t) => t[1]).join(';'),
      e.tasks.map((t) => sec1(t[2])).join(';'),
      e.miss.join('|'),
    ].map(csv).join(','));
  }
  out.push('```', '');
  return out.join('\n');
}

export function reportFileName(now = Date.now()) {
  return format(R.fileName, { date: dateOf(now) });
}
