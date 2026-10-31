import { cleanOutfit, outfitSvg } from './dog-items.js';

// Собаки — награда за косточки (🦴). Косточки даются за особое сложное задание (схема появления — позже).
// Здесь: цены, породы, цвета, имена, возраст и рисунок собаки (SVG собирается кодом, внешних картинок нет).

// Цены собак по порядку покупки: 3, 5, 10 косточек. Если разрешить больше собак, дальше цена растёт на 5
// (15, 20, 25…). Сейчас собак не больше трёх (на столько мест во дворе).
export const DOG_PRICES = [3, 5, 10];
export const MAX_DOGS = DOG_PRICES.length;
export const MAX_AGE = 15;

// Корм и пакетики: одна косточка — одна упаковка из 5. Больше MAX_POOPS какашек у одной собаки не бывает:
// пока их не уберут, кормить её нельзя (так двор не заполнится).
export const PACK_PRICE = 1;
export const FOOD_PACK = 5;
export const BAG_PACK = 5;
export const MAX_POOPS = 4;

// Шампунь: одна косточка — упаковка из 3 штук (мытьё тратит один шампунь).
export const SHAMPOO_PACK = 3;

// ---------- Сытость, настроение, чистота (0–100) ----------
// Меняются со временем: собака голодает, скучает и пачкается. Наказаний нет: грустная собака просто просит внимания.
export const FULL_AT = 85; // сытее — не ест
export const HUNGRY_AT = 25; // голоднее — просит есть и не хочет играть
export const HAPPY_AT = 65; // настроение выше — радуется
export const SAD_AT = 35; // настроение ниже — грустит
export const DIRTY_AT = 40; // грязнее — видны пятна
export const WASH_FROM = 15; // мыть имеет смысл, когда грязнее
const PER_MINUTE = { fed: -0.17, mood: -0.1, dirt: 0.07, energy: -0.1 }; // изменение за минуту реального времени
// Бодрость (0–100): падает со временем и от активных игр; сон возвращает её. Уставшая собака не хочет бегать.
export const TIRED_AT = 20; // бодрость ниже — собака устала, играть не хочет
export const SLEEP_FROM = 70; // бодрость ниже — собака согласна лечь спать
export const SLEEP_MOOD = { plain: 6, bed: 12 }; // сколько настроения даёт сон (в лежанке — больше)
export const ENERGY_COST = { ball: 8, hide: 6, walk: 12 }; // сколько бодрости забирает игра

// Рост: раз в BIRTHDAY_DAYS дней собаке прибавляется год (день рождения), до GROW_MAX_AGE. Считается по реальному времени.
// Время игр (вкладка «Играть») ограничено: не больше PLAY_LIMIT_SEC секунд в день. На тестовом экране лимита нет.
export const PLAY_LIMIT_SEC = 180;

export const BIRTHDAY_DAYS = 4;
export const GROW_MAX_AGE = 6;
const DAY_MS = 86400000;
const BIRTHDAY_MS = BIRTHDAY_DAYS * DAY_MS;

// Щенки: две взрослые собаки живут вместе PUPPY_DAYS дней и обе в хорошем настроении — рождается щенок (занимает третье место).
export const ADULT_AGE = 2;
export const PUPPY_DAYS = 5;
export const PUPPY_AFTER_MS = PUPPY_DAYS * DAY_MS;
const MAX_AWAY_MIN = 720; // за долгое отсутствие считается не больше 12 часов

export const clamp100 = (n) => Math.min(100, Math.max(0, n));
export const moodState = (mood) => (mood >= HAPPY_AT ? 'happy' : mood < SAD_AT ? 'sad' : 'ok');

// Пересчитывает показатели собаки за прошедшее время (меняет объект на месте).
export function applyDecay(dog, now = Date.now()) {
  const minutes = Math.min(MAX_AWAY_MIN, Math.max(0, (now - dog.updated) / 60000));
  if (minutes > 0) {
    const moodRate = PER_MINUTE.mood * (dog.fed < HUNGRY_AT ? 1.5 : 1) * (dog.dirt > 70 ? 1.3 : 1);
    dog.fed = clamp100(dog.fed + PER_MINUTE.fed * minutes);
    dog.mood = clamp100(dog.mood + moodRate * minutes);
    dog.dirt = clamp100(dog.dirt + PER_MINUTE.dirt * minutes);
    dog.energy = clamp100(dog.energy + PER_MINUTE.energy * minutes);
  }
  // День рождения: собака растёт; party — какой возраст ещё не отпраздновали (экран собаки покажет поздравление).
  if (dog.age < GROW_MAX_AGE) {
    while (dog.age < GROW_MAX_AGE && now - dog.grew >= BIRTHDAY_MS) {
      dog.age += 1;
      dog.grew += BIRTHDAY_MS;
      dog.party = dog.age;
    }
  } else {
    dog.grew = now;
  }
  dog.updated = now;
  return dog;
}

