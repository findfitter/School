// Настройки и прогресс в localStorage. Данные никуда не отправляются.

import { legacyUnlocked, stickerById } from './rewards.js';
import { cleanDecor, itemById, DECOR_SLOTS } from './dog-items.js';
import {
  cleanDog, dogPrice, applyDecay, clamp100, PACK_PRICE, FOOD_PACK, BAG_PACK, SHAMPOO_PACK, MAX_POOPS, FULL_AT, MAX_SKILL,
  ADULT_AGE, PUPPY_AFTER_MS, HAPPY_AT, SLEEP_FROM, SLEEP_MOOD, NAMES, PLAY_LIMIT_SEC,
} from './dogs.js';
import {
  PHASES, OPEN_PHASES, ZONE_IDS, REWARD_TYPES, ALL_DAYS, DEFAULT_MINUTES, MIN_MINUTES, MAX_MINUTES, HISTORY_DAYS, continuesStreak,
} from './mission-data.js';

const KEY = 'school-app-v1';
const APP_ID = 'school-app';
// Прежние id кругов -> новый id (математика раньше была двумя кругами).
const CYCLE_ALIASES = { arithmetic: 'math', numbers: 'math' };
const USAGE_KEEP_DAYS = 400; // сколько дней хранить статистику времени
// Версия данных о собаках: тестовые собаки, оставшиеся от прототипа (без этой версии), при чтении
// обнуляются один раз — рабочий экран собаки для ребёнка начинается с нуля.
const DOGS_VERSION = 2;

// «Сумка» собак: косточки, собаки и запасы. Одна — рабочая (в корне состояния, для ребёнка), другая — тестовая
// (state.test, для проверки новых возможностей в разделе для родителя); друг с другом они не связаны.
const emptyDogBag = () => ({ bones: 0, bonesSpent: 0, dogs: [], food: 0, bags: 0, shampoo: 0, items: [], decor: cleanDecor(), photos: [], together: 0, news: [], play: { day: '', sec: 0 } });

const CLEAN_SERIES_TO_FORGET = 3; // трудное задание забывается после стольких серий без ошибки в нём

const DEFAULT_SETTINGS = {
  seriesLength: 10,
  volume: 0.8,
  speechRate: 0.9,
  disabledModules: [],
  voices: { ru: '', de: '' }, // имя выбранного голоса; пусто — подбирать автоматически
  translation: false, // показывать русский перевод под английскими словами
  dailyLimit: 0, // ограничение времени в день, минуты (0 — без ограничения)
  // Ежедневная миссия «Уборка комнаты» (core/mission.js): по умолчанию выключена; days — дни недели (1 — пн … 7 — вс).
  mission: { enabled: false, minutes: DEFAULT_MINUTES, days: ALL_DAYS },
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/; // объявлено до `let state = load()`: normalize() вызывается уже при загрузке модуля
const MISSION_MAX_AHEAD_MS = 3600000; // таймер миссии не может кончаться позже, чем через час от «сейчас»
const emptyMission = (day = '') => ({
  day, phase: 'choose', zone: '', startedAt: 0, endsAt: 0, cleanedAt: 0, extra: 0, reward: null, streak: 0, lastDoneDay: '', history: {},
});

let state = load();

// Если приложение открыто в двух окнах (вкладка и установленное приложение), подхватываем
// изменения из другого окна, иначе следующее сохранение затёрло бы их старыми данными.
window.addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue) state = load();
});

function fresh() {
  return {
    settings: { ...DEFAULT_SETTINGS, disabledModules: [], voices: { ...DEFAULT_SETTINGS.voices }, mission: { ...DEFAULT_SETTINGS.mission, days: [...ALL_DAYS] } },
    mission: emptyMission(), // состояние миссии «Уборка комнаты» за день
    missionUsage: {}, // время на экранах миссии по дням (отдельно от usage): { 'ГГГГ-ММ-ДД': секунды }
    stars: 0,
    owned: [], // id купленных наклеек (каталог в rewards.js)
    spent: 0, // сколько звёзд потрачено в магазине
    usage: {}, // время в приложении по дням: { 'ГГГГ-ММ-ДД': секунды }
    bonus: {}, // дополнительные минуты к лимиту на конкретный день: { 'ГГГГ-ММ-ДД': минуты }
    supers: 0, // сколько супер-наклеек получено
    dogsVersion: DOGS_VERSION,
    test: emptyDogBag(), // тестовые косточки и собаки (раздел для родителя)
    bones: 0, // косточек заработано (за особое сложное задание), прототип
    bonesSpent: 0, // косточек потрачено на собак
    dogs: [], // купленные собаки: { id, name, breed, color, age, poops }
    food: 0, // банок корма в запасе
    bags: 0, // пакетиков для уборки в запасе
    challenges: { ready: false, milestone: 0, owed: 0, pending: {}, used: {} }, // сложные задания (core/challenges.js)
    cycles: {}, // круги: { <id круга>: [id модулей, пройденных в текущем круге] }
    progress: {},
    words: {}, // что ребёнок знает по словам: { 'ru:кот': { s: верных подряд, n: попыток, ok: верных, t: когда последний раз } }
    vocab: {}, // сколько слов в банке языка: { ru: 219 } (сообщают модули)
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
    level: Number.isFinite(Number(p.level)) && p.level !== null ? Math.round(num(p.level, 0, 20, 0)) : null, // уровень в конце последней серии
  };
}

