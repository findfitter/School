// Настройки и прогресс в localStorage. Данные никуда не отправляются.

const KEY = 'school-app-v1';
const APP_ID = 'school-app';
const CLEAN_SERIES_TO_FORGET = 3; // трудное задание забывается после стольких серий без ошибки в нём

const DEFAULT_SETTINGS = {
  seriesLength: 10,
  volume: 0.8,
  speechRate: 0.9,
  disabledModules: [],
  voices: { ru: '', de: '' }, // имя выбранного голоса; пусто — подбирать автоматически
};

let state = load();

function fresh() {
  return {
    settings: { ...DEFAULT_SETTINGS, disabledModules: [], voices: { ...DEFAULT_SETTINGS.voices } },
    stars: 0,
    supers: 0, // сколько супер-наклеек получено
    cycles: {}, // круги: { <id круга>: [id модулей, пройденных в текущем круге] }
    progress: {},
  };
}

function num(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function normalizeProgress(p = {}) {
  const hard = {};
  for (const [key, item] of Object.entries(p.hard || {})) {
    hard[key] = {
      label: String(item?.label ?? key),
      count: Math.round(num(item?.count, 1, 9999, 1)),
      clean: Math.round(num(item?.clean, 0, 99, 0)),
    };
  }
  return {
    series: Math.round(num(p.series, 0, 1e6, 0)),
    correct: Math.round(num(p.correct, 0, 1e7, 0)),
    total: Math.round(num(p.total, 0, 1e7, 0)),
    hard,
  };
}

function normalize(data) {
  const s = fresh();
  if (!data || typeof data !== 'object') return s;
  const d = data.settings || {};
  s.settings.seriesLength = Math.round(num(d.seriesLength, 3, 30, DEFAULT_SETTINGS.seriesLength));
  s.settings.volume = num(d.volume, 0, 1, DEFAULT_SETTINGS.volume);
  s.settings.speechRate = num(d.speechRate, 0.5, 1.5, DEFAULT_SETTINGS.speechRate);
  s.settings.disabledModules = Array.isArray(d.disabledModules)
    ? d.disabledModules.filter((id) => typeof id === 'string')
    : [];
  for (const lang of Object.keys(DEFAULT_SETTINGS.voices)) {
    const name = d.voices?.[lang];
    s.settings.voices[lang] = typeof name === 'string' ? name : '';
  }
  s.stars = Math.round(num(data.stars, 0, 1e6, 0));
  s.supers = Math.round(num(data.supers, 0, 1e6, 0));
  for (const [id, done] of Object.entries(data.cycles || {})) {
    s.cycles[id] = Array.isArray(done) ? done.filter((m) => typeof m === 'string') : [];
  }
  for (const [id, p] of Object.entries(data.progress || {})) s.progress[id] = normalizeProgress(p);
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (err) {
    console.warn('Не удалось прочитать сохранение', err);
  }
  return fresh();
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Не удалось сохранить', err);
  }
}

export function settings() {
  return {
    ...state.settings,
    disabledModules: [...state.settings.disabledModules],
    voices: { ...state.settings.voices },
  };
}

export function setSettings(patch) {
  state = normalize({ ...state, settings: { ...state.settings, ...patch } });
  save();
}

export function stars() {
  return state.stars;
}

export function addStars(n) {
  state.stars += n;
  save();
}

export function supers() {
  return state.supers;
}

export function addSuper() {
  state.supers += 1;
  save();
}

// Модули, пройденные в текущем круге.
export function cycleDone(cycleId) {
  return [...(state.cycles[cycleId] || [])];
}

export function markCycleDone(cycleId, moduleId) {
  const done = (state.cycles[cycleId] ||= []);
  if (!done.includes(moduleId)) done.push(moduleId);
  save();
}

export function resetCycle(cycleId) {
  state.cycles[cycleId] = [];
  save();
}

export function moduleProgress(id) {
  return state.progress[id] || normalizeProgress();
}

export function hardKeys(id) {
  return Object.keys(moduleProgress(id).hard);
}

export function recordSeries(id, { correct, total, mistakes }) {
  const p = (state.progress[id] ||= normalizeProgress());
  p.series += 1;
  p.correct += correct;
  p.total += total;
  const wrong = new Set(mistakes.map((m) => m.key));
  for (const [key, item] of Object.entries(p.hard)) {
    if (wrong.has(key)) continue;
    item.clean += 1;
    if (item.clean >= CLEAN_SERIES_TO_FORGET) delete p.hard[key];
  }
  for (const m of mistakes) {
    const item = (p.hard[m.key] ||= { label: m.label, count: 0, clean: 0 });
    item.label = m.label;
    item.count += 1;
    item.clean = 0;
  }
  save();
}

export function reset() {
  state = fresh();
  save();
}

export function exportJson() {
  return JSON.stringify({ app: APP_ID, version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
}

export function importJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.app !== APP_ID || typeof parsed.data !== 'object') {
    throw new Error('Неверный формат файла');
  }
  state = normalize(parsed.data);
  save();
}
