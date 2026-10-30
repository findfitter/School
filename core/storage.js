// Настройки и прогресс в localStorage. Данные никуда не отправляются.

import { legacyUnlocked, stickerById } from './rewards.js';
import { cleanDog, dogPrice, PACK_PRICE, FOOD_PACK, BAG_PACK, MAX_POOPS } from './dogs.js';

const KEY = 'school-app-v1';
const APP_ID = 'school-app';
// Прежние id кругов -> новый id (математика раньше была двумя кругами).
const CYCLE_ALIASES = { arithmetic: 'math', numbers: 'math' };
const USAGE_KEEP_DAYS = 400; // сколько дней хранить статистику времени
const CLEAN_SERIES_TO_FORGET = 3; // трудное задание забывается после стольких серий без ошибки в нём

const DEFAULT_SETTINGS = {
  seriesLength: 10,
  volume: 0.8,
  speechRate: 0.9,
  disabledModules: [],
  voices: { ru: '', de: '' }, // имя выбранного голоса; пусто — подбирать автоматически
  translation: false, // показывать русский перевод под английскими словами
  dailyLimit: 0, // ограничение времени в день, минуты (0 — без ограничения)
};

let state = load();

// Если приложение открыто в двух окнах (вкладка и установленное приложение), подхватываем
// изменения из другого окна, иначе следующее сохранение затёрло бы их старыми данными.
window.addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue) state = load();
});

function fresh() {
  return {
    settings: { ...DEFAULT_SETTINGS, disabledModules: [], voices: { ...DEFAULT_SETTINGS.voices } },
    stars: 0,
    owned: [], // id купленных наклеек (каталог в rewards.js)
    spent: 0, // сколько звёзд потрачено в магазине
    usage: {}, // время в приложении по дням: { 'ГГГГ-ММ-ДД': секунды }
    bonus: {}, // дополнительные минуты к лимиту на конкретный день: { 'ГГГГ-ММ-ДД': минуты }
    supers: 0, // сколько супер-наклеек получено
    bones: 0, // косточек заработано (за особое сложное задание), прототип
    bonesSpent: 0, // косточек потрачено на собак
    dogs: [], // купленные собаки: { id, name, breed, color, age, poops }
    food: 0, // банок корма в запасе
    bags: 0, // пакетиков для уборки в запасе
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
  s.settings.translation = Boolean(d.translation);
  s.settings.dailyLimit = Math.round(num(d.dailyLimit, 0, 600, 0));
  s.settings.disabledModules = Array.isArray(d.disabledModules)
    ? d.disabledModules.filter((id) => typeof id === 'string')
    : [];
  for (const lang of Object.keys(DEFAULT_SETTINGS.voices)) {
    const name = d.voices?.[lang];
    s.settings.voices[lang] = typeof name === 'string' ? name : '';
  }
  s.stars = Math.round(num(data.stars, 0, 1e6, 0));
  s.supers = Math.round(num(data.supers, 0, 1e6, 0));
  s.bones = Math.round(num(data.bones, 0, 1e6, 0));
  s.bonesSpent = Math.round(num(data.bonesSpent, 0, 1e6, 0));
  s.food = Math.round(num(data.food, 0, 9999, 0));
  s.bags = Math.round(num(data.bags, 0, 9999, 0));
  s.dogs = (Array.isArray(data.dogs) ? data.dogs : []).map(cleanDog).filter(Boolean).slice(0, 12);
  const oldest = dayKey(new Date(Date.now() - USAGE_KEEP_DAYS * 86400000));
  for (const [day, minutes] of Object.entries(data.bonus || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day >= oldest) s.bonus[day] = Math.round(num(minutes, 0, 1440, 0));
  }
  for (const [day, seconds] of Object.entries(data.usage || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day >= oldest) s.usage[day] = num(seconds, 0, 86400, 0);
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

// ---------- Время в приложении ----------

// Ключ дня по местному времени: «2026-10-28».
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

// ---------- Косточки и собаки (прототип) ----------
export function bones() {
  return state.bones;
}

export function addBones(n = 1) {
  state.bones = Math.min(1e6, state.bones + Math.max(0, Math.round(n)));
  save();
}

// Косточек на счету: заработано минус потрачено на собак.
export function bonesBalance() {
  return Math.max(0, state.bones - state.bonesSpent);
}

export function dogs() {
  return state.dogs.map((d) => ({ ...d }));
}

// Покупка собаки: цена зависит от того, сколько собак уже есть. Возвращает купленную собаку или null.
export function buyDog(raw) {
  const price = dogPrice(state.dogs.length);
  const dog = cleanDog({ ...raw, id: `dog-${Date.now().toString(36)}` });
  if (price == null || !dog || bonesBalance() < price) return null;
  state.dogs.push(dog);
  state.bonesSpent += price;
  save();
  return { ...dog };
}

export function food() {
  return state.food;
}

export function bags() {
  return state.bags;
}

// Упаковка корма (5 банок) или пакетиков (5 штук) за косточку. Возвращает true, если хватило косточек.
function buyPack(field, amount) {
  if (bonesBalance() < PACK_PRICE) return false;
  state.bonesSpent += PACK_PRICE;
  state[field] += amount;
  save();
  return true;
}

export const buyFood = () => buyPack('food', FOOD_PACK);
export const buyBags = () => buyPack('bags', BAG_PACK);

// Покормить собаку: тратится банка корма, во дворе прибавляется одна какашка.
// Возвращает false, если корма нет, собаки нет или двор не убран.
export function feedDog(id) {
  const dog = state.dogs.find((d) => d.id === id);
  if (!dog || state.food < 1 || dog.poops >= MAX_POOPS) return false;
  state.food -= 1;
  dog.poops += 1;
  save();
  return true;
}

// Убрать одну какашку: тратится один пакетик.
export function cleanPoop(id) {
  const dog = state.dogs.find((d) => d.id === id);
  if (!dog || state.bags < 1 || dog.poops < 1) return false;
  state.bags -= 1;
  dog.poops -= 1;
  save();
  return true;
}

// Только для прототипа: вернуть косточки, запасы и собак в начальное состояние.
export function resetDogs() {
  state.bones = 0;
  state.bonesSpent = 0;
  state.dogs = [];
  state.food = 0;
  state.bags = 0;
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

// Трудные задания, которые стоит дать в этой серии: сначала самые частые ошибки.
export function hardToPractice(id, count = 2) {
  return Object.entries(moduleProgress(id).hard)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, count)
    .map(([key]) => key);
}

// offered — какие трудные задания модуль получил на эту серию: «чистой» серией считается только
// серия, в которой такое задание было предложено и решено без ошибки.
export function recordSeries(id, { correct, total, mistakes, offered }) {
  const p = (state.progress[id] ||= normalizeProgress());
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
  state = fresh();
  state.settings = keep;
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