// Сложные задания: ready — выданы ли первые; milestone — на какой «каждые 25 звёзд» уже посмотрели;
// owed — сколько заданий ещё должно появиться (когда нет свободного раздела); pending — ждущие задания
// по разделам { <предмет>: { seed } }; used — уже пройденные тексты по разделам.
function normalizeChallenges(c = {}) {
  const out = { ready: Boolean(c.ready), milestone: Math.round(num(c.milestone, 0, 1e5, 0)), owed: Math.round(num(c.owed, 0, 50, 0)), pending: {}, used: {} };
  for (const [subject, item] of Object.entries(c.pending || {})) {
    if (typeof subject === 'string' && item && Number.isFinite(Number(item.seed))) out.pending[subject] = { seed: Math.round(Number(item.seed)) };
  }
  for (const [subject, ids] of Object.entries(c.used || {})) {
    if (typeof subject === 'string' && Array.isArray(ids)) out.used[subject] = ids.filter((id) => typeof id === 'string').slice(-100);
  }
  return out;
}

// Фото двора: снимок собак (порода, цвет, возраст, наряд) и обстановки; рисуется заново, картинок не хранится.
function cleanPhoto(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.dogs)) return null;
  const dogs = raw.dogs.map(cleanDog).filter(Boolean).slice(0, 3);
  if (!dogs.length) return null;
  return { at: Number.isFinite(Number(raw.at)) ? Number(raw.at) : Date.now(), dogs, decor: cleanDecor(raw.decor) };
}

function normalizeDogBag(c = {}) {
  return {
    bones: Math.round(num(c.bones, 0, 1e6, 0)),
    bonesSpent: Math.round(num(c.bonesSpent, 0, 1e6, 0)),
    food: Math.round(num(c.food, 0, 9999, 0)),
    bags: Math.round(num(c.bags, 0, 9999, 0)),
    shampoo: Math.round(num(c.shampoo, 0, 9999, 0)),
    items: [...new Set((Array.isArray(c.items) ? c.items : []).filter((id) => itemById.has(id)))], // купленные вещи и обстановка
    decor: cleanDecor(c.decor), // что стоит во дворе: { house, bed, toy, plant, fun }
    photos: (Array.isArray(c.photos) ? c.photos : []).map(cleanPhoto).filter(Boolean).slice(-12), // фотоальбом
    play: { day: typeof c.play?.day === 'string' ? c.play.day : '', sec: num(c.play?.sec, 0, PLAY_LIMIT_SEC, 0) }, // сколько секунд игр потрачено в этот день
    together: Math.max(0, Number(c.together)) || 0, // с какого момента две взрослые собаки живут вдвоём (для щенка), 0 — нет
    news: (Array.isArray(c.news) ? c.news : []) // события, о которых ещё не сказали ребёнку (родился щенок)
      .filter((n) => n && n.type === 'puppy' && typeof n.dogId === 'string')
      .map((n) => ({ type: 'puppy', dogId: n.dogId, name: String(n.name ?? '').slice(0, 12) })).slice(-5),
    dogs: (Array.isArray(c.dogs) ? c.dogs : []).map(cleanDog).filter(Boolean).slice(0, 12),
  };
}

