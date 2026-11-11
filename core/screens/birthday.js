// Экран «День рождения»: собака в праздничном колпаке поздравляет ребёнка на развороте книги.
// Слева праздничная картинка (гирлянда, шарики, возраст) и собака с облачком, справа то, что делает ребёнок:
//   1) поздравление (по-русски и по-немецки), 2) торт со свечками: коснуться каждой, 3) три подарка: открыть коробки.
// Подарки выдаёт storage.claimBirthday (один раз в год) в момент первой открытой коробки; пробный запуск из раздела
// для родителя (test) ничего не записывает. Данные и даты — core/birthday-data.js, логика — core/birthday.js.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { drawDog } from '../dogs.js';
import { stickerById } from '../rewards.js';
import { GIFT, claimBirthday } from '../birthday.js';
import { yearsLabel, MAX_CANDLES } from '../birthday-data.js';
import { createBook, guideDog, lockButton } from './book.js';
import { svgEl, boneMark } from './book-art.js';

const B = STR.birthday;
const CANDLE_COLORS = ['#f7a8c4', '#a8d8f0', '#fbe08a', '#b9e5b8', '#d9b8f0'];
const BOX_COLORS = ['c1', 'c2', 'c3'];
const CONFETTI_COLORS = ['#f26d85', '#f4c34e', '#6fb7e8', '#8fd19a', '#c79be6', '#ff9f6b'];
const CONFETTI_COUNT = 26;

const NS = 'xmlns="http://www.w3.org/2000/svg"';

// Праздничная картинка слева: гирлянда флажков, шарики и значок с возрастом. Фильтр акварели — только на шариках.
function sceneSvg(age) {
  const P0 = [20, 14], P1 = [258, 124], P2 = [496, 14];
  const at = (t) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  const flags = Array.from({ length: 12 }, (_, i) => {
    const t = (i + 0.5) / 12;
    const [x, y] = at(t);
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})" d="M-17 0 L17 0 L0 38 Z" fill="${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}"/>`;
  }).join('');
  const balloon = (x, y, color) => `<g><path d="M${x} ${y + 30} q-8 40 6 78" fill="none" stroke="#8a6d4f" stroke-width="1.6"/>
    <ellipse cx="${x}" cy="${y}" rx="24" ry="30" fill="${color}"/><ellipse cx="${x - 8}" cy="${y - 11}" rx="6" ry="9" fill="#fff" opacity="0.45"/><path d="M${x - 4} ${y + 30} l4 7 l4 -7 Z" fill="${color}"/></g>`;
  return `<svg ${NS} viewBox="0 0 516 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="bdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9ec"/><stop offset="1" stop-color="#fff1d6"/></linearGradient></defs>
    <rect width="516" height="340" fill="url(#bdSky)"/>
    <path d="M0 292 Q130 266 258 284 T516 278 V340 H0 Z" fill="#f4d9a8"/>
    <path d="M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}" fill="none" stroke="#8a6d4f" stroke-width="2.5"/>
    ${flags}
    <g filter="url(#wcS)">${balloon(58, 172, '#f26d85')}${balloon(100, 138, '#f4c34e')}${balloon(458, 160, '#6fb7e8')}${balloon(416, 126, '#c79be6')}${balloon(484, 214, '#8fd19a')}</g>
    <g filter="url(#wcS)"><circle cx="258" cy="190" r="74" fill="#f4c34e"/><circle cx="258" cy="190" r="60" fill="#fff3cf"/></g>
    <text x="258" y="${age > 9 ? 214 : 220}" text-anchor="middle" style="font-family: var(--font-hand); font-weight: 700; font-size: ${age > 9 ? 70 : 88}px" fill="#c9623a">${age}</text>
  </svg>`;
}

// Свечка-кнопка: пламя и тонкий дымок, когда погасла.
function candleSvg(color) {
  return `<svg ${NS} viewBox="0 0 40 96" aria-hidden="true">
    <g class="bd-flame"><ellipse cx="20" cy="17" rx="9" ry="14" fill="#ffb347"/><ellipse cx="20" cy="20" rx="4.5" ry="8" fill="#fff3a0"/></g>
    <path class="bd-smoke" d="M20 30 q-8 -9 0 -18 q8 -9 0 -18" fill="none" stroke="#b8b0a6" stroke-width="3" stroke-linecap="round"/>
    <path d="M20 32 v8" stroke="#5a4636" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="12" y="38" width="16" height="58" rx="3" fill="${color}"/>
    <path d="M12 52 l16 -7 M12 66 l16 -7 M12 80 l16 -7" stroke="#fff" stroke-width="3" opacity="0.55"/>
  </svg>`;
}