// Трюки: собака учится им повторением (навык 0–5). Выучено — с 3. Сложные открываются, когда выучены простые.
export const TRICKS = [
  { id: 'sit', icon: '🪑', title: 'Сидеть', needs: [] },
  { id: 'paw', icon: '🤝', title: 'Лапу', needs: [] },
  { id: 'speak', icon: '🗣️', title: 'Голос', needs: [] },
  { id: 'spin', icon: '🔄', title: 'Крутись', needs: ['sit', 'paw'] },
  { id: 'dance', icon: '💃', title: 'Танцуй', needs: ['spin', 'speak'] },
];
export const MAX_SKILL = 5;
export const KNOWN_AT = 3;
export const trickById = new Map(TRICKS.map((t) => [t.id, t]));
const emptyTricks = () => Object.fromEntries(TRICKS.map((t) => [t.id, 0]));
export const trickKnown = (dog, id) => (dog.tricks?.[id] ?? 0) >= KNOWN_AT;
export const trickUnlocked = (dog, id) => trickById.get(id).needs.every((need) => trickKnown(dog, need));

export const dogPrice = (ownedCount) => (ownedCount < MAX_DOGS ? DOG_PRICES[ownedCount] : null);

export const BREEDS = [
  { id: 'labrador', name: 'Лабрадор' },
  { id: 'shepherd', name: 'Овчарка' },
  { id: 'poodle', name: 'Пудель' },
  { id: 'dachshund', name: 'Такса' },
  { id: 'husky', name: 'Хаски' },
  { id: 'whippet', name: 'Уиппет' },
];

export const COLORS = [
  { id: 'ginger', name: 'Рыжий', hex: '#d98324' },
  { id: 'gold', name: 'Золотистый', hex: '#e9c46a' },
  { id: 'cream', name: 'Кремовый', hex: '#f0d9b5' },
  { id: 'brown', name: 'Шоколадный', hex: '#7a4a2a' },
  { id: 'black', name: 'Чёрный', hex: '#34312f' },
  { id: 'grey', name: 'Серый', hex: '#9ba3ab' },
  { id: 'white', name: 'Белый', hex: '#f6f1e7' },
  { id: 'pink', name: 'Розовый', hex: '#f4a6c8' },
  { id: 'blue', name: 'Голубой', hex: '#7db7f0' },
];

export const NAMES = ['Бобик', 'Рекс', 'Лаки', 'Шарик', 'Тоша', 'Белка', 'Мася', 'Луна', 'Рыжик', 'Снежок'];
export const NAME_MAX = 12;

export const breedById = new Map(BREEDS.map((b) => [b.id, b]));
export const colorById = new Map(COLORS.map((c) => [c.id, c]));

// «0 — щенок», «1 год», «2 года», «5 лет».
export function ageLabel(age) {
  if (age <= 0) return 'щенок';
  const last = age % 10;
  const tens = age % 100;
  if (tens >= 11 && tens <= 14) return `${age} лет`;
  if (last === 1) return `${age} год`;
  if (last >= 2 && last <= 4) return `${age} года`;
  return `${age} лет`;
}

const stat = (value, fallback) => (Number.isFinite(Number(value)) ? clamp100(Number(value)) : fallback);

// Проверка собаки из сохранения: только известные породы и цвета, имя без лишнего.
export function cleanDog(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!breedById.has(raw.breed) || !colorById.has(raw.color)) return null;
  const name = String(raw.name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!name) return null;
  const age = Math.round(Number(raw.age));
  return {
    id: typeof raw.id === 'string' ? raw.id : `dog-${Math.random().toString(36).slice(2, 8)}`,
    name,
    breed: raw.breed,
    color: raw.color,
    age: Number.isFinite(age) ? Math.min(MAX_AGE, Math.max(0, age)) : 1,
    poops: Math.min(MAX_POOPS, Math.max(0, Math.round(Number(raw.poops)) || 0)), // сколько какашек во дворе
    fed: stat(raw.fed, 70), // сытость 0–100
    mood: stat(raw.mood, 80), // настроение 0–100
    dirt: stat(raw.dirt, 0), // грязь 0–100
    energy: stat(raw.energy, 80), // бодрость 0–100
    grew: Number.isFinite(Number(raw.grew)) ? Number(raw.grew) : Date.now(), // когда был последний день рождения
    party: Math.min(MAX_AGE, Math.max(0, Math.round(Number(raw.party)) || 0)), // возраст, который ещё не поздравили (0 — нет)
    updated: Number.isFinite(Number(raw.updated)) ? Number(raw.updated) : Date.now(), // когда пересчитывали показатели
    outfit: cleanOutfit(raw.outfit), // что надето: { hat, glasses, collar, extra }
    tricks: Object.fromEntries(TRICKS.map((t) => [t.id, Math.min(MAX_SKILL, Math.max(0, Math.round(Number(raw.tricks?.[t.id])) || 0))])),
  };
}