function normalizeMissionSettings(m) {
  const raw = m && typeof m === 'object' ? m : {};
  const days = Array.isArray(raw.days)
    ? [...new Set(raw.days.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b)
    : [...ALL_DAYS];
  return { enabled: Boolean(raw.enabled), minutes: Math.round(num(raw.minutes, MIN_MINUTES, MAX_MINUTES, DEFAULT_MINUTES)), days };
}

// Состояние миссии за день. Плохие значения становятся безопасными: зона — только из ZONES, время — в разумных пределах
// (таймер не кончается позже чем через час), фаза без нужных данных откатывается к выбору зоны.
function normalizeMission(raw) {
  const m = raw && typeof raw === 'object' ? raw : {};
  const now = Date.now();
  const out = emptyMission(DAY_RE.test(m.day) ? m.day : '');
  out.phase = PHASES.includes(m.phase) ? m.phase : 'choose';
  out.zone = ZONE_IDS.includes(m.zone) ? m.zone : '';
  out.startedAt = Math.round(num(m.startedAt, 0, now, 0));
  out.endsAt = Math.round(num(m.endsAt, 0, now + MISSION_MAX_AHEAD_MS, 0));
  out.cleanedAt = Math.round(num(m.cleanedAt, 0, now, 0));
  out.extra = Math.round(num(m.extra, 0, 99, 0));
  if (m.reward && typeof m.reward === 'object' && REWARD_TYPES.includes(m.reward.type)) {
    out.reward = { type: m.reward.type, amount: Math.round(num(m.reward.amount, 0, 9999, 0)) };
  }
  out.streak = Math.round(num(m.streak, 0, 9999, 0));
  out.lastDoneDay = DAY_RE.test(m.lastDoneDay) ? m.lastDoneDay : '';
  const days = Object.keys(m.history && typeof m.history === 'object' ? m.history : {}).filter((d) => DAY_RE.test(d)).sort().slice(-HISTORY_DAYS);
  for (const day of days) {
    const e = m.history[day];
    if (!e || (e.result !== 'done' && e.result !== 'skipped')) continue;
    out.history[day] = {
      zone: ZONE_IDS.includes(e.zone) ? e.zone : '',
      result: e.result,
      sec: Math.round(num(e.sec, 0, 86400, 0)),
      extra: Math.round(num(e.extra, 0, 99, 0)),
      paid: Math.round(num(e.paid, 0, 9999, 0)), // сколько звёзд ребёнок заплатила, чтобы пропустить уборку
    };
  }
  // Фаза без нужных данных (повреждённое сохранение) — снова выбор зоны.
  const broken = (m.phase === 'timer' && !(out.zone && out.startedAt && out.endsAt)) || (m.phase === 'wait' && !(out.zone && out.startedAt));
  if (broken) Object.assign(out, { phase: 'choose', zone: '', startedAt: 0, endsAt: 0, cleanedAt: 0 });
  return out;
}

function normalize(data) {
  const s = fresh();
  if (!data || typeof data !== 'object') return s;
  const d = data.settings || {};
  s.settings.seriesLength = Math.round(num(d.seriesLength, 3, 30, DEFAULT_SETTINGS.seriesLength));
  s.settings.volume = num(d.volume, 0, 1, DEFAULT_SETTINGS.volume);
  s.settings.speechRate = num(d.speechRate, 0.5, 1.5, DEFAULT_SETTINGS.speechRate);
  s.settings.translation = Boolean(d.translation);
  s.settings.dailyLimit = Math.round(num(d.dailyLimit, 0, 600, 0));
  s.settings.mission = normalizeMissionSettings(d.mission);
  s.mission = normalizeMission(data.mission);
  s.settings.disabledModules = Array.isArray(d.disabledModules)
    ? d.disabledModules.filter((id) => typeof id === 'string')
    : [];
  for (const lang of Object.keys(DEFAULT_SETTINGS.voices)) {
    const name = d.voices?.[lang];
    s.settings.voices[lang] = typeof name === 'string' ? name : '';
  }
  s.stars = Math.round(num(data.stars, 0, 1e6, 0));
  s.supers = Math.round(num(data.supers, 0, 1e6, 0));
  Object.assign(s, data.dogsVersion === DOGS_VERSION ? normalizeDogBag(data) : emptyDogBag());
  s.test = normalizeDogBag(data.test);
  s.dogsVersion = DOGS_VERSION;
  s.challenges = normalizeChallenges(data.dogsVersion === DOGS_VERSION ? data.challenges : {});
  const oldest = dayKey(new Date(Date.now() - USAGE_KEEP_DAYS * 86400000));
  for (const [day, minutes] of Object.entries(data.bonus || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day >= oldest) s.bonus[day] = Math.round(num(minutes, 0, 1440, 0));
  }
  for (const [day, seconds] of Object.entries(data.usage || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day >= oldest) s.usage[day] = num(seconds, 0, 86400, 0);
  }
  for (const [day, seconds] of Object.entries(data.missionUsage || {})) {
    if (DAY_RE.test(day) && day >= oldest) s.missionUsage[day] = num(seconds, 0, 86400, 0);
  }
  if (Array.isArray(data.owned)) {
    s.owned = [...new Set(data.owned.filter((id) => stickerById.has(id)))];
    s.spent = Math.round(num(data.spent, 0, 1e7, 0));
  } else {
    // Старый прогресс: первые наклейки выдавались сами по 5 звёзд — переносим их в коллекцию.
    const legacy = legacyUnlocked(s.stars);
    s.owned = Array.from({ length: legacy }, (_, i) => `base-${i}`);
    s.spent = legacy * 5;
  }
  for (const [oldId, done] of Object.entries(data.cycles || {})) {
    const id = CYCLE_ALIASES[oldId] || oldId;
    const modules = Array.isArray(done) ? done.filter((m) => typeof m === 'string') : [];
    s.cycles[id] = [...new Set([...(s.cycles[id] || []), ...modules])];
  }
  for (const [id, p] of Object.entries(data.progress || {})) s.progress[id] = normalizeProgress(p);
  for (const [key, w] of Object.entries(data.words || {})) {
    if (typeof key !== 'string' || key.length > 80 || !w || typeof w !== 'object') continue;
    s.words[key] = { s: Math.round(num(w.s, 0, 99, 0)), n: Math.round(num(w.n, 0, 9999, 0)), ok: Math.round(num(w.ok, 0, 9999, 0)), t: Math.round(num(w.t, 0, 4e12, 0)) };
  }
  for (const [ns, size] of Object.entries(data.vocab || {})) {
    if (typeof ns === 'string' && ns.length < 20) s.vocab[ns] = Math.round(num(size, 0, 99999, 0));
  }
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
    mission: { ...state.settings.mission, days: [...state.settings.mission.days] },
  };
}

