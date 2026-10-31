// Рисунки «сказочной книжки»: стол и бумага, иллюстрация левой страницы главного экрана, значки.
// Всё нарисовано кодом (SVG-строки), внешних картинок и шрифтов нет. Разбор строки — как в core/dogs.js (DOMParser).
// Акварельные фильтры — общие (core/art/filters.js). Маска «рваных краёв» объявлена внутри того же <svg>,
// где используется (иначе Chrome прячет картинку).

const NS = 'xmlns="http://www.w3.org/2000/svg"';

export function svgEl(markup, className = '') {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  if (className) el.setAttribute('class', className);
  return el;
}

const STAR_D = 'M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.1l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z';
const BONE_PARTS = '<circle cx="9" cy="13" r="5"/><circle cx="9" cy="23" r="5"/><circle cx="27" cy="13" r="5"/><circle cx="27" cy="23" r="5"/><rect x="9" y="13" width="18" height="10"/>';

const PATH_D = 'M30 422 C120 390 180 368 222 338 C272 300 330 306 370 276 C400 254 420 236 440 226';
const star = (x, y, extra) => `<path transform="translate(${x} ${y}) scale(0.9)" d="${STAR_D}" ${extra}/>`;

// Иллюстрация левой страницы, нижний слой: неподвижный (фильтры рисуются один раз). Звёзд на дорожке пять.
// done — сколько из них закрашено.
export function illustrationBack(done) {
  const stars = [[60, 384], [120, 360], [176, 336], [318, 276], [364, 248]];
  const filled = stars.slice(0, done).map(([x, y]) => star(x, y, 'fill="#F4C34E"')).join('');
  const empty = stars.slice(done).map(([x, y]) => star(x, y, 'fill="none" stroke="#C4A57A" stroke-width="2.2" stroke-linejoin="round"')).join('');
  return `<svg ${NS} role="img" width="100%" height="100%" viewBox="0 0 516 432" aria-hidden="true">
  <defs>
    <filter id="bk-deckleF" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>
    <mask id="bk-deckle" maskUnits="userSpaceOnUse" x="0" y="0" width="516" height="432"><rect x="8" y="8" width="500" height="416" rx="6" fill="#FFFFFF" filter="url(#bk-deckleF)"/></mask>
  </defs>
  <g mask="url(#bk-deckle)">
    <rect x="0" y="0" width="516" height="432" fill="#D3E6F2" filter="url(#wc2)"/>
    <g fill="#FFFFFF" opacity="0.75" filter="url(#wc)"><ellipse cx="150" cy="70" rx="60" ry="18"/><ellipse cx="180" cy="58" rx="34" ry="20"/><ellipse cx="320" cy="110" rx="46" ry="14"/></g>
    <circle cx="432" cy="72" r="36" fill="#F7D774" filter="url(#wc)"/>
    <path d="M0 260 C90 206 180 214 262 242 C342 270 420 202 516 216 L516 432 L0 432 Z" fill="#B9D99A" opacity="0.9" filter="url(#wc2)"/>
    <path d="M0 330 C120 288 258 306 360 336 C430 356 480 346 516 336 L516 432 L0 432 Z" fill="#8FC27A" opacity="0.9" filter="url(#wc)"/>
    <path d="M58 300 C60 250 62 210 70 170 L84 170 C80 210 82 250 86 300 Z" fill="#9A6B48" filter="url(#wcS)"/>
    <g fill="#6FAE6B" opacity="0.88" filter="url(#wc)"><circle cx="76" cy="150" r="58"/><circle cx="118" cy="178" r="40"/><circle cx="36" cy="182" r="38"/></g>
    <path d="${PATH_D}" stroke="#D7B07A" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.75" filter="url(#wcS)"/>
    <path d="${PATH_D}" stroke="#A87A48" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 13" fill="none"/>
    <g filter="url(#wcS)">${filled}</g>
    <g>${empty}</g>
    <g transform="translate(424 196)"><g fill="#F3E2BF" filter="url(#wcS)"><circle cx="9" cy="13" r="7"/><circle cx="9" cy="27" r="7"/><circle cx="43" cy="13" r="7"/><circle cx="43" cy="27" r="7"/><rect x="9" y="13" width="34" height="14"/></g></g>
    <g fill="#E58AA0" filter="url(#wcS)"><circle cx="300" cy="384" r="7"/><circle cx="470" cy="392" r="6"/><circle cx="140" cy="410" r="6"/></g>
    <g fill="#F7D774" filter="url(#wcS)"><circle cx="330" cy="400" r="6"/><circle cx="420" cy="378" r="5"/></g>
  </g>
</svg>`;
}