const cakeSvg = () => `<svg ${NS} viewBox="0 0 460 230" aria-hidden="true">
  <ellipse cx="230" cy="214" rx="214" ry="14" fill="#d9c7a3"/>
  <g filter="url(#wcS)">
    <rect x="40" y="108" width="380" height="98" rx="14" fill="#f6a5bd"/>
    <path d="M40 126 q24 22 48 0 q24 22 48 0 q24 22 48 0 q24 22 48 0 q24 22 48 0 q24 22 48 0 q24 22 48 0 q24 22 44 0 V108 H40 Z" fill="#fff6e6"/>
    <rect x="96" y="48" width="268" height="64" rx="12" fill="#fff0c9"/>
    <path d="M96 62 q22 20 44 0 q22 20 44 0 q22 20 44 0 q22 20 44 0 q22 20 44 0 q22 20 48 0 V48 H96 Z" fill="#f4829c"/>
    <ellipse cx="230" cy="48" rx="134" ry="22" fill="#ffb9ca"/>
    <circle cx="86" cy="170" r="9" fill="#f26d85"/><circle cx="140" cy="182" r="9" fill="#f4c34e"/><circle cx="200" cy="168" r="9" fill="#6fb7e8"/><circle cx="260" cy="182" r="9" fill="#8fd19a"/><circle cx="320" cy="168" r="9" fill="#c79be6"/><circle cx="376" cy="180" r="9" fill="#f26d85"/>
  </g>
</svg>`;

// Подарки, которые получила бы ребёнок (для пробного запуска): то же, что выдаёт storage.claimBirthday.
function previewGift() {
  const owned = storage.owned();
  const sticker = GIFT.stickers.find((id) => stickerById.has(id) && !owned.includes(id)) || '';
  return { bones: GIFT.bones, hat: GIFT.hat, sticker, stars: sticker ? 0 : GIFT.fallbackStars };
}

