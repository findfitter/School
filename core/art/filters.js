// Общие SVG-фильтры «акварели» (значения — design/README.md, раздел 7). Вставляются в <body> один раз:
// дальше любой экран ссылается на них как filter="url(#wc)" или CSS filter: url(#stampInk).
// Фактура бумаги здесь не нужна: её рисует один раз core/art/textures.js (картинка вместо живого фильтра на весь экран).
// Маски сюда НЕ кладём: маска из скрытого <svg width=0> в Chrome прячет всю картинку — её объявляют
// внутри того же <svg>, где она используется. Сам <svg> не display:none (в нём фильтры не работают).

const NS = 'http://www.w3.org/2000/svg';
const MARK = 'book-filters';

// Акварель: смещаем контур шумом, прорежаем заливку зерном, поверх — тёмная кромка по контуру.
// Число октав шума — наименьшее, при котором разницы глазом не видно (каждая октава — лишний проход по пикселям).
function watercolor(id, { region, freq, octaves = 1, scale, seed, grain, grainOctaves = 1, grainSeed, alpha, erode, edge, edgeAlpha }) {
  const [x, size] = region;
  return `<filter id="${id}" x="${x}%" y="${x}%" width="${size}%" height="${size}%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="${grain}" numOctaves="${grainOctaves}" seed="${grainSeed}" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${alpha[0]} 0 0 0 ${alpha[1]}" result="ga"/>
    <feComposite in="d" in2="ga" operator="in" result="t"/>
    <feMorphology in="d" operator="erode" radius="${erode}" result="er"/>
    <feComposite in="d" in2="er" operator="out" result="edge"/>
    <feColorMatrix in="edge" type="matrix" values="${edge[0]} 0 0 0 0  0 ${edge[1]} 0 0 0  0 0 ${edge[2]} 0 0  0 0 0 ${edgeAlpha} 0" result="ed"/>
    <feMerge><feMergeNode in="t"/><feMergeNode in="ed"/></feMerge>
  </filter>`;
}

const FILTERS = [
  // Крупные пятна: облака, солнце, ближний холм
  watercolor('wc', { region: [-15, 130], freq: 0.03, octaves: 2, scale: 16, seed: 4, grain: 0.7, grainSeed: 9, alpha: [0.9, 0.45], erode: 1.6, edge: [0.72, 0.72, 0.72], edgeAlpha: 0.55 }),
  // Небо, дальний холм, пятна стола
  watercolor('wc2', { region: [-15, 130], freq: 0.022, octaves: 2, scale: 22, seed: 11, grain: 0.55, grainSeed: 3, alpha: [1, 0.35], erode: 2, edge: [0.75, 0.75, 0.75], edgeAlpha: 0.5 }),
  // Мелочь: звёзды, значки, пятна под глифами, заливка полос
  watercolor('wcS', { region: [-25, 150], freq: 0.08, scale: 6, seed: 6, grain: 0.9, grainSeed: 2, alpha: [0.9, 0.5], erode: 1, edge: [0.7, 0.7, 0.7], edgeAlpha: 0.6 }),
  // Собака: почти без смещения, тёмно-коричневая кромка
  watercolor('wcDog', { region: [-10, 120], freq: 0.06, scale: 3, seed: 5, grain: 0.9, grainSeed: 7, alpha: [0.6, 0.65], erode: 1.2, edge: [0.45, 0.4, 0.38], edgeAlpha: 0.75 }),
  // Рваный край и нарисованные от руки контуры
  `<filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="1" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`,
  // Печать: оттиск с неровной краской
  `<filter id="stampInk" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="12" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.2 0 0 0 -0.55" result="ga"/>
    <feComposite in="SourceGraphic" in2="ga" operator="in"/>
  </filter>`,
  // Наклейка: акварельный рисунок, белая вырубка по контуру и мягкая тень (Stickers.dc.html)
  `<filter id="stk" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="1" seed="6" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.7 0 0 0 0.6" result="ga"/>
    <feComposite in="d" in2="ga" operator="in" result="t"/>
    <feMorphology in="SourceAlpha" operator="dilate" radius="3.5" result="dil"/>
    <feFlood flood-color="#FFFDF8" result="white"/>
    <feComposite in="white" in2="dil" operator="in" result="border"/>
    <feGaussianBlur in="dil" stdDeviation="2.5" result="bl"/>
    <feOffset in="bl" dy="3" result="off"/>
    <feFlood flood-color="#5A4636" flood-opacity="0.3" result="sc"/>
    <feComposite in="sc" in2="off" operator="in" result="shadow"/>
    <feMerge><feMergeNode in="shadow"/><feMergeNode in="border"/><feMergeNode in="t"/></feMerge>
  </filter>`,
  // Карандашный набросок «ещё не наклеено»: контур грифелем и бледная подкраска (Stickers.dc.html)
  `<filter id="pencil" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.3" result="dil"/>
    <feComposite in="dil" in2="SourceAlpha" operator="out" result="ring"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="1" seed="8" result="n"/>
    <feDisplacementMap in="ring" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="wob"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.2" result="ga"/>
    <feComposite in="wob" in2="ga" operator="in" result="grainy"/>
    <feFlood flood-color="#8C7B68" flood-opacity="0.85" result="lead"/>
    <feComposite in="lead" in2="grainy" operator="in" result="line"/>
    <feFlood flood-color="#E9DFCC" flood-opacity="0.35" result="tint"/>
    <feComposite in="tint" in2="SourceAlpha" operator="in" result="fill"/>
    <feMerge><feMergeNode in="fill"/><feMergeNode in="line"/></feMerge>
  </filter>`,
];

export function installFilters() {
  if (document.getElementById(MARK)) return;
  const markup = `<svg xmlns="${NS}" id="${MARK}" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;pointer-events:none"><defs>${FILTERS.join('')}</defs></svg>`;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  document.body.append(document.importNode(doc.documentElement, true));
}