// Верхний слой иллюстрации: всё, что движется (лучи солнца, бабочка, искры). Отдельный слой, чтобы
// фон не перерисовывался на каждом кадре. Собака ребёнка рисуется поверх (drawDog, core/screens/menu.js).
export const ILLUSTRATION_FRONT = `<svg ${NS} aria-hidden="true" width="100%" height="100%" viewBox="0 0 516 432">
  <g class="bk-sun-rays" stroke="#F2C25A" stroke-width="5" stroke-linecap="round" opacity="0.7"><path d="M432 14 v14"/><path d="M432 116 v14"/><path d="M378 72 h14"/><path d="M472 72 h14"/><path d="M394 34 l10 10"/><path d="M460 100 l10 10"/><path d="M470 34 l-10 10"/><path d="M404 100 l-10 10"/></g>
  <g transform="translate(424 196)">
    <path class="bk-sparkle" d="M56 -6 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#F7D774"/>
    <path class="bk-sparkle bk-sparkle-2" d="M-8 2 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#F7D774"/>
  </g>
  <g class="bk-butterfly"><g transform="translate(150 120)">
    <ellipse class="bk-wing-l" cx="-8" cy="0" rx="10" ry="13" fill="#E58AA0" opacity="0.85"/>
    <ellipse class="bk-wing-r" cx="8" cy="0" rx="10" ry="13" fill="#F2B5C3" opacity="0.85"/>
    <rect x="-1.5" y="-9" width="3" height="18" rx="1.5" fill="#5A4636"/>
  </g></g>
</svg>`;

// ---------- Мелкие значки ----------

export const starIcon = (fill = '#F4C34E', stroke = 'none') =>
  `<svg ${NS} aria-hidden="true" viewBox="0 0 24 24"><path d="${STAR_D}" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round" filter="url(#wcS)"/></svg>`;

export const boneIcon = (fill = '#EBD3A8') =>
  `<svg ${NS} aria-hidden="true" viewBox="0 0 36 36"><g fill="${fill}" filter="url(#wcS)">${BONE_PARTS}</g></svg>`;

export const pawIcon = (fill = '#C9623A') =>
  `<svg ${NS} aria-hidden="true" viewBox="0 0 48 48"><g fill="${fill}" filter="url(#wcS)"><ellipse cx="24" cy="31" rx="10" ry="8.5"/><circle cx="12" cy="20" r="4.5"/><circle cx="20" cy="13" r="4.5"/><circle cx="28" cy="13" r="4.5"/><circle cx="36" cy="20" r="4.5"/></g></svg>`;

export const lockIcon = () =>
  `<svg ${NS} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#7A6A5C" stroke-width="2" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>`;

// Цветное акварельное пятно под значком плитки.
export const blob = () => `<svg ${NS} aria-hidden="true" viewBox="0 0 68 68"><circle cx="34" cy="34" r="29" fill="currentColor" filter="url(#wcS)"/></svg>`;

// Полоска «Дорожка к косточке»: filled — доля 0..1.
export function trackBar(filled) {
  const w = Math.round(472 * Math.max(0, Math.min(1, filled)));
  return `<svg ${NS} aria-hidden="true" width="100%" height="100%" viewBox="0 0 500 30" preserveAspectRatio="none">
  ${w > 0 ? `<rect x="4" y="6" width="${w}" height="18" rx="9" fill="#F4C34E" filter="url(#wcS)"/>` : ''}
  <rect x="3" y="5" width="494" height="20" rx="10" fill="none" stroke="#5A4636" stroke-width="2.2" filter="url(#rough)"/>
</svg>`;
}

// Хвостик у реплики Бобика.
export const SPEECH_TAIL = `<svg ${NS} aria-hidden="true" viewBox="0 0 34 26"><path d="M4 0 C10 10 8 18 2 24 C14 20 22 12 26 0" fill="#FFFDF6" stroke="#5A4636" stroke-width="2.5" stroke-linejoin="round"/><rect x="3" y="-3" width="25" height="5" fill="#FFFDF6"/></svg>`;

// Лапка и косточка цвета currentColor — для дорожки серии (core/screens/series-track.js).
export const pawMark = () =>
  `<svg ${NS} aria-hidden="true" viewBox="0 0 24 24"><g fill="currentColor" filter="url(#wcS)"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="10" cy="6.5" r="2.2"/><circle cx="14" cy="6.5" r="2.2"/><circle cx="18" cy="10" r="2.2"/></g></svg>`;

export const boneMark = () =>
  `<svg ${NS} aria-hidden="true" viewBox="0 0 52 40"><g fill="currentColor" filter="url(#wcS)"><circle cx="9" cy="13" r="7"/><circle cx="9" cy="27" r="7"/><circle cx="43" cy="13" r="7"/><circle cx="43" cy="27" r="7"/><rect x="9" y="13" width="34" height="14"/></g></svg>`;

// Домик «домой»: контурный, цвет — акцентный `#C9623A` (как в эскизе).
export const homeIcon = () =>
  `<svg ${NS} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#C9623A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11 L12 4 l8.5 7"/><path d="M6 9.5 V20 h12 V9.5"/><path d="M10 20 v-5 h4 v5"/></svg>`;