// patch.mission можно передавать частично ({ enabled: true }): его поля сливаются с текущими.
export function setSettings(patch) {
  const next = { ...state.settings, ...patch };
  if (patch.mission) next.mission = { ...state.settings.mission, ...patch.mission };
  state = normalize({ ...state, settings: next });
  save();
}

export function stars() {
  return state.stars;
}

export function addStars(n) {
  state.stars += n;
  save();
}

// ---------- Время в приложении ----------

// Ключ дня по местному времени: «2026-10-28».
// Временные состояния интерфейса (например, выбранная глава на главном экране): живут, пока открыта вкладка,
// в сохранение прогресса не попадают.
export function uiState(key) {
  try {
    return sessionStorage.getItem(`school-ui-${key}`);
  } catch {
    return null;
  }
}

export function setUiState(key, value) {
  try {
    sessionStorage.setItem(`school-ui-${key}`, String(value));
  } catch {
    // без sessionStorage состояние просто не запоминается
  }
}

export function dayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addUsage(seconds, key = dayKey()) {
  state.usage[key] = Math.min(86400, (state.usage[key] || 0) + seconds);
  save();
}

// Дополнительное время на день сверх дневного лимита (родитель выдаёт его на экране «Родителям»).
export function bonusOn(key = dayKey()) {
  return state.bonus[key] || 0;
}

export function setBonus(minutes, key = dayKey()) {
  state.bonus[key] = Math.max(0, Math.min(1440, Math.round(minutes)));
  save();
}

// Лимит на сегодня в минутах: дневной лимит плюс дополнительное время (0 — без ограничения).
export function todayLimit() {
  const limit = state.settings.dailyLimit;
  return limit > 0 ? limit + bonusOn() : 0;
}

export function usageOn(key = dayKey()) {
  return state.usage[key] || 0;
}

// Последние count дней, сегодняшний первым: [{ key, date, seconds }].
export function usageDays(count) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dayKey(date);
    return { key, date, seconds: state.usage[key] || 0 };
  });
}

// ---------- Миссия «Уборка комнаты» (логика — core/mission.js) ----------

// Новый день — новая миссия: вчерашняя, не доведённая до конца, тихо сгорает; серия и история остаются.
function rollMission() {
  const today = dayKey();
  if (state.mission.day === today) return;
  const { streak, lastDoneDay, history } = state.mission;
  state.mission = { ...emptyMission(today), streak, lastDoneDay, history };
  save();
}

// Пробный запуск миссии из раздела для родителя («Проверить миссию»): состояние живёт только в памяти, в сохранение,
// историю, серию и время миссии ничего не попадает. Пока он идёт, mission()/setMission()/... работают с ним.
let missionTest = null;
export const missionTestOn = () => missionTest !== null;
export function startMissionTest() {
  missionTest = emptyMission(dayKey());
}
export function endMissionTest() {
  missionTest = null;
}

const copyMission = (m) => ({ ...m, reward: m.reward ? { ...m.reward } : null, history: Object.fromEntries(Object.entries(m.history).map(([d, e]) => [d, { ...e }])) });

export function mission() {
  if (missionTest) return copyMission(missionTest);
  rollMission();
  return copyMission(state.mission);
}

// Поменять поля состояния миссии за сегодня (переходы между фазами — в core/mission.js).
export function setMission(patch) {
  if (missionTest) {
    missionTest = normalizeMission({ ...missionTest, ...patch });
    return;
  }
  rollMission();
  state.mission = normalizeMission({ ...state.mission, ...patch });
  save();
}