// info — { year, daysAfter, age, name } (birthdayInfo или previewInfo); test — пробный запуск (ничего не записывается).
export function renderBirthday(app, info, { test = false, onExit = null } = {}) {
  const holder = h('div', { class: 'mission-holder bd-holder' });
  const exit = () => (test && onExit ? onExit() : app.go.menu());
  const sounds = app.services.sounds;
  const nameTail = info.name ? `, ${info.name}` : '';
  const age = yearsLabel(info.age);
  const dogData = guideDog();
  const dogArt = () => drawDog({ ...dogData, mood: 'happy', outfit: { ...(dogData.outfit || {}), hat: GIFT.hat } });
  let gift = null; // что выдано (или показано в пробном запуске)

  function page({ text, right, joy = false, confetti = false }) {
    const scene = h('div', { class: 'mz-room bd-scene', role: 'img', 'aria-label': B.sceneLabel }, svgEl(sceneSvg(info.age), 'bd-scene-art'));
    if (confetti) {
      for (let i = 0; i < CONFETTI_COUNT; i++) {
        const piece = h('i', { class: 'bd-confetti', 'aria-hidden': 'true' });
        piece.style.left = `${Math.round(Math.random() * 96)}%`;
        piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        piece.style.animationDelay = `${(Math.random() * 1.4).toFixed(2)}s`;
        piece.style.animationDuration = `${(2.2 + Math.random() * 1.6).toFixed(2)}s`;
        piece.style.setProperty('--tilt', `${Math.round(Math.random() * 360)}deg`);
        scene.append(piece);
      }
    }
    const bubble = h('div', { class: 'mz-bubble hand', 'aria-live': 'polite' }, text);
    const dog = h('div', { class: `mz-dog${joy ? ' joy' : ''}` }, dogArt());
    const rightEl = h('div', { class: 'bd-right' }, right);
    const book = createBook({
      className: 'mission-book birthday-book',
      top: [test ? button('btn quiet', B.testExit, exit) : lockButton(B.lock, () => app.go.parent())],
      left: [scene, h('div', { class: 'mz-talk' }, dog, bubble)],
      right: [rightEl],
    });
    holder.replaceChildren(book.el);
    return { bubble, dog, right: rightEl };
  }

  // 1. Поздравление.
  function greetView() {
    sounds('fanfare');
    const text = format(info.daysAfter === 1 ? B.greetLate1 : info.daysAfter >= 2 ? B.greetLate2 : B.greet, { name: nameTail, age });
    page({
      text,
      confetti: true,
      joy: true,
      right: [
        h('div', { class: 'paper-card bd-card' },
          h('i', { class: 'tape', 'aria-hidden': 'true' }),
          h('span', { class: 'bd-card-emoji', text: '🎂' }),
          h('p', { class: 'bd-card-text hand', text: format(B.de, { name: nameTail }) }),
          h('p', { class: 'bd-card-age hand', text: format(B.ageBadge, { age }) })),
        button('btn primary big bd-go', B.next, cakeView),
      ],
    });
  }

  // 2. Торт: каждая свечка гаснет от касания; когда погасли все — мелодия «Happy Birthday».
  function cakeView() {
    const count = Math.min(info.age, MAX_CANDLES);
    let left = count;
    const counter = h('p', { class: 'bd-counter hand', text: format(B.cakeLeft, { n: left }) });
    const next = button('btn primary big bd-go', B.next, boxesView);
    next.disabled = true;
    const view = page({ text: B.cakeIntro, right: [] });
    const candles = Array.from({ length: count }, (_, i) => {
      const c = button('bd-candle', [], () => {
        if (c.classList.contains('out')) return;
        c.classList.add('out');
        c.setAttribute('aria-pressed', 'true');
        left -= 1;
        counter.textContent = left ? format(B.cakeLeft, { n: left }) : '';
        sounds('tap');
        if (left === 0) {
          sounds('birthday');
          view.bubble.textContent = B.cakeDone;
          view.dog.classList.add('joy');
          next.disabled = false;
        }
      });
      c.append(svgEl(candleSvg(CANDLE_COLORS[i % CANDLE_COLORS.length])));
      c.setAttribute('aria-label', `${B.cakeCandle} ${i + 1}`);
      return c;
    });
    view.right.append(
      counter,
      h('div', { class: 'bd-cake' }, h('div', { class: `bd-candles${count > 6 ? ' two-rows' : ''}`, style: `--per: ${Math.ceil(count / 2)}` }, candles), svgEl(cakeSvg(), 'bd-cake-art')),
      next);
  }

  // 3. Три подарка: косточки, колпак, наклейка. Все выдаются при первой открытой коробке, дальше коробки только показывают.
  function boxesView() {
    const total = 3;
    let opened = 0;
    const counter = h('p', { class: 'bd-counter hand', text: format(B.boxOpened, { n: 0, total }) });
    const thanks = button('btn primary big bd-go', B.thanks, exit);
    thanks.disabled = true;
    const view = page({ text: B.boxesIntro, right: [] });

    // что в коробке номер i: рисунок и подпись
    const content = (i) => {
      if (i === 0) return { art: h('span', { class: 'bd-gift-art bone' }, svgEl(boneMark())), caption: format(B.giftBones, { n: gift.bones }) };
      if (i === 1) return { art: h('span', { class: 'bd-gift-art', text: '🥳' }), caption: test ? B.giftHatTest : B.giftHat };
      return gift.sticker
        ? { art: h('span', { class: 'bd-gift-art sticker', text: stickerById.get(gift.sticker).emoji }), caption: B.giftSticker }
        : { art: h('span', { class: 'bd-gift-art', text: '⭐' }), caption: format(B.giftStars, { n: gift.stars }) };
    };

    const cells = Array.from({ length: total }, (_, i) => {
      const caption = h('p', { class: 'bd-gift-caption hand' });
      const box = button(`bd-box ${BOX_COLORS[i]}`, [h('i', { class: 'bd-lid' }), h('i', { class: 'bd-body' }), h('i', { class: 'bd-rib-v' }), h('i', { class: 'bd-rib-h' })], () => {
        if (box.classList.contains('open')) return;
        if (!gift) gift = test ? previewGift() : claimBirthday(info) || previewGift(); // уже выдано в другом окне — просто показываем
        const { art, caption: text } = content(i);
        box.classList.add('open');
        box.disabled = true;
        box.replaceChildren(art);
        caption.textContent = text;
        opened += 1;
        counter.textContent = format(B.boxOpened, { n: opened, total });
        sounds('star');
        if (opened === total) {
          sounds('done');
          view.bubble.textContent = B.allOpen;
          view.dog.classList.add('joy');
          thanks.disabled = false;
        }
      });
      box.setAttribute('aria-label', format(B.boxLabel, { n: i + 1 }));
      return h('div', { class: 'bd-cell' }, box, caption);
    });
    view.right.append(
      ...[h('div', { class: 'bd-boxes' }, cells), counter, test ? h('p', { class: 'bd-test-note', text: B.testNote }) : null, thanks].filter(Boolean));
  }

  greetView();
  return { el: holder, onLeave: () => {} };
}
