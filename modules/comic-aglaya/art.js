// Картинки комикса. Пока — заглушки (эмодзи и цветные фоны); настоящие картинки подключаются таблицей ART:
// заполните нужные id, остальное останется заглушками. Весь доступ к картинкам идёт через этот файл.
//   ART.bg[id]     путь к фону (WebP, примерно 3:2; важное — ближе к центру: кадры бывают и широкими, и почти квадратными)
//   ART.hero[who][pose]  путь к картинке героя на прозрачном фоне (смотрит вправо; слева направо зеркалит CSS)
//   ART.prop[id], ART.splash[id]  предметы и большие кадры
//   ART.spots[bg][spot] = [x%, y%]  где на этом фоне нарисовано «место» для задания «найди»

import { ART_DATA } from './art-data.js'; // пишет tools/comic/build_art.py

export const ART = ART_DATA;
const url = (path) => new URL(path, import.meta.url).href;

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const HERO = {
  ag: { emoji: '🐕', color: '#f0a24a' },
  gor: { emoji: '🪿', color: '#f4f1ea' },
  frog: { emoji: '🐸', color: '#9bd97b' },
};
const BG = {
  yard: ['#c8ecb0', '#8fcf7a'], pond: ['#b4def2', '#6bb6d6'], bridge: ['#e0d2a8', '#a9d8c8'], bushes: ['#a6d794', '#5fa05a'],
  storm: ['#5b6a88', '#2f3a52'], shed: ['#d3ac82', '#8a6a4a'], meadow: ['#dcf2a4', '#a5d45f'], sunset: ['#ffd29a', '#e68a7a'], mudpath: ['#cdbb8a', '#8d7c52'],
};
const PROP = { ball: '⚽', feather: '🪶', plaid: '🟥', tracks: '🐾', puddle: '💧' };
export function faceEl(who) {
  const d = el('div', 'cmx-face', HERO[who].emoji);
  d.style.setProperty('--hc', HERO[who].color);
  return d;
}

// Портрет героя для карточек «Кто это сказал?»: настоящая картинка, а у заглушки — эмодзи в кружке.
const PORTRAIT = { ag: 'stand', gor: 'proud', frog: 'stare' };
export function portraitEl(who) {
  const entry = ART.hero[who]?.[PORTRAIT[who]];
  if (!entry) return faceEl(who);
  const d = el('div', 'cmx-face portrait');
  const img = el('img');
  img.src = url(entry.src);
  img.alt = '';
  d.append(img);
  return d;
}

export function heroEl(who, pose, at) {
  const d = el('div', `cmx-hero at-${at}${at === 'r' ? ' flip' : ''}`);
  d.dataset.who = who;
  d.dataset.pose = pose;
  const entry = ART.hero[who]?.[pose]; // { src, h } — h: высота позы относительно самой высокой позы героя
  if (entry) {
    const img = el('img', 'cmx-hero-img');
    img.src = url(entry.src);
    img.style.height = `${Math.round(entry.h * 100)}%`;
    img.alt = '';
    d.append(img);
  } else {
    d.append(faceEl(who), el('span', 'cmx-pose', pose)); // подпись позы — только у заглушек
  }
  return d;
}

export function sceneEl(bg, splash) {
  const d = el('div', 'cmx-scene');
  const src = splash ? ART.splash[splash] : ART.bg[bg];
  if (src) {
    d.style.backgroundImage = `url("${url(src)}")`;
  } else {
    const c = BG[bg] || BG.yard;
    d.style.background = `linear-gradient(${c[0]}, ${c[1]})`;
    d.append(el('span', 'cmx-label', splash ? `большой кадр: ${splash}` : `фон: ${bg}`));
    if (splash) d.classList.add('splash');
  }
  return d;
}

export function propEl(id, at) {
  const d = el('div', `cmx-prop at-${at}${id === 'plaid' ? ' big' : ''}`);
  const src = ART.prop[id]?.src ?? ART.prop[id]; // { src, ratio } из build_art.py
  if (src) {
    const img = el('img');
    img.src = url(src);
    img.alt = '';
    d.append(img);
  } else {
    d.textContent = PROP[id] || '❔';
  }
  return d;
}