// Подтверждение уборки одним действием: фаза done, подарок (reward = { type, amount }), серия и история.
// Возвращает false, если миссия сегодня уже закрыта (подарок второй раз не выдаётся).
export function completeMission(reward) {
  if (missionTest) {
    if (!OPEN_PHASES.includes(missionTest.phase)) return false;
    missionTest = normalizeMission({ ...missionTest, phase: 'done' });
    return true;
  }
  rollMission();
  const m = state.mission;
  if (!OPEN_PHASES.includes(m.phase)) return false;
  const today = dayKey();
  const now = Date.now();
  const end = m.cleanedAt || now;
  const sec = m.startedAt ? Math.max(0, Math.round((end - m.startedAt) / 1000)) : 0;
  const days = state.settings.mission.days;
  const streak = continuesStreak(m.lastDoneDay, today, days) ? m.streak + 1 : 1;
  const history = { ...m.history, [today]: { zone: m.zone, result: 'done', sec, extra: m.extra, paid: 0 } };
  state.mission = normalizeMission({ ...m, phase: 'done', reward: reward || null, streak, lastDoneDay: today, history });
  applyReward(state.mission.reward); // подарок выдаётся здесь же и один раз: повторно день уже не закрыть
  save();
  return true;
}

// Подарок за уборку (описан данными в core/mission-data.js): косточки, корм или звёзды рабочего набора ребёнка.
function applyReward(reward) {
  if (!reward || !(reward.amount > 0)) return;
  if (reward.type === 'bones') state.bones = Math.min(1e6, state.bones + reward.amount);
  else if (reward.type === 'food') state.food = Math.min(9999, state.food + reward.amount);
  else if (reward.type === 'stars') state.stars += reward.amount;
}

// Взрослый пропускает миссию на сегодня: подарка нет, серия не растёт (в истории — «пропуск»).
export function skipMission() {
  if (missionTest) {
    if (!OPEN_PHASES.includes(missionTest.phase)) return false;
    missionTest = normalizeMission({ ...missionTest, phase: 'skipped' });
    return true;
  }
  rollMission();
  const m = state.mission;
  if (!OPEN_PHASES.includes(m.phase)) return false;
  const today = dayKey();
  const history = { ...m.history, [today]: { zone: m.zone, result: 'skipped', sec: 0, extra: m.extra, paid: 0 } };
  state.mission = normalizeMission({ ...m, phase: 'skipped', history });
  save();
  return true;
}

// Ребёнок сама пропускает уборку за звёзды: cost списывается с баланса (spent растёт, заработанные звёзды и счётчик сложных
// заданий не уменьшаются). Подарка нет. false — миссия уже закрыта или звёзд не хватает. В пробном запуске ничего не тратится.
export function skipMissionPaid(cost) {
  if (missionTest) {
    if (!OPEN_PHASES.includes(missionTest.phase)) return false;
    missionTest = normalizeMission({ ...missionTest, phase: 'skipped' });
    return true;
  }
  rollMission();
  const m = state.mission;
  if (!OPEN_PHASES.includes(m.phase) || balance() < cost) return false;
  const today = dayKey();
  state.spent += cost;
  const history = { ...m.history, [today]: { zone: m.zone, result: 'skipped', sec: 0, extra: m.extra, paid: cost } };
  state.mission = normalizeMission({ ...m, phase: 'skipped', history });
  save();
  return true;
}

// Для тестировщика: открыть сегодняшнюю миссию заново (выбор зоны, таймер и запись в истории за сегодня стираются, серия
// пересчитывается по истории). Уже выданные косточка и потраченные звёзды не возвращаются.
export function reopenMission() {
  if (missionTest) return;
  rollMission();
  const m = state.mission;
  const today = dayKey();
  const history = { ...m.history };
  delete history[today];
  const done = Object.keys(history).filter((d) => history[d].result === 'done' && d < today).sort().reverse();
  let streak = 0;
  if (done.length) {
    streak = 1;
    const days = state.settings.mission.days;
    for (let i = 0; i + 1 < done.length && continuesStreak(done[i + 1], done[i], days); i++) streak += 1;
  }
  state.mission = normalizeMission({ day: today, phase: 'choose', streak, lastDoneDay: done[0] || '', history });
  save();
}

// Время на экранах миссии — отдельно от usage, чтобы миссия не съедала дневной лимит.
export function addMissionUsage(seconds, key = dayKey()) {
  if (missionTest) return;
  state.missionUsage[key] = Math.min(86400, (state.missionUsage[key] || 0) + seconds);
  save();
}

export function missionUsageOn(key = dayKey()) {
  return state.missionUsage[key] || 0;
}

// Последние count дней, сегодняшний первым: [{ key, date, seconds }].
export function missionUsageDays(count) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dayKey(date);
    return { key, date, seconds: state.missionUsage[key] || 0 };
  });
}

// Звёзд на счету: всего заработано минус потрачено в магазине.
export function balance() {
  return Math.max(0, state.stars - state.spent);
}

export function owned() {
  return [...state.owned];
}

// Покупка наклейки из каталога. Возвращает true, если хватило звёзд.
export function buySticker(id) {
  const sticker = stickerById.get(id);
  if (!sticker || state.owned.includes(id) || balance() < sticker.price) return false;
  state.owned.push(id);
  state.spent += sticker.price;
  save();
  return true;
}

