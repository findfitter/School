// Настройки и прогресс в localStorage. Данные никуда не отправляются.

import { legacyUnlocked, stickerById } from './rewards.js';
import { cleanDecor, itemById, DECOR_SLOTS } from './dog-items.js';
import {
  cleanDog, dogPrice, applyDecay, clamp100, PACK_PRICE, FOOD_PACK, BAG_PACK, SHAMPOO_PACK, MAX_POOPS, FULL_AT, MAX_SKILL,
  ADULT_AGE, PUPPY_AFTER_MS, HAPPY_AT, SLEEP_FROM, SLEEP_MOOD, NAMES,
} from './dogs.js';

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
const emptyDogBag = () => ({ bones: 0, bonesSpent: 0, dogs: [], food: 0, bags: 0, shampoo: 0, items: [], decor: cleanDecor(), photos: [], together: 0, news: [] });

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
    together: Math.max(0, Number(c.together)) || 0, // с какого момента две взрослые собаки живут вдвоём (для щенка), 0 — нет
    news: (Array.isArray(c.news) ? c.news : []) // события, о которых ещё не сказали ребёнку (родился щенок)
      .filter((n) => n && n.type === 'puppy' && typeof n.dogId === 'string')
      .map((n) => ({ type: 'puppy', dogId: n.dogId, name: String(n.name ?? '').slice(0, 12) })).slice(-5),
    dogs: (Array.isArray(c.dogs) ? c.dogs : []).map(cleanDog).filter(Boolean).slice(0, 12),
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
  const keepTest = state.test;
  state = fresh();
  state.settings = keep;
  state.test = keepTest; // тестовые собаки родителя не сбрасываются вместе с прогрессом ребёнка
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
