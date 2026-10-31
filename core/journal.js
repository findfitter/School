// Журнал серий: по каждой серии заданий записывается, как она прошла (результат, уровни и время на каждое задание,
// ошибочные задания, брошена ли серия). Из журнала `core/report.js` собирает отчёт для родителя: его можно отдать
// Claude Code и получить рекомендации по усложнению заданий. Данные остаются на устройстве и никуда не отправляются.
// Лежит отдельно от основного сохранения (свой ключ), поэтому «Сбросить прогресс» журнал не стирает.

import { readJournalText, writeJournalText } from './storage.js';

const MAX_ENTRIES = 2000; // около полугода занятий; запись весит 150–300 байт
const MAX_TASK_MS = 180000; // пауза дольше 3 минут (ребёнок отошёл) в время задания не засчитывается целиком
const MAX_TASKS = 60;

const num = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Запись журнала: { t, id, sub, len, ok, done, sec, off, ch, tag, tasks: [[уровень, верно(1/0), мс], …], miss: [ключи] }
function cleanEntry(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : []).slice(0, MAX_TASKS).map((t) => (Array.isArray(t)
    ? [t[0] == null ? null : Math.round(num(t[0], 0, 99, 0)), t[1] ? 1 : 0, Math.round(num(t[2], 0, MAX_TASK_MS, 0))]
    : null)).filter(Boolean);
  return {
    t: Math.round(num(raw.t, 0, 4e12, Date.now())),
    id: raw.id.slice(0, 60),
    sub: typeof raw.sub === 'string' ? raw.sub.slice(0, 20) : '',
    len: Math.round(num(raw.len, 0, 200, 0)),
    ok: Math.round(num(raw.ok, 0, 200, 0)),
    done: raw.done ? 1 : 0,
    sec: Math.round(num(raw.sec, 0, 86400, 0)),
    off: Math.round(num(raw.off, 0, 50, 0)), // сколько «трудных» заданий предложили в этой серии
    ch: raw.ch ? 1 : 0, // сложное задание
    tag: typeof raw.tag === 'string' ? raw.tag.slice(0, 40) : '', // у сложного задания — его id (рассказ)
    tasks,
    miss: (Array.isArray(raw.miss) ? raw.miss : []).slice(0, 30).map((k) => String(k).slice(0, 80)),
  };
}

function load() {
  try {
    const raw = JSON.parse(readJournalText());
    return (Array.isArray(raw) ? raw : []).map(cleanEntry).filter(Boolean).slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

let entries = load();

function save() {
  writeJournalText(JSON.stringify(entries));
}

// Начало серии: возвращает сессию, в которую модуль через ctx.task() присылает результаты заданий.
export function begin({ id, subject = '', challenge = false }) {
  const now = Date.now();
  return { id, sub: subject, ch: challenge, start: now, last: now, tasks: [], closed: false };
}

// Одно задание завершено (первый заход, без повторов в конце серии): верно с первой попытки или нет.
export function task(session, { ok, level }) {
  if (!session || session.closed) return;
  const now = Date.now();
  const ms = Math.min(MAX_TASK_MS, Math.max(0, now - session.last));
  session.last = now;
  session.tasks.push([Number.isFinite(level) ? level : null, ok ? 1 : 0, ms]);
}

function push(session, extra) {
  session.closed = true;
  const entry = cleanEntry({
    t: session.start,
    id: session.id,
    sub: session.sub,
    ch: session.ch,
    sec: Math.min(86400, Math.round((Date.now() - session.start) / 1000)),
    tasks: session.tasks,
    ...extra,
  });
  if (!entry) return;
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
  save();
}

// Серия закончена: result — то, что модуль передал в ctx.finish (correct, total, mistakes, offered).
export function finish(session, result) {
  if (!session || session.closed) return;
  push(session, {
    len: result.total,
    ok: result.correct,
    done: true,
    off: Array.isArray(result.offered) ? result.offered.length : 0,
    miss: (result.mistakes || []).map((m) => m.key),
    tag: result.challengeId || '',
  });
}

// Ребёнок вышел до конца серии. Пустые заходы (ни одного задания) не записываются.
export function abandon(session) {
  if (!session || session.closed) return;
  session.closed = true;
  if (!session.tasks.length) return;
  push(session, {
    len: session.tasks.length,
    ok: session.tasks.filter((t) => t[1]).length,
    done: false,
    miss: [],
  });
}

export const all = () => entries.map((e) => ({ ...e }));
export const count = () => entries.length;

// Полная очистка журнала (кнопки в интерфейсе для неё нет: журнал нужен для отчётов за недели).
export function clear() {
  entries = [];
  save();
}