// ---------- Рисунок собаки ----------
function mix(hex, other, t) {
  const a = hex.replace('#', '');
  const b = other.replace('#', '');
  const channel = (i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
  return `#${[0, 2, 4].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`;
}

const luminance = (hex) => {
  const v = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return 0.2126 * v(1) + 0.7152 * v(3) + 0.0722 * v(5);
};

// Рисунок по design/sketch/Pup.dc.html.
// Собака нарисована в системе координат эскиза 300×340 (акварельные градиенты, шесть пород), а холст остался прежним
// (viewBox 240×270): весь рисунок стоит в группах scale(0.8). Классы анимаций (dog-tail, dog-body, dog-head, dog-paw-r,
// dog-eyes, dog-eyes-shut, dog-tongue) — те же, что в core/styles/dog.css; у хвоста, тела, головы и лапки они стоят на
// внешних группах (координаты 240×270, как раньше), а у глаз и языка — на внутренних (координаты эскиза 300×340).
// Наряды (core/dog-items.js, outfitSvg) нарисованы в тех же координатах эскиза 300×340 и стоят в тех же группах.

const S = 0.8; // 240 / 300: эскиз → холст
const fit = (inner) => `<g transform="scale(${S})">${inner}</g>`;

// Свой набор id градиентов у каждого рисунка: на экране до трёх собак разных окрасов, общие id перекрасили бы всех.
let drawSeq = 0;

// Оттенки собаки из окраса — как в Pup.dc.html (renderVals), включая особые правила хаски и овчарки.
function palette(breed, baseHex) {
  const pale = luminance(baseHex) > 0.78;
  const veryDark = luminance(baseHex) < 0.25;
  const base = baseHex;
  const dark = mix(base, '#000000', pale ? 0.16 : 0.28);
  const light = mix(base, '#FFFFFF', veryDark ? 0.3 : 0.45);
  const cream = mix(base, '#FFF4DE', veryDark ? 0.35 : 0.62);
  const co = {
    base, dark, lift: mix(base, '#FFFFFF', 0.15),
    headBase: base, headLight: light, headDark: dark,
    earTop: base, earBottom: mix(base, '#000000', pale ? 0.2 : 0.34), earInner: mix(base, '#F2C9B8', 0.6),
    muzzle: cream, muzzleLight: mix(cream, '#FFFFFF', 0.4),
    chest: cream, chestLight: mix(cream, '#FFFFFF', 0.4),
    legDark: dark, legLight: mix(base, '#FFFFFF', 0.2),
    paw: mix(cream, '#000000', 0.08), pawLight: mix(cream, '#FFFFFF', 0.3),
    tail: base, tailDark: dark, tailLight: light,
    iris: '#4E2D11', irisLight: '#A06A34', irisDark: '#2A1608',
    furLine: mix(base, '#000000', 0.18), toe: mix(cream, '#000000', 0.3),
    saddle: mix(base, '#1C1612', 0.72),
  };
  if (breed === 'husky') {
    const cap = pale ? mix(base, '#000000', 0.35) : base;
    const white = '#F6F2EA';
    Object.assign(co, {
      base: cap, dark: mix(cap, '#000000', 0.3), lift: mix(cap, '#FFFFFF', 0.12),
      headBase: cap, headLight: mix(cap, '#FFFFFF', 0.3), headDark: mix(cap, '#000000', 0.3),
      earTop: cap, earBottom: mix(cap, '#000000', 0.3),
      muzzle: '#E9E3D8', muzzleLight: white, chest: '#EDE7DC', chestLight: white,
      legDark: '#D8D1C4', legLight: white, paw: '#E2DBCF', pawLight: white,
      tail: cap, tailDark: mix(cap, '#000000', 0.3), tailLight: mix(cap, '#FFFFFF', 0.3),
      iris: '#3E7EC0', irisLight: '#9ACDF5', irisDark: '#1E4A7A',
      furLine: mix(cap, '#000000', 0.2), toe: '#B9B0A2',
    });
  }
  if (breed === 'shepherd') {
    Object.assign(co, {
      earTop: co.saddle, earBottom: mix(co.saddle, '#000000', 0.3),
      muzzle: co.saddle, muzzleLight: mix(co.saddle, base, 0.35),
      tail: co.saddle, tailDark: mix(co.saddle, '#000000', 0.3), tailLight: mix(co.saddle, base, 0.5),
    });
  }
  if (breed === 'dachshund' || breed === 'whippet') co.earTop = mix(base, '#000000', 0.12);
  return co;
}

// Смещения морды по породам: центр и размеры мордочки, сдвиг носа.
const MUZZLE = {
  labrador: { cy: 146, rx: 40, ry: 30, nose: 0 },
  shepherd: { cy: 154, rx: 31, ry: 34, nose: 10 },
  poodle: { cy: 150, rx: 33, ry: 32, nose: 6 },
  dachshund: { cy: 154, rx: 30, ry: 34, nose: 10 },
  husky: { cy: 148, rx: 38, ry: 30, nose: 4 },
  whippet: { cy: 156, rx: 28, ry: 34, nose: 12 },
};

// Корень хвоста в координатах холста 240×270 — вокруг него хвост виляет (у каждой породы свой).
const TAIL_ORIGIN = {
  labrador: [158, 234], shepherd: [155, 230], poodle: [158, 233], dachshund: [208, 200], husky: [157, 200], whippet: [157, 243],
};

function tailSvg(breed, u, co) {
  return {
    labrador: `<path d="M200 300 C236 300 262 278 266 238 C268 220 262 206 254 200 C256 222 250 250 230 268 C220 278 208 284 196 286 Z" fill="url(#${u}t)"/>`,
    shepherd: `<path d="M196 280 C232 284 260 298 274 326 C262 336 238 334 220 324 C206 316 198 302 194 292 Z" fill="url(#${u}t)"/><path d="M214 296 C236 304 252 314 262 326" stroke="${co.tailLight}" stroke-width="2" fill="none" opacity="0.5"/>`,
    poodle: `<path d="M198 292 C222 286 238 264 242 238" stroke="${co.base}" stroke-width="11" stroke-linecap="round" fill="none"/><g fill="url(#${u}t)"><circle cx="246" cy="222" r="20"/><circle cx="232" cy="212" r="12"/><circle cx="258" cy="210" r="12"/><circle cx="246" cy="202" r="12"/></g>`,
    dachshund: `<path d="M260 250 C282 240 294 218 292 190" stroke="url(#${u}t)" stroke-width="11" stroke-linecap="round" fill="none"/>`,
    husky: `<path d="M196 262 C248 266 278 226 260 186 C252 170 230 168 220 182 C240 196 238 226 204 238 Z" fill="url(#${u}t)"/><path d="M260 186 C252 170 230 168 220 182 C230 186 238 192 240 202 C248 198 256 194 260 186 Z" fill="#F6F2EA"/>`,
    whippet: `<path d="M196 304 C238 310 258 288 250 252" stroke="url(#${u}t)" stroke-width="8" stroke-linecap="round" fill="none"/>`,
  }[breed];
}

const TOES = (xs) => `<g stroke="TOE" stroke-width="1.8" stroke-linecap="round">${xs.map((x) => `<path d="M${x} 309 v8"/>`).join('')}</g>`;

// Тело. Возвращает { back, rightLeg, rightPaw, front }: всё рисуется внутри dog-body, а правая передняя лапка (вместе с пальцами)
// стоит в своих группах dog-paw-r, чтобы трюк «дай лапу» поднимал её, не меняя порядок слоёв (у пуделя шерсть закрывает ногу).
function bodySvg(breed, u, co) {
  const toe = (xs) => TOES(xs).replace('TOE', co.toe);
  if (breed === 'dachshund') {
    return {
      before: `<g>
        <path d="M66 238 C64 196 104 172 150 172 C206 172 254 196 268 236 C276 270 258 304 216 308 L92 308 C72 302 66 272 66 238 Z" fill="url(#${u}b)"/>
        <ellipse cx="236" cy="282" rx="40" ry="30" fill="url(#${u}b)"/>
        <path d="M116 180 C106 210 108 248 118 276 C130 284 140 274 150 284 C160 274 170 284 182 276 C192 248 194 210 184 180 Z" fill="url(#${u}c)"/>
      </g>
      <ellipse cx="248" cy="316" rx="24" ry="11" fill="url(#${u}p)"/>
      <rect x="112" y="262" width="28" height="52" rx="14" fill="url(#${u}l)"/>`,
      rightLeg: `<rect x="160" y="262" width="28" height="52" rx="14" fill="url(#${u}l)"/>`,
      after: `<ellipse cx="126" cy="314" rx="22" ry="12" fill="url(#${u}p)"/>`,
      rightPaw: `<ellipse cx="174" cy="314" rx="22" ry="12" fill="url(#${u}p)"/>${toe([167, 181])}`,
      toesLeft: toe([119, 133]),
      pawOrigin: [174, 262],
    };
  }
  if (breed === 'whippet') {
    return {
      before: `<ellipse cx="104" cy="288" rx="40" ry="34" fill="url(#${u}b)"/>
      <ellipse cx="196" cy="288" rx="40" ry="34" fill="url(#${u}b)"/>
      <ellipse cx="82" cy="318" rx="22" ry="10" fill="url(#${u}p)"/>
      <ellipse cx="218" cy="318" rx="22" ry="10" fill="url(#${u}p)"/>
      <g>
        <path d="M118 156 C104 196 104 252 112 306 L188 306 C196 252 196 196 182 156 Z" fill="url(#${u}b)"/>
        <path d="M124 170 C116 206 118 244 126 276 C136 284 142 276 150 284 C158 276 164 284 174 276 C182 244 184 206 176 170 Z" fill="url(#${u}c)"/>
      </g>
      <rect x="116" y="214" width="22" height="100" rx="11" fill="url(#${u}l)"/>`,
      rightLeg: `<rect x="162" y="214" width="22" height="100" rx="11" fill="url(#${u}l)"/>`,
      after: `<ellipse cx="127" cy="316" rx="18" ry="10" fill="url(#${u}p)"/>`,
      rightPaw: `<ellipse cx="173" cy="316" rx="18" ry="10" fill="url(#${u}p)"/>`,
      toesLeft: '',
      pawOrigin: [173, 214],
    };
  }
  // Обычное тело: лабрадор, овчарка, пудель, хаски
  const shepherd = breed === 'shepherd';
  const husky = breed === 'husky';
  const poodle = breed === 'poodle';
  return {
    before: `<ellipse cx="96" cy="282" rx="50" ry="42" fill="url(#${u}b)"/>
      <ellipse cx="204" cy="282" rx="50" ry="42" fill="url(#${u}b)"/>
      ${shepherd ? `<ellipse cx="96" cy="268" rx="44" ry="24" fill="${co.saddle}" opacity="0.75"/><ellipse cx="204" cy="268" rx="44" ry="24" fill="${co.saddle}" opacity="0.75"/>` : ''}
      <ellipse cx="70" cy="316" rx="27" ry="12" fill="url(#${u}p)"/>
      <ellipse cx="230" cy="316" rx="27" ry="12" fill="url(#${u}p)"/>
      <g>
        <path d="M106 150 C90 190 84 244 94 304 L206 304 C216 244 210 190 194 150 Z" fill="url(#${u}b)"/>
        ${shepherd ? `<path d="M104 150 C96 176 94 200 98 226 C120 214 180 214 202 226 C206 200 204 176 196 150 Z" fill="${co.saddle}" opacity="0.85"/>` : ''}
        <path d="M116 168 C108 204 110 240 120 272 C130 282 140 270 150 282 C160 270 170 282 180 272 C190 240 192 204 184 168 Z" fill="url(#${u}c)"/>
        ${husky ? '<path d="M112 166 C118 176 124 170 130 180 C136 172 142 182 150 174 C158 182 164 172 170 180 C176 170 182 176 188 166" stroke="#F6F2EA" stroke-width="6" stroke-linecap="round" fill="none"/>' : ''}
        <g stroke="${co.furLine}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"><path d="M134 212 q4 10 2 20"/><path d="M166 212 q-4 10 -2 20"/><path d="M150 226 q0 10 0 18"/></g>
      </g>
      <rect x="111" y="222" width="30" height="92" rx="15" fill="url(#${u}l)"/>`,
    rightLeg: `<rect x="159" y="222" width="30" height="92" rx="15" fill="url(#${u}l)"/>`,
    after: `${poodle ? `<g fill="url(#${u}c)"><circle cx="134" cy="200" r="12"/><circle cx="166" cy="200" r="12"/><circle cx="150" cy="214" r="13"/><circle cx="140" cy="232" r="11"/><circle cx="160" cy="232" r="11"/></g>
      <g fill="url(#${u}b)"><ellipse cx="126" cy="300" rx="24" ry="18"/><ellipse cx="174" cy="300" rx="24" ry="18"/><circle cx="70" cy="300" r="20"/><circle cx="230" cy="300" r="20"/></g>
      <g stroke="${co.furLine}" stroke-width="1.8" fill="none" opacity="0.55" stroke-linecap="round"><path d="M114 296 a6 6 0 0 1 10 -4"/><path d="M130 304 a6 6 0 0 1 10 -4"/><path d="M162 296 a6 6 0 0 1 10 -4"/><path d="M176 304 a6 6 0 0 1 10 -4"/><path d="M84 270 a7 7 0 0 1 12 -4"/><path d="M206 270 a7 7 0 0 1 12 -4"/></g>` : ''}
      <ellipse cx="126" cy="314" rx="23" ry="13" fill="url(#${u}p)"/>`,
    rightPaw: `<ellipse cx="174" cy="314" rx="23" ry="13" fill="url(#${u}p)"/>${toe([167, 181])}`,
    toesLeft: toe([119, 133]),
    pawOrigin: [174, 222],
  };
}

// Уши, которые стоят за головой, и уши, которые лежат поверх неё.
function earsBehind(breed, u, co) {
  return {
    shepherd: `<path d="M100 84 L84 4 C106 8 128 28 134 54 Z" fill="url(#${u}e)"/><path d="M200 84 L216 4 C194 8 172 28 166 54 Z" fill="url(#${u}e)"/><path d="M104 70 L94 22 C108 28 120 40 126 56 Z" fill="${co.earInner}"/><path d="M196 70 L206 22 C192 28 180 40 174 56 Z" fill="${co.earInner}"/>`,
    husky: `<path d="M98 78 L96 12 C116 16 134 36 138 60 Z" fill="url(#${u}e)"/><path d="M202 78 L204 12 C184 16 166 36 162 60 Z" fill="url(#${u}e)"/><path d="M104 68 L103 30 C115 36 125 46 128 60 Z" fill="#F6F2EA"/><path d="M196 68 L197 30 C185 36 175 46 172 60 Z" fill="#F6F2EA"/>`,
    whippet: `<path d="M122 54 C112 36 92 34 84 46 C82 56 90 66 100 72 C104 64 112 58 122 54 Z" fill="url(#${u}e)"/><path d="M178 54 C188 36 208 34 216 46 C218 56 210 66 200 72 C196 64 188 58 178 54 Z" fill="url(#${u}e)"/><path d="M112 50 C102 44 94 46 90 52 M188 50 C198 44 206 46 210 52" stroke="${co.furLine}" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>`,
  }[breed] || '';
}

function earsFront(breed, u, co) {
  return {
    labrador: `<path d="M108 62 C88 60 70 76 68 104 C66 128 72 148 88 152 C100 156 110 142 112 122 C114 102 116 80 108 62 Z" fill="url(#${u}e)"/><path d="M192 62 C212 60 230 76 232 104 C234 128 228 148 212 152 C200 156 190 142 188 122 C186 102 184 80 192 62 Z" fill="url(#${u}e)"/>`,
    dachshund: `<path d="M106 62 C84 60 62 78 60 112 C58 146 64 178 82 190 C96 198 110 184 112 162 C114 132 116 92 106 62 Z" fill="url(#${u}e)"/><path d="M194 62 C216 60 238 78 240 112 C242 146 236 178 218 190 C204 198 190 184 188 162 C186 132 184 92 194 62 Z" fill="url(#${u}e)"/><g stroke="${co.furLine}" stroke-width="2" fill="none" opacity="0.45" stroke-linecap="round"><path d="M96 80 C88 108 86 140 90 170"/><path d="M204 80 C212 108 214 140 210 170"/></g>`,
    poodle: `<g fill="url(#${u}e)"><circle cx="98" cy="76" r="18"/><circle cx="88" cy="102" r="20"/><circle cx="84" cy="130" r="21"/><circle cx="86" cy="158" r="20"/><circle cx="92" cy="182" r="16"/><circle cx="202" cy="76" r="18"/><circle cx="212" cy="102" r="20"/><circle cx="216" cy="130" r="21"/><circle cx="214" cy="158" r="20"/><circle cx="208" cy="182" r="16"/></g><g stroke="${co.furLine}" stroke-width="1.8" fill="none" opacity="0.55" stroke-linecap="round"><path d="M80 100 a7 7 0 0 1 12 -3"/><path d="M76 134 a7 7 0 0 1 12 -3"/><path d="M82 162 a7 7 0 0 1 12 -3"/><path d="M208 100 a7 7 0 0 1 12 -3"/><path d="M212 134 a7 7 0 0 1 12 -3"/><path d="M206 162 a7 7 0 0 1 12 -3"/></g>`,
  }[breed] || '';
}

// Голова, отметины и морда. Всё — в координатах эскиза 300×340.
function headSvg(breed, u, co, { feeling, senior, headSpots }) {
  const mz = MUZZLE[breed];
  const slim = breed === 'whippet';
  const shape = slim
    ? `<path d="M150 46 C182 46 204 70 204 102 C204 134 190 160 174 176 C166 184 158 190 150 190 C142 190 134 184 126 176 C110 160 96 134 96 102 C96 70 118 46 150 46 Z" fill="url(#${u}h)"/>`
    : `<path d="M150 40 C190 40 216 68 218 104 C220 138 204 164 182 176 C172 182 160 184 150 184 C140 184 128 182 118 176 C96 164 80 138 82 104 C84 68 110 40 150 40 Z" fill="url(#${u}h)"/>`;
  const knot = breed === 'poodle'
    ? `<g fill="url(#${u}h)"><circle cx="150" cy="34" r="26"/><circle cx="124" cy="46" r="19"/><circle cx="176" cy="46" r="19"/><circle cx="136" cy="22" r="17"/><circle cx="164" cy="22" r="17"/></g><g stroke="${co.furLine}" stroke-width="1.8" fill="none" opacity="0.55" stroke-linecap="round"><path d="M128 30 a7 7 0 0 1 12 -3"/><path d="M152 18 a7 7 0 0 1 12 -3"/><path d="M144 44 a7 7 0 0 1 12 -3"/><path d="M166 38 a7 7 0 0 1 12 -3"/><path d="M116 50 a7 7 0 0 1 12 -3"/></g>`
    : '';
  const marks = breed === 'husky'
    ? `<path d="M150 94 C140 94 132 102 128 112 C112 112 96 120 92 136 C100 162 124 180 150 182 C176 180 200 162 208 136 C204 120 188 112 172 112 C168 102 160 94 150 94 Z" fill="#F6F2EA"/><ellipse cx="124" cy="84" rx="9" ry="6" fill="#F6F2EA"/><ellipse cx="176" cy="84" rx="9" ry="6" fill="#F6F2EA"/>`
    : breed === 'shepherd'
      ? `<ellipse cx="127" cy="100" rx="22" ry="17" fill="${co.saddle}" opacity="0.45"/><ellipse cx="173" cy="100" rx="22" ry="17" fill="${co.saddle}" opacity="0.45"/><path d="M150 46 C142 62 142 84 150 96 C158 84 158 62 150 46 Z" fill="${co.saddle}" opacity="0.5"/>`
      : '';
  const forehead = breed !== 'husky' && breed !== 'poodle'
    ? `<ellipse cx="150" cy="70" rx="28" ry="16" fill="${co.headLight}" opacity="0.45"/>`
    : '';

  // Пожилая собака: седая мордочка и брови.
  const grey = senior
    ? `<g fill="#E6E6E6" opacity="0.9"><circle cx="128" cy="${mz.cy + 6}" r="7"/><circle cx="172" cy="${mz.cy + 6}" r="7"/><circle cx="150" cy="${mz.cy + 18}" r="6"/></g><ellipse cx="124" cy="84" rx="11" ry="5" fill="#F4F4F4"/><ellipse cx="176" cy="84" rx="11" ry="5" fill="#F4F4F4"/>`
    : '';

  // Рот, язык (только у весёлой) и брови (только у грустной).
  const smile = 'M150 146 L150 157 M150 157 C142 166 129 165 122 156 M150 157 C158 166 171 165 178 156';
  const frown = 'M150 146 L150 157 M150 157 C142 148 129 149 122 160 M150 157 C158 148 171 149 178 160';
  const tongue = feeling === 'happy'
    ? `<g class="dog-tongue"><path d="M139 160 C138 183 162 183 161 160 Z" fill="url(#${u}q)"/><path d="M150 164 v10" stroke="#D9566F" stroke-width="1.6" stroke-linecap="round"/></g>`
    : '';
  const brows = feeling === 'sad'
    ? '<path d="M103 90 L134 80" stroke="#2E1C10" stroke-width="5" stroke-linecap="round"/><path d="M197 90 L166 80" stroke="#2E1C10" stroke-width="5" stroke-linecap="round"/>'
    : '';
  const eyeAt = (x, hx) => `<ellipse cx="${x}" cy="104" rx="12.5" ry="13" fill="#2E1C10"/><ellipse cx="${x}" cy="104.5" rx="10.5" ry="11.5" fill="url(#${u}i)"/><circle cx="${x}" cy="105" r="5.5" fill="#140A05"/><circle cx="${hx}" cy="99.5" r="3.6" fill="#FFFFFF"/><circle cx="${x - 3.5}" cy="109" r="1.5" fill="#FFFFFF" opacity="0.8"/>`;

  return `${earsBehind(breed, u, co)}
    ${shape}${knot}${marks}${forehead}${headSpots}
    <ellipse cx="150" cy="${mz.cy}" rx="${mz.rx}" ry="${mz.ry}" fill="url(#${u}m)"/>
    ${grey}
    <g transform="translate(0 ${mz.nose})">
      ${tongue}
      <path d="${feeling === 'sad' ? frown : smile}" stroke="#5A3E2B" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M133 128 C133 119 167 119 167 128 C167 139 157 147 150 147 C143 147 133 139 133 128 Z" fill="url(#${u}n)"/>
      <ellipse cx="143" cy="125" rx="6" ry="2.8" fill="#FFFFFF" opacity="0.5"/>
    </g>
    ${brows}
    <g class="dog-eyes">${eyeAt(127, 131)}${eyeAt(173, 177)}</g>
    <g class="dog-eyes-shut"><path d="M114 102 Q127 116 140 102" stroke="#2E1C10" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M160 102 Q173 116 186 102" stroke="#2E1C10" stroke-width="5" stroke-linecap="round" fill="none"/></g>
    ${earsFront(breed, u, co)}`;
}

// Рисунок: собака сидит лицом к ребёнку. Возраст: щенок (до года) — меньше и с большой головой,
// взрослая — обычная, пожилая (10+) — с седой мордочкой. paint — акварельный фильтр wcDog (core/art/filters.js);
// для маленьких неподвижных собак в списках его можно выключить, если на слабом Хромбуке тормозит.
export function drawDog({ breed = 'labrador', color = 'ginger', age = 3, mood = 'happy', dirt = 0, energy = 100, outfit = {}, paint = true } = {}) {
  const feeling = typeof mood === 'number' ? moodState(mood) : mood; // happy | ok | sad
  const breedId = breedById.has(breed) ? breed : 'labrador';
  const co = palette(breedId, (colorById.get(color) || COLORS[0]).hex);
  const u = `pup-${breedId}-${color}-${String(outfit.collar || 'red').replace(/[^\w-]/g, '')}-${++drawSeq}-`; // id градиентов: порода, окрас, ошейник, номер рисунка
  const wear = outfitSvg(outfit, { breed: breedId, u });
  const puppy = age <= 1;
  const senior = age >= 10;
  const bodyScale = puppy ? 0.8 : 1;
  const headScale = puppy ? 1.12 : 1;

  // Пятна грязи: чем грязнее, тем их больше.
  const spotCount = dirt >= 70 ? 4 : dirt >= DIRTY_AT ? 3 : dirt >= WASH_FROM ? 1 : 0;
  const spots = (list, n) => list.slice(0, n).map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${Math.round(r * 0.75)}" fill="#7a5230" opacity="0.6"/>`).join('');
  const bodySpots = spots([[120, 236, 11], [184, 226, 10], [150, 272, 9], [132, 196, 8]], spotCount);
  const headSpots = spots([[104, 96, 8], [196, 84, 7], [166, 66, 7]], Math.max(0, spotCount - 1));

  const body = bodySvg(breedId, u, co);
  const pawStyle = `transform-origin:${body.pawOrigin[0]}px ${body.pawOrigin[1]}px`; // вокруг верха ноги поднимается лапка («дай лапу»)
  const [tx, ty] = TAIL_ORIGIN[breedId];
  const collarSvg = `<path d="M108 172 C128 188 172 188 192 172 L194 186 C172 204 128 204 106 186 Z" fill="url(#${u}k)"/>${wear.tag ? `<circle cx="150" cy="204" r="10" fill="url(#${u}g)" stroke="#C99400" stroke-width="1.5"/>` : ''}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 270" role="img" aria-hidden="true" style="overflow:visible">
  <defs>
    <linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${co.dark}"/><stop offset="0.3" stop-color="${co.base}"/><stop offset="0.62" stop-color="${co.lift}"/><stop offset="1" stop-color="${co.dark}"/></linearGradient>
    <radialGradient id="${u}h" cx="0.42" cy="0.32" r="0.72"><stop offset="0" stop-color="${co.headLight}"/><stop offset="0.55" stop-color="${co.headBase}"/><stop offset="1" stop-color="${co.headDark}"/></radialGradient>
    <linearGradient id="${u}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${co.earTop}"/><stop offset="1" stop-color="${co.earBottom}"/></linearGradient>
    <radialGradient id="${u}m" cx="0.5" cy="0.35" r="0.7"><stop offset="0" stop-color="${co.muzzleLight}"/><stop offset="1" stop-color="${co.muzzle}"/></radialGradient>
    <radialGradient id="${u}c" cx="0.5" cy="0.28" r="0.75"><stop offset="0" stop-color="${co.chestLight}"/><stop offset="0.65" stop-color="${co.chest}"/><stop offset="1" stop-color="${co.chest}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${u}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${co.legDark}"/><stop offset="0.5" stop-color="${co.legLight}"/><stop offset="1" stop-color="${co.legDark}"/></linearGradient>
    <radialGradient id="${u}p" cx="0.5" cy="0.3" r="0.8"><stop offset="0" stop-color="${co.pawLight}"/><stop offset="1" stop-color="${co.paw}"/></radialGradient>
    <linearGradient id="${u}t" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${co.tailDark}"/><stop offset="0.6" stop-color="${co.tail}"/><stop offset="1" stop-color="${co.tailLight}"/></linearGradient>
    <radialGradient id="${u}i" cx="0.5" cy="0.55" r="0.6"><stop offset="0" stop-color="${co.irisLight}"/><stop offset="0.65" stop-color="${co.iris}"/><stop offset="1" stop-color="${co.irisDark}"/></radialGradient>
    <radialGradient id="${u}n" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#5E4840"/><stop offset="1" stop-color="#1A1310"/></radialGradient>
    <linearGradient id="${u}q" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFA3B2"/><stop offset="1" stop-color="#E5677F"/></linearGradient>
    <linearGradient id="${u}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wear.collar[0]}"/><stop offset="1" stop-color="${wear.collar[1]}"/></linearGradient>
    <radialGradient id="${u}g" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFE69A"/><stop offset="1" stop-color="#E0A800"/></radialGradient>
  </defs>
  <g${paint ? ' filter="url(#wcDog)"' : ''}>
  <ellipse cx="120" cy="262" rx="90" ry="8" fill="#4A3A2A" opacity="0.18"/>
  <g transform="translate(120 256) scale(${bodyScale}) translate(-120 -256)">
    <g class="dog-tail" style="transform-origin:${tx}px ${ty}px">${fit(tailSvg(breedId, u, co))}</g>
    <g class="dog-body">${fit(`${body.before}
      <g class="dog-paw-r" style="${pawStyle}">${body.rightLeg}</g>
      ${body.after}
      <g class="dog-paw-r" style="${pawStyle}">${body.rightPaw}</g>
      ${body.toesLeft}
      ${bodySpots}`)}</g>
    ${fit(collarSvg + wear.neck)}
    <g transform="translate(120 90) scale(${headScale}) translate(-120 -90)"><g class="dog-head">
      ${fit(headSvg(breedId, u, co, { feeling, senior, headSpots }) + wear.glasses + wear.hat + wear.top)}
    </g></g>
  </g>
  </g>
</svg>`;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  el.setAttribute('class', `dog-art mood-${feeling}${energy < TIRED_AT ? ' tired' : ''}`);
  return el;
}
