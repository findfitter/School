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

// Рисунок: собака сидит лицом к ребёнку. Возраст: щенок (до года) — меньше и с большой головой,
// взрослая — обычная, пожилая (10+) — с седой мордочкой.
export function drawDog({ breed = 'labrador', color = 'ginger', age = 3, mood = 'happy', dirt = 0, energy = 100, outfit = {} } = {}) {
  const wear = outfitSvg(outfit);
  const feeling = typeof mood === 'number' ? moodState(mood) : mood; // happy | ok | sad
  const base = (colorById.get(color) || COLORS[0]).hex;
  const pale = luminance(base) > 0.78;
  const dark = pale ? mix(base, '#000000', 0.14) : mix(base, '#000000', 0.26);
  const light = pale ? '#fffaf0' : mix(base, '#ffffff', 0.55);
  const muzzle = pale ? '#efe5d3' : mix(base, '#ffffff', 0.62);
  const ink = '#2b1b17';
  const edge = pale ? ' stroke="#d9cdb8" stroke-width="3"' : ''; // контур светлой собаки, чтобы не сливалась с фоном
  const puppy = age <= 1;
  const senior = age >= 10;
  const husky = breed === 'husky';
  const dachshund = breed === 'dachshund';
  const poodle = breed === 'poodle';
  const eye = husky ? '#4aa3e0' : ink;
  const eyeR = puppy ? 9 : 7;
  const bodyScale = puppy ? 0.8 : 1;
  const headScale = puppy ? 1.12 : 1;

  const tails = {
    labrador: `<path d="M166 232 Q206 220 200 176" stroke="${base}" stroke-width="20" stroke-linecap="round" fill="none"/>`,
    shepherd: `<path d="M166 232 Q214 224 204 172" stroke="${base}" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M204 190 Q210 176 204 172" stroke="${dark}" stroke-width="12" stroke-linecap="round" fill="none"/>`,
    poodle: `<path d="M166 232 Q196 218 192 190" stroke="${base}" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="192" cy="180" r="17" fill="${base}"/>`,
    dachshund: `<path d="M164 236 Q200 232 198 196" stroke="${base}" stroke-width="9" stroke-linecap="round" fill="none"/>`,
    husky: `<path d="M166 232 Q208 232 200 188 Q196 172 184 176" stroke="${base}" stroke-width="22" stroke-linecap="round" fill="none"/><path d="M200 190 Q196 176 184 176" stroke="${light}" stroke-width="10" stroke-linecap="round" fill="none"/>`,
  }[breed];

  const bodyRy = dachshund ? 40 : poodle ? 44 : 48;
  const legTop = dachshund ? 226 : 212;
  const fluff = poodle
    ? [[84, 214, 17], [156, 214, 17], [120, 238, 17], [92, 238, 15], [148, 238, 15]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${base}"/>`).join('')
    : '';

  const ears = {
    labrador: `<ellipse cx="72" cy="120" rx="17" ry="37" transform="rotate(16 72 120)" fill="${dark}"/><ellipse cx="168" cy="120" rx="17" ry="37" transform="rotate(-16 168 120)" fill="${dark}"/>`,
    shepherd: `<polygon points="78,80 72,16 116,64" fill="${dark}"/><polygon points="162,80 168,16 124,64" fill="${dark}"/><polygon points="84,70 82,36 106,62" fill="${light}"/><polygon points="156,70 158,36 134,62" fill="${light}"/>`,
    poodle: `<circle cx="66" cy="126" r="27" fill="${base}"/><circle cx="174" cy="126" r="27" fill="${base}"/><circle cx="50" cy="140" r="14" fill="${base}"/><circle cx="190" cy="140" r="14" fill="${base}"/>`,
    dachshund: `<ellipse cx="70" cy="136" rx="18" ry="50" transform="rotate(8 70 136)" fill="${dark}"/><ellipse cx="170" cy="136" rx="18" ry="50" transform="rotate(-8 170 136)" fill="${dark}"/>`,
    husky: `<polygon points="80,78 80,24 118,62" fill="${dark}"/><polygon points="160,78 160,24 122,62" fill="${dark}"/><polygon points="86,68 88,40 106,62" fill="${light}"/><polygon points="154,68 152,40 134,62" fill="${light}"/>`,
  }[breed];

  const topKnot = poodle
    ? `<circle cx="120" cy="64" r="26" fill="${base}"/><circle cx="96" cy="74" r="16" fill="${base}"/><circle cx="144" cy="74" r="16" fill="${base}"/>`
    : '';

  const headShape = dachshund
    ? `<ellipse cx="120" cy="112" rx="44" ry="50" fill="${base}"${edge}/>`
    : `<circle cx="120" cy="112" r="${poodle ? 46 : 52}" fill="${base}"${edge}/>`;

  const mask = husky
    ? `<ellipse cx="120" cy="132" rx="42" ry="36" fill="#ffffff"/><path d="M120 62 L108 100 L132 100 Z" fill="#ffffff"/>`
    : '';

  const snout = dachshund
    ? { cy: 138, rx: 22, ry: 25 }
    : breed === 'shepherd'
      ? { cy: 136, rx: 24, ry: 24 }
      : poodle
        ? { cy: 132, rx: 22, ry: 18 }
        : { cy: 132, rx: 26, ry: 20 };

  const grey = senior
    ? `<circle cx="104" cy="138" r="6" fill="#e6e6e6" opacity="0.9"/><circle cx="136" cy="138" r="6" fill="#e6e6e6" opacity="0.9"/><circle cx="120" cy="146" r="5" fill="#e6e6e6" opacity="0.9"/><ellipse cx="98" cy="86" rx="9" ry="4" fill="#f4f4f4"/><ellipse cx="142" cy="86" rx="9" ry="4" fill="#f4f4f4"/>`
    : '';

  // Пятна грязи: чем грязнее, тем их больше.
  const spotCount = dirt >= 70 ? 4 : dirt >= DIRTY_AT ? 3 : dirt >= WASH_FROM ? 1 : 0;
  const spots = (list, n) => list.slice(0, n).map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${Math.round(r * 0.75)}" fill="#7a5230" opacity="0.6"/>`).join('');
  const bodySpots = spots([[92, 208, 9], [150, 200, 8], [120, 236, 7], [104, 178, 6]], spotCount);
  const headSpots = spots([[78, 104, 6], [156, 92, 5], [132, 70, 5]], Math.max(0, spotCount - 1));

  // Выражение мордочки: рот и брови.
  const sy = snout.cy;
  const mouth = feeling === 'sad'
    ? `M120 ${sy - 4} L120 ${sy + 6} M120 ${sy + 6} Q108 ${sy + 2} 98 ${sy + 14} M120 ${sy + 6} Q132 ${sy + 2} 142 ${sy + 14}`
    : `M120 ${sy - 4} L120 ${sy + 6} M120 ${sy + 6} Q108 ${sy + 16} 98 ${sy + 8} M120 ${sy + 6} Q132 ${sy + 16} 142 ${sy + 8}`;
  const tongue = feeling === 'happy' ? `<ellipse class="dog-tongue" cx="120" cy="${sy + 16}" rx="8" ry="10" fill="#ff8fa3"/>` : '';
  const brows = feeling === 'sad'
    ? `<path d="M82 96 L106 86" stroke="${ink}" stroke-width="4" stroke-linecap="round"/><path d="M158 96 L134 86" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 270" role="img" aria-hidden="true">
  <ellipse cx="120" cy="258" rx="70" ry="9" fill="rgba(0,0,0,0.12)"/>
  <g transform="translate(120 256) scale(${bodyScale}) translate(-120 -256)">
    <g class="dog-tail">${tails}</g>
    <g class="dog-body">
    <ellipse cx="120" cy="204" rx="54" ry="${bodyRy}" fill="${base}"${edge}/>
    ${fluff}
    <ellipse cx="120" cy="212" rx="28" ry="${bodyRy - 12}" fill="${husky ? '#ffffff' : light}"/>
    <rect x="86" y="${legTop}" width="24" height="${256 - legTop}" rx="12" fill="${base}"${edge}/>
    <ellipse cx="98" cy="254" rx="16" ry="8" fill="${light}"/>
    <g class="dog-paw-r"><rect x="130" y="${legTop}" width="24" height="${256 - legTop}" rx="12" fill="${base}"${edge}/><ellipse cx="142" cy="254" rx="16" ry="8" fill="${light}"/></g>
    ${bodySpots}
    </g>
    <g transform="translate(120 112) scale(${headScale}) translate(-120 -112)"><g class="dog-head">
      ${ears}
      ${headShape}
      ${topKnot}
      ${mask}
      ${headSpots}
      <ellipse cx="120" cy="${snout.cy}" rx="${snout.rx}" ry="${snout.ry}" fill="${muzzle}"/>
      ${grey}
      <ellipse cx="120" cy="${snout.cy - 10}" rx="10" ry="7" fill="${ink}"/>
      <path d="${mouth}" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
      ${tongue}
      ${brows}
      <g class="dog-eyes">
        <circle cx="96" cy="102" r="${eyeR}" fill="${eye}"/>
        <circle cx="144" cy="102" r="${eyeR}" fill="${eye}"/>
        <circle cx="98.5" cy="99" r="2.6" fill="#ffffff"/>
        <circle cx="146.5" cy="99" r="2.6" fill="#ffffff"/>
      </g>
      <g class="dog-eyes-shut">
        <path d="M86 104 Q96 114 106 104" stroke="${ink}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M134 104 Q144 114 154 104" stroke="${ink}" stroke-width="4" stroke-linecap="round" fill="none"/>
      </g>
      <ellipse cx="80" cy="126" rx="8" ry="5" fill="#ff8fa3" opacity="0.35"/>
      <ellipse cx="160" cy="126" rx="8" ry="5" fill="#ff8fa3" opacity="0.35"/>
      ${wear.glasses}
      ${wear.headExtra}
      ${wear.hat}
    </g></g>
    <path d="M84 166 Q120 182 156 166 L158 178 Q120 196 82 178 Z" fill="${wear.collar}"/>
    <circle cx="120" cy="190" r="9" fill="#ffd23f" stroke="#e0a800" stroke-width="2"/>
    ${wear.neckExtra}
  </g>
</svg>`;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  el.setAttribute('class', `dog-art mood-${feeling}${energy < TIRED_AT ? ' tired' : ''}`);
  return el;
}