// ---------- Косточки и собаки ----------
// dogApi('real') — рабочие (для ребёнка), dogApi('test') — тестовые (раздел для родителя, core/screens/dog.js).
const bagOf = (scope) => (scope === 'test' ? state.test : state);

export function dogApi(scope = 'real') {
  const bag = () => bagOf(scope);
  const balance = () => Math.max(0, bag().bones - bag().bonesSpent); // заработано минус потрачено

  // Упаковка корма (5 банок) или пакетиков (5 штук) за косточку. Возвращает true, если хватило косточек.
  const buyPack = (field, amount) => {
    if (balance() < PACK_PRICE) return false;
    bag().bonesSpent += PACK_PRICE;
    bag()[field] += amount;
    save();
    return true;
  };

  const newId = () => {
    let id = '';
    do id = `dog-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    while (bag().dogs.some((d) => d.id === id));
    return id;
  };

  // Раз в обращение: пересчёт показателей, дни рождения и щенок.
  // Щенок рождается, когда двое взрослых живут вдвоём дольше PUPPY_AFTER_MS и оба в хорошем настроении.
  function tick() {
    const b = bag();
    const now = Date.now();
    const parties = b.dogs.map((d) => d.party).join();
    for (const d of b.dogs) applyDecay(d, now);
    let changed = parties !== b.dogs.map((d) => d.party).join();
    const pair = b.dogs.length === 2 && b.dogs.every((d) => d.age >= ADULT_AGE);
    if (!pair) {
      if (b.together) { b.together = 0; changed = true; }
    } else if (!b.together) {
      b.together = now;
      changed = true;
    } else if (now - b.together >= PUPPY_AFTER_MS && b.dogs.every((d) => d.mood >= HAPPY_AT)) {
      const [a, c] = b.dogs;
      const taken = new Set(b.dogs.map((d) => d.name));
      const id = newId();
      const name = NAMES.find((n) => !taken.has(n)) || 'Малыш';
      const puppy = cleanDog({ id, name, breed: Math.random() < 0.5 ? a.breed : c.breed, color: Math.random() < 0.5 ? a.color : c.color, age: 0, fed: 70, mood: 90, dirt: 0, energy: 90 });
      b.dogs.push(puppy);
      b.together = 0;
      b.news.push({ type: 'puppy', dogId: id, name });
      changed = true;
    }
    if (changed) save();
  }

  return {
    bones: () => bag().bones,
    bonesBalance: balance,
    addBones(n = 1) {
      bag().bones = Math.min(1e6, bag().bones + Math.max(0, Math.round(n)));
      save();
    },
    // Собаки с пересчитанными за прошедшее время сытостью, настроением и чистотой.
    dogs: () => { tick(); return bag().dogs.map((d) => ({ ...applyDecay(d) })); },
    // Покупка собаки: цена зависит от того, сколько собак уже есть. Возвращает купленную собаку или null.
    buyDog(raw) {
      const price = dogPrice(bag().dogs.length);
      // id уникален, даже если две покупки случились в одну миллисекунду
      const id = newId();
      const dog = cleanDog({ ...raw, id });
      if (price == null || !dog || balance() < price) return null;
      bag().dogs.push(dog);
      bag().bonesSpent += price;
      save();
      return { ...dog };
    },
    food: () => bag().food,
    bags: () => bag().bags,
    buyFood: () => buyPack('food', FOOD_PACK),
    buyBags: () => buyPack('bags', BAG_PACK),
    // Покормить собаку: тратится банка корма, во дворе прибавляется одна какашка.
    // Возвращает false, если корма нет, собаки нет или двор не убран.
    feedDog(id) {
      const dog = bag().dogs.find((d) => d.id === id);
      if (!dog) return false;
      applyDecay(dog);
      if (bag().food < 1 || dog.poops >= MAX_POOPS || dog.fed >= FULL_AT) return false;
      bag().food -= 1;
      dog.poops += 1;
      dog.fed = clamp100(dog.fed + 45);
      dog.mood = clamp100(dog.mood + 8);
      save();
      return true;
    },
    // Убрать одну какашку: тратится один пакетик.
    cleanPoop(id) {
      const dog = bag().dogs.find((d) => d.id === id);
      if (!dog || bag().bags < 1 || dog.poops < 1) return false;
      bag().bags -= 1;
      dog.poops -= 1;
      save();
      return true;
    },
    shampoo: () => bag().shampoo,
    buyShampoo: () => buyPack('shampoo', SHAMPOO_PACK),
    // Изменить показатели собаки: delta = { fed, mood, dirt } (можно отрицательные), значения держатся в 0–100.
    // save = false — для частых мелочей (поглаживание), чтобы не писать на диск каждое касание.
    adjust(id, delta = {}, save_ = true) {
      const dog = bag().dogs.find((d) => d.id === id);
      if (!dog) return false;
      applyDecay(dog);
      for (const key of ['fed', 'mood', 'dirt', 'energy']) if (delta[key]) dog[key] = clamp100(dog[key] + delta[key]);
      if (save_) save();
      return true;
    },
    // Повторить трюк: навык растёт до MAX_SKILL; возвращает новый уровень (или -1, если собаки нет).
    practiceTrick(id, trick) {
      const dog = bag().dogs.find((d) => d.id === id);
      if (!dog || !(trick in dog.tricks)) return -1;
      dog.tricks[trick] = Math.min(MAX_SKILL, dog.tricks[trick] + 1);
      save();
      return dog.tricks[trick];
    },
    // Вещи и обстановка: покупка за косточки, надевание/расстановка бесплатно.
    items: () => [...bag().items],
    decor: () => ({ ...bag().decor }),
    buyItem(itemId) {
      const item = itemById.get(itemId);
      if (!item || bag().items.includes(itemId) || balance() < item.price) return false;
      bag().items.push(itemId);
      bag().bonesSpent += item.price;
      save();
      return true;
    },
    // Надеть вещь на собаку (id пустой — снять). Надеть можно только купленное.
    equip(dogId, slot, itemId) {
      const dog = bag().dogs.find((d) => d.id === dogId);
      const item = itemById.get(itemId);
      if (!dog || !(slot in dog.outfit)) return false;
      if (itemId && !(item && item.kind === 'outfit' && item.slot === slot && bag().items.includes(itemId))) return false;
      dog.outfit[slot] = itemId || '';
      save();
      return true;
    },
    // Поставить предмет во двор на его место (id пустой — убрать).
    place(slot, itemId) {
      const item = itemById.get(itemId);
      if (!DECOR_SLOTS.includes(slot)) return false;
      if (itemId && !(item && item.kind === 'decor' && item.slot === slot && bag().items.includes(itemId))) return false;
      bag().decor[slot] = itemId || '';
      save();
      return true;
    },
    // Фотоальбом.
    photos: () => bag().photos.map((p) => ({ ...p })),
    addPhoto(photo) {
      const clean = cleanPhoto({ ...photo, at: Date.now() });
      if (!clean) return false;
      bag().photos = [...bag().photos, clean].slice(-12);
      save();
      return true;
    },
    deletePhoto(index) {
      if (!(index >= 0 && index < bag().photos.length)) return false;
      bag().photos.splice(index, 1);
      save();
      return true;
    },
    // Время игр за сегодня (секунды): лимит PLAY_LIMIT_SEC в день, новый день — с нуля.
    playUsed() {
      const play = bag().play;
      return play.day === dayKey() ? play.sec : 0;
    },
    addPlay(seconds) {
      const play = bag().play;
      const today = dayKey();
      if (play.day !== today) { play.day = today; play.sec = 0; }
      play.sec = Math.min(PLAY_LIMIT_SEC, play.sec + Math.max(0, seconds));
      save();
    },
    // Уложить спать: бодрость восстанавливается, настроение растёт (в лежанке — сильнее).
    // false — собака не хочет спать (бодрости достаточно).
    sleepDog(id) {
      const dog = bag().dogs.find((d) => d.id === id);
      if (!dog) return false;
      applyDecay(dog);
      if (dog.energy >= SLEEP_FROM) return false;
      dog.energy = 100;
      dog.mood = clamp100(dog.mood + (bag().decor.bed ? SLEEP_MOOD.bed : SLEEP_MOOD.plain));
      save();
      return true;
    },
    // События для ребёнка (один раз): дни рождения и рождение щенка. Возвращает [{ type, dogId, name, age? }].
    takeNews() {
      tick();
      const b = bag();
      const out = [];
      for (const d of b.dogs) {
        if (d.party) { out.push({ type: 'birthday', dogId: d.id, name: d.name, age: d.party }); d.party = 0; }
      }
      out.push(...b.news);
      b.news = [];
      if (out.length) save();
      return out;
    },
    // Только для теста: «перематывает» время на несколько дней вперёд (дни рождения, щенок).
    shiftTime(days) {
      if (scope !== 'test') return;
      const ms = Math.max(0, days) * 86400000;
      for (const d of bag().dogs) d.grew -= ms;
      if (bag().together) bag().together -= ms;
      save();
    },
    // Помыть: тратится шампунь, собака чистая и довольная.
    washDog(id) {
      const dog = bag().dogs.find((d) => d.id === id);
      if (!dog || bag().shampoo < 1) return false;
      applyDecay(dog);
      bag().shampoo -= 1;
      dog.dirt = 0;
      dog.mood = clamp100(dog.mood + 15);
      save();
      return true;
    },
    // Начать сначала — только для тестовой «сумки»; рабочая так не сбрасывается.
    reset() {
      if (scope !== 'test') return;
      state.test = emptyDogBag();
      save();
    },
  };
}

// Рабочие косточки и собаки (для ребёнка) — короткие имена для меню и сложных заданий.
const real = dogApi('real');
export const bones = real.bones;
export const addBones = real.addBones;
export const bonesBalance = real.bonesBalance;

// ---------- Сложные задания ----------
export function challenges() {
  return normalizeChallenges(state.challenges);
}

export function setChallenges(next) {
  state.challenges = normalizeChallenges(next);
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

// ---------- Слова: что ребёнок знает, а что нет ----------
// Каждое слово (ключ вида «ru:кот», «de:Hund», «en:cat») помнит, сколько раз подряд оно решено верно с первой попытки (s).
// Ошибка обнуляет серию. Слово «знает» (known), когда верных подряд не меньше KNOWN_STREAK; пока не пришла пора
// повторить (через REVIEW_DAYS[s] дней), его в заданиях нет — вместо него идут новые и ещё не выученные слова.
export const KNOWN_STREAK = 2;
const REVIEW_DAYS = [0, 0, 14, 30, 60, 120];
const WORD_WEIGHT = { new: 3, learning: 4, due: 1.5, known: 0 };

export function wordInfo(key, now = Date.now()) {
  const w = state.words[key];
  if (!w || !w.n) return { status: 'new', streak: 0, n: 0, ok: 0 };
  if (w.s < KNOWN_STREAK) return { status: 'learning', streak: w.s, n: w.n, ok: w.ok };
  const due = now - w.t >= REVIEW_DAYS[Math.min(w.s, REVIEW_DAYS.length - 1)] * 86400000;
  return { status: due ? 'due' : 'known', streak: w.s, n: w.n, ok: w.ok };
}

export const wordWeight = (key, now = Date.now()) => WORD_WEIGHT[wordInfo(key, now).status];

export function recordWord(key, ok, now = Date.now()) {
  if (typeof key !== 'string' || !key || key.length > 80) return;
  const w = (state.words[key] ||= { s: 0, n: 0, ok: 0, t: 0 });
  w.n += 1;
  if (ok) {
    w.ok += 1;
    w.s = Math.min(99, w.s + 1);
  } else {
    w.s = 0;
  }
  w.t = now;
  save();
}

export function setVocabSize(ns, size) {
  if (state.vocab[ns] === size) return;
  state.vocab[ns] = size;
  save();
}

// Сводка по языку (префикс ключа «ru:»): сколько слов знает, на повторе, учит; total — размер банка (если известен).
export function wordSummary(ns, now = Date.now()) {
  const out = { known: 0, due: 0, learning: 0, seen: 0, total: state.vocab[ns] || 0 };
  for (const key of Object.keys(state.words)) {
    if (!key.startsWith(`${ns}:`)) continue;
    const { status } = wordInfo(key, now);
    if (status === 'new') continue;
    out.seen += 1;
    out[status] += 1;
  }
  return out;
}

// Все изученные слова языка: [{ word, status, n, ok }] — для отчёта.
export function wordList(ns, now = Date.now()) {
  return Object.keys(state.words)
    .filter((key) => key.startsWith(`${ns}:`))
    .map((key) => ({ word: key.slice(ns.length + 1), ...wordInfo(key, now) }))
    .filter((w) => w.status !== 'new');
}

// Трудные задания, которые стоит дать в этой серии: сначала самые частые ошибки.
export function hardToPractice(id, count = 2) {
  return Object.entries(moduleProgress(id).hard)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, count)
    .map(([key]) => key);
}

// offered — какие трудные задания модуль получил на эту серию: «чистой» серией считается только
// серия, в которой такое задание было предложено и решено без ошибки.
export function recordSeries(id, { correct, total, mistakes, offered, level }) {
  const p = (state.progress[id] ||= normalizeProgress());
  if (Number.isFinite(level)) p.level = level;
  p.series += 1;
  p.correct += correct;
  p.total += total;
  const wrong = new Set(mistakes.map((m) => m.key));
  for (const [key, item] of Object.entries(p.hard)) {
    if (wrong.has(key) || (offered && !offered.includes(key))) continue;
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

// Сброс прогресса: звёзды, наклейки, статистика, круги. Настройки родителя (лимит времени,
// громкость, выключенные модули…) сохраняются.
export function reset() {
  const keep = state.settings;
  const keepTest = state.test;
  state = fresh();
  state.settings = keep;
  state.test = keepTest; // тестовые собаки родителя не сбрасываются вместе с прогрессом ребёнка
  save();
}

// Журнал серий (core/journal.js) хранится отдельным ключом, чтобы не раздувать основное сохранение
// и не стираться кнопкой «Сбросить прогресс». Здесь только чтение и запись текста.
const JOURNAL_KEY = 'school-app-journal-v1';

export function readJournalText() {
  try {
    return localStorage.getItem(JOURNAL_KEY) || '[]';
  } catch {
    return '[]';
  }
}

export function writeJournalText(text) {
  try {
    localStorage.setItem(JOURNAL_KEY, text);
  } catch (err) {
    console.warn('Не удалось сохранить журнал', err);
  }
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
