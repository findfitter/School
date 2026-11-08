// Рисунок комнаты ребёнка для миссии «Уборка комнаты»: два вида (ТЗ, раздел 8.10), чистая комната, акварель.
//   A — от двери к окну (стол под окном, кухня, книжная полка, диван слева, кровать справа);
//   B — от окна к двери (шкаф, проём в коридор, полка с ящиками, кровать слева, диван справа).
// Рисунок собран кодом по эталонам design/room-ref/*.png. Предметы нарисованы в координатах эталона (828×548, комната
// занимает x 33–795, y 32–515), а группа ниже переводит их в базовый кадр 380×250 из ТЗ (matrix в px2box).
// Одна сцена — один SVG-фильтр «акварель» на всю картинку (смещение контуров, пятна воды, зерно): комната статична,
// рисуется один раз, поэтому слой не перерисовывается (class room-art: will-change в mission.css).
// Каждая зона — группа с data-zone (desk, floor, bed, sofa, doll, kallax, shelf): по ней комната подсвечивает выбор.
// Цвета палитры — CSS-переменные --room-* (core/styles/mission.css). Беспорядка пока нет (ТЗ 8.8 — позже).

const NS = 'xmlns="http://www.w3.org/2000/svg"';

const C = {
  ink: 'var(--room-ink)', wall: 'var(--room-wall)', wallFar: 'var(--room-wall-far)', ceiling: 'var(--room-ceiling)',
  floor: 'var(--room-floor)', seam: 'var(--room-seam)', rug: 'var(--room-rug)', heart: 'var(--room-heart)',
  sofa: 'var(--room-sofa)', sofaSeat: 'var(--room-sofa-seat)', sofaSide: 'var(--room-sofa-side)', bed: 'var(--room-bed)',
  blanket: 'var(--room-blanket)', curtain: 'var(--room-curtain)', wood: 'var(--room-wood)', wood2: 'var(--room-wood2)',
  chair: 'var(--room-chair)', lilac: 'var(--room-lilac)', lol: 'var(--room-lol)',
  // мелочи вне основной палитры
  pink: '#f4b8cc', pinkDeep: '#eba3bc', pinkPale: '#fbe3ea', white: '#fbf8f1', brown: '#a9744f', tan: '#c9a27a', cream: '#f4efe3',
};
const NOINK = 'stroke="none"';

// ---------- Мелкие помощники: возвращают строки SVG ----------
const pts = (a) => a.map((p) => p.join(',')).join(' ');
const poly = (a, fill, ex = '') => `<polygon points="${pts(a)}" fill="${fill}" ${ex}/>`;
const rect = (x, y, w, h, fill, rx = 0, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${ex}/>`;
const circ = (cx, cy, r, fill, ex = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${ex}/>`;
const ell = (cx, cy, rx, ry, fill, ex = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${ex}/>`;
const path = (d, fill, ex = '') => `<path d="${d}" fill="${fill}" ${ex}/>`;
const line = (d, ex = '') => `<path d="${d}" fill="none" ${ex}/>`;
const shadow = (cx, cy, rx, ry) => ell(cx, cy, rx, ry, 'rgba(90,70,54,0.16)', NOINK); // мягкая контактная тень под мебелью
const zone = (id, body) => `<g data-zone="${id}">${body}</g>`;
const mirror = (body, axis = 829) => `<g transform="translate(${axis} 0) scale(-1 1)">${body}</g>`; // отражение вокруг вертикали x = axis / 2

// Детерминированный «случай»: рисунок одинаков при каждом запуске.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const HEART = 'M0 3 C-8 -3 -4 -9 0 -4 C4 -9 8 -3 0 3Z';

// ---------- Оболочка: потолок, стены, пол, светильник, горошины, помпоны ----------
const BACK = { x1: 195, y1: 132, x2: 634, y2: 412 }; // дальняя стена в px эталона
const VP = [414, 272]; // точка схода — центр дальней стены

function dots(seed, n, region, squeeze = 1) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = region(r(), r());
    const size = 3 + r() * 4.5;
    const fill = r() < 0.55 ? '#f3bfcf' : '#b6c8d3';
    out += ell(x.toFixed(1), y.toFixed(1), (size * squeeze).toFixed(1), size.toFixed(1), fill, NOINK);
  }
  return out;
}

function pompom(x, y, r) {
  return `<g ${NOINK}>${circ(x, y, r, '#f6c3d3')}${circ(x - r * 0.15, y - r * 0.15, r * 0.62, '#f9d9e3')}</g>`;
}

function shell(view, pompoms) {
  const id = `rm-floor-${view}`;
  let boards = '';
  for (let xb = BACK.x1; xb <= BACK.x2 + 1; xb += 21.9) {
    const x2 = VP[0] + (xb - VP[0]) * ((515 - VP[1]) / (BACK.y2 - VP[1]));
    boards += `M${xb.toFixed(1)} ${BACK.y2} L${x2.toFixed(1)} 515 `;
  }
  const leftWall = (u, v) => { const x = 40 + u * 145; const top = 32 + (x - 33) * (100 / 162); const bot = 515 - (x - 33) * (103 / 162); return [x, top + 14 + v * (bot - top - 28)]; };
  const rightWall = (u, v) => { const x = 645 + u * 140; const top = 32 + (795 - x) * (100 / 161); const bot = 515 - (795 - x) * (103 / 161); return [x, top + 14 + v * (bot - top - 28)]; };
  return `
  <clipPath id="${id}"><polygon points="${pts([[33, 515], [795, 515], [BACK.x2, BACK.y2], [BACK.x1, BACK.y2]])}"/></clipPath>
  ${rect(10, 10, 808, 528, C.wall, 0, NOINK)}
  ${poly([[20, 20], [808, 20], [634, 132], [195, 132]], C.ceiling)}
  ${poly([[20, 20], [195, 132], [195, 412], [20, 528]], C.wall)}
  ${poly([[808, 20], [634, 132], [634, 412], [808, 528]], C.wall)}
  ${rect(195, 132, 439, 280, C.wallFar)}
  ${poly([[20, 528], [808, 528], [634, 412], [195, 412]], C.floor)}
  <g clip-path="url(#${id})">${line(boards, `stroke="${C.seam}" stroke-width="1.5" stroke-opacity="0.75"`)}</g>
  ${line('M195 132 H634 V412 H195 Z M33 32 L195 132 M795 32 L634 132 M33 515 L195 412 M795 515 L634 412', 'stroke="#9fb3bd" stroke-width="1.8" stroke-opacity="0.8"')}
  ${dots(7, 16, (u, v) => [BACK.x1 + 8 + u * 423, BACK.y1 + 8 + v * 150])}
  ${dots(21, 11, leftWall, 0.6)}
  ${dots(33, 11, rightWall, 0.6)}
  ${pompoms}
  ${rect(374, 60, 80, 18, '#8d8d92', 7, 'stroke="#5a4636" stroke-opacity="0.45"')}
  ${ell(414, 83, 33, 6, '#f6e6a6', NOINK)}`;
}

// ---------- Окно со шторами (вид A) ----------
function windowArt() {
  const curtain = path('M296 172 H341 V382 C330 388 312 386 305 380 C298 340 306 305 300 290 C292 250 300 210 296 172Z', C.curtain)
    + line('M312 180 C318 250 314 330 318 380 M326 176 C328 260 330 330 332 382', 'stroke="#9fc4b4" stroke-width="1.4" stroke-opacity="0.7"');
  const city = `<g ${NOINK} fill="#c3d9e6">${rect(347, 270, 20, 35, '#c3d9e6')}${rect(372, 282, 20, 23, '#bcd3e1')}${rect(424, 256, 18, 49, '#bcd3e1')}${rect(446, 276, 22, 29, '#c3d9e6')}${rect(470, 266, 12, 39, '#bcd3e1')}</g>`;
  return `
  ${line('M284 171 H544', 'stroke="#d9c7a3" stroke-width="3.4"')}
  ${rect(338, 187, 152, 125, C.white, 3)}
  ${rect(345, 195, 65, 110, '#cfe6f2', 1)}${rect(418, 195, 66, 110, '#d6eaf4', 1)}
  ${city}
  ${circ(378, 223, 10, '#f3cb55', NOINK)}${circ(450, 232, 8.5, '#f4a9c0', NOINK)}
  ${rect(326, 304, 176, 14, C.white, 3)}
  ${curtain}${mirror(curtain)}`;
}

// ---------- Мебель вида A ----------
function desk() {
  return zone('desk', `
  ${shadow(414, 414, 92, 6)}
  ${rect(330, 344, 10, 68, C.white, 2)}${rect(446, 344, 56, 68, C.white, 3)}${line('M446 372 H502', 'stroke-opacity="0.6"')}${circ(474, 360, 3, '#b9ac94', NOINK)}${circ(474, 390, 3, '#b9ac94', NOINK)}
  ${rect(326, 332, 176, 12, C.white, 3)}
  ${ell(366, 323, 22, 10.5, C.brown)}${circ(349, 321, 7, '#b88459')}${circ(346, 319, 1.6, '#4a3526', NOINK)}${circ(358, 313, 3, '#8f5f3c', NOINK)}
  ${rect(412, 316, 18, 16, C.chair, 3)}${line('M418 316 L415 299', 'stroke="#f3cb55" stroke-width="3" stroke-opacity="1"')}${line('M425 316 L428 301', 'stroke="#f0913c" stroke-width="3" stroke-opacity="1"')}
  ${poly([[447, 294], [473, 294], [488, 331], [436, 331]], 'rgba(255, 238, 140, 0.34)', NOINK)}${ell(489, 331, 7, 2.5, '#cfc4b0')}${line('M489 330 L482 306 L463 282', 'stroke-width="2.6" stroke-opacity="0.75"')}${poly([[455, 278], [465, 278], [474, 294], [446, 294]], '#f2e06a')}${ell(460, 295, 10, 2.4, '#fff6b8', NOINK)}
  ${rect(378, 351, 72, 56, C.chair, 14)}${rect(387, 357, 54, 40, C.lilac, 9)}${circ(414, 372, 2.2, '#9d86bd', NOINK)}${circ(414, 385, 2.2, '#9d86bd', NOINK)}
  ${rect(386, 396, 56, 11, C.pinkDeep, 5)}${rect(411, 407, 6, 14, '#b9aeb6', 2)}${line('M380 428 H448', 'stroke="#8d7f88" stroke-width="3.5" stroke-opacity="0.8"')}${circ(382, 432, 3.5, '#8d7f88', NOINK)}${circ(446, 432, 3.5, '#8d7f88', NOINK)}${circ(414, 431, 3.5, '#8d7f88', NOINK)}
  `);
}

function kitchen() {
  return zone('doll', `
  ${shadow(250, 414, 54, 4)}
  ${rect(201, 268, 93, 144, C.wood, 3)}
  ${rect(209, 277, 77, 61, C.cream, 2)}
  ${rect(218, 295, 44, 30, C.white, 3)}${rect(224, 300, 25, 19, '#c9d4dc', 2)}${circ(255, 304, 2.6, '#b9ac94', NOINK)}${circ(255, 313, 2.6, '#b9ac94', NOINK)}
  ${rect(267, 304, 16, 19, C.chair, 3)}${line('M270 304 Q275 297 280 304', 'stroke-width="2"')}
  ${rect(247, 336, 38, 11, '#3a3a3e', 2)}${circ(257, 341, 3.5, '#767680', NOINK)}${circ(274, 341, 3.5, '#767680', NOINK)}
  ${rect(247, 348, 43, 64, C.white, 2)}${rect(256, 370, 4, 14, '#a9743c', 2, NOINK)}${rect(274, 370, 4, 14, '#a9743c', 2, NOINK)}
  ${rect(209, 348, 36, 64, C.cream, 2)}
  <g>
  ${path('M214 237 C214 223 232 224 232 240 C232 248 226 252 221 250Z', '#c8503c')}${circ(224, 243, 8, '#f2c9a0')}
  ${path('M222 250 C232 250 233 262 230 270 C227 265 224 268 220 270 C220 262 218 256 222 250Z', '#58b58a')}
  ${ell(262, 262, 13, 10, '#c9c9cb')}${ell(255, 245, 4, 11, '#c9c9cb')}${ell(268, 246, 4, 11, '#c9c9cb')}${ell(255, 246, 1.8, 7, '#f1bccb', NOINK)}${ell(268, 247, 1.8, 7, '#f1bccb', NOINK)}${circ(258, 260, 1.3, '#4a3526', NOINK)}${circ(267, 260, 1.3, '#4a3526', NOINK)}
  </g>
  `);
}

function lolHouse() {
  return `<g data-zone="doll">
  ${shadow(214, 428, 44, 4)}
  ${poly([[176, 344], [190, 333], [250, 333], [246, 344]], '#7b93d6')}
  ${rect(176, 344, 70, 84, C.lol, 2)}
  ${rect(214, 364, 20, 24, '#f4a9c8', 7)}${rect(186, 368, 16, 18, '#f4a9c8', 8)}
  </g>`;
}

function bookShelf() {
  const tier = (y, h, books) => {
    let x = 559; let out = '';
    for (const [w, c, ht] of books) { out += rect(x, y + h - ht, w, ht, c, 1, 'stroke-opacity="0.5" stroke-width="1.1"'); x += w + 1.5; }
    return out;
  };
  return zone('shelf', `
  ${rect(556, 252, 56, 12, '#f9cfa9', 2)}${rect(558, 264, 52, 12, '#f6b9cc', 2)}${rect(555, 276, 58, 12, '#b8ccd8', 2)}
  ${rect(549, 288, 73, 112, C.wood, 3)}${rect(557, 296, 57, 98, '#f3e4c2', 2)}
  ${tier(298, 44, [[7, '#f2a3bd', 38], [10, '#58b4b0', 42], [8, '#f3cb55', 36], [9, '#b69ad8', 40], [7, '#f2a3bd', 34]])}
  ${line('M557 342 H614', 'stroke-width="2"')}
  ${tier(344, 28, [[10, '#58b4b0', 26], [8, '#f3cb55', 22], [9, '#b69ad8', 25], [10, '#fbf8f1', 24]])}
  ${line('M557 372 H614', 'stroke-width="2"')}
  ${tier(374, 24, [[9, '#f2a3bd', 20], [10, '#58b4b0', 22]])}
  `);
}

function rug() {
  const r = rng(5);
  let hearts = '';
  const rows = [[456, [338, 380, 422, 464, 497]], [469, [324, 368, 412, 456, 500]], [482, [312, 358, 404, 450, 496, 524]]];
  for (const [y, xs] of rows) for (const x of xs) hearts += `<path d="${HEART}" transform="translate(${(x + (r() - 0.5) * 6).toFixed(1)} ${y}) scale(${(0.8 + r() * 0.3).toFixed(2)})" fill="${C.heart}" ${NOINK}/>`;
  return zone('floor', `${path('M272 489 C290 478 296 462 301 447 C340 444 470 444 512 447 C516 462 528 478 538 489 C470 492 340 492 272 489Z', C.rug, 'stroke-opacity="0.35"')}${hearts}`);
}

// ---------- Диван (вид A; вид B — его отражение) ----------
// Розовый плюшевый гусь: тело, изогнутая шея, голова с оранжевым клювом, крыло.
function goose() {
  return `<g>
  ${poly([[137, 358], [152, 349], [148, 367]], '#f2a3c3')}
  ${ell(118, 368, 25, 16, '#f2a3c3')}
  ${ell(124, 369, 12, 8, '#e68db0', NOINK)}
  ${path('M104 362 C95 348 95 336 101 328 L111 330 C108 340 110 350 117 360 Z', '#f2a3c3')}
  ${circ(101, 323, 9.5, '#f2a3c3')}
  ${poly([[92, 322], [79, 326], [92, 330]], '#f29a3c')}
  ${circ(99, 321, 1.8, '#4a3526', NOINK)}
  </g>`;
}

// Плюшевый единорог: светло-розовый, сиреневые грива и хвост, золотой рог.
function unicorn() {
  return `<g>
  ${ell(160, 373, 6, 12, C.lilac)}
  ${ell(178, 369, 24, 17, '#f9d6e4')}
  ${ell(186, 350, 5.5, 11, C.lilac, 'transform="rotate(20 186 350)"')}
  ${circ(196, 352, 12, '#f9d6e4')}
  ${ell(204, 357, 6, 4.5, '#fbe6ee', NOINK)}
  ${poly([[190, 344], [192, 332], [198, 342]], '#f9d6e4')}
  ${poly([[199, 341], [205, 319], [210, 341]], '#f3cb55')}
  ${circ(199, 351, 2, '#4a3526', NOINK)}
  </g>`;
}

function sofa() {
  return zone('sofa', `
  ${shadow(170, 492, 100, 9)}
  ${poly([[188, 388], [236, 377], [236, 433], [188, 485]], C.sofaSide)}
  ${poly([[82, 388], [188, 388], [236, 377], [126, 377]], C.sofaSeat)}
  ${goose()}${unicorn()}
  ${rect(82, 386, 106, 98, C.sofa, 20)}${rect(90, 394, 90, 42, C.sofaSeat, 14, NOINK)}
  ${rect(98, 484, 5, 9, C.white, 2)}${rect(168, 484, 5, 9, C.white, 2)}
  `);
}

function bedA() {
  const fox = `<g transform="translate(0 -2)">
    ${poly([[638, 449], [641, 435], [650, 445]], '#f0903c')}${poly([[662, 449], [659, 435], [650, 445]], '#f0903c')}
    ${circ(650, 458, 14, '#f0903c')}${path('M637 462 Q650 478 663 462 Q650 468 637 462Z', C.white, NOINK)}${circ(644, 457, 1.8, '#4a3526', NOINK)}${circ(656, 457, 1.8, '#4a3526', NOINK)}${ell(650, 465, 2.6, 2, '#2e2420', NOINK)}
  </g>`;
  return zone('bed', `
  ${shadow(650, 497, 128, 8)}
  ${poly([[512, 352], [682, 352], [682, 368], [512, 368]], C.bed)}
  ${poly([[514, 368], [686, 368], [748, 398], [540, 398]], C.blanket)}
  ${line('M528 376 H700 M538 384 H724', `stroke="${C.heart}" stroke-width="1.2" stroke-dasharray="6 5" stroke-opacity="0.8"`)}
  ${ell(604, 390, 48, 8.5, C.pinkPale, 'stroke-opacity="0.3"')}
  ${poly([[512, 352], [540, 392], [540, 494], [512, 460]], C.bed)}
  ${path('M540 494 V420 Q540 392 568 392 H734 Q762 392 762 420 V494 Z', C.bed)}${fox}
  `);
}

// ---------- Мебель вида B ----------
function wardrobe() {
  return `<g data-decor="wardrobe">
  ${shadow(286, 414, 94, 5)}
  ${rect(210, 164, 25, 24, '#f4bdd0', 3)}${rect(242, 155, 52, 33, C.white, 4)}${rect(301, 147, 37, 41, '#c8a878', 3)}${circ(358, 172, 17, '#d9686d')}
  ${rect(198, 188, 88, 224, C.wood2, 2)}${rect(286, 188, 88, 224, C.wood2, 2)}
  ${line('M227 200 V404 M258 200 V404 M318 200 V404 M347 200 V404', 'stroke-opacity="0.22" stroke-width="1.2"')}
  ${rect(274, 276, 5, 52, '#a9743c', 2.5, NOINK)}${rect(293, 276, 5, 52, '#a9743c', 2.5, NOINK)}
  ${rect(378, 331, 32, 81, C.white, 2)}${line('M378 372 H410', 'stroke-opacity="0.5"')}
  ${rect(384, 381, 28, 30, C.white, 3)}${circ(394, 381, 6, '#f4a9c8', NOINK)}${circ(405, 383, 5.5, '#a9744f', NOINK)}
  </g>`;
}

function doorway() {
  return `<g data-decor="doorway">
  ${rect(450, 184, 92, 228, C.white, 3)}
  ${rect(462, 196, 68, 216, '#eadcc0', 0, NOINK)}
  ${rect(480, 240, 32, 136, '#f2eee2', 2)}${line('M488 252 V366 M504 252 V366', 'stroke-opacity="0.15"')}
  ${poly([[462, 376], [530, 376], [530, 412], [462, 412]], '#e6c597', NOINK)}${poly([[478, 384], [516, 384], [521, 410], [475, 410]], '#f2e19b', 'stroke-opacity="0.35"')}
  </g>`;
}

function kallax() {
  return zone('kallax', `
  ${shadow(622, 434, 48, 6)}
  ${path('M668 238 A14 14 0 0 0 640 238', 'none', 'stroke="#f2a07b" stroke-width="7" stroke-opacity="1"')}${path('M662 240 A8 8 0 0 0 646 240', 'none', 'stroke="#f6bfa4" stroke-width="4" stroke-opacity="1"')}
  ${poly([[609, 244], [621, 203], [634, 244]], C.lilac)}${circ(621, 199, 6, '#f4a9c8', NOINK)}
  ${poly([[577, 248], [600, 244], [600, 432], [577, 408]], C.bed)}
  ${poly([[579, 282], [598, 279], [598, 318], [579, 312]], '#f9c4d6')}${poly([[579, 347], [598, 346], [598, 386], [579, 378]], '#f9c4d6')}
  ${rect(600, 244, 64, 188, C.bed, 2)}
  `);
}

function bedB() {
  return zone('bed', `
  ${shadow(200, 481, 118, 7)}
  ${rect(170, 334, 156, 80, C.bed, 24)}
  ${ell(236, 381, 51, 9.5, C.pinkPale, 'stroke-opacity="0.3"')}
  ${poly([[172, 388], [326, 388], [300, 426], [90, 426]], C.blanket)}
  ${line('M170 399 H316 M140 410 H300', `stroke="${C.heart}" stroke-width="1.2" stroke-dasharray="6 5" stroke-opacity="0.8"`)}
  ${poly([[300, 426], [326, 388], [326, 452], [296, 478]], C.bed)}
  ${rect(90, 426, 206, 52, C.bed, 7)}
  `);
}

function sofaB() {
  // тот же диван, отражённый; сдвиг на 10 px — по эталону B
  return `<g transform="translate(10 0)">${mirror(sofa(), 829)}</g>`;
}

// ---------- Сборка ----------
const VIEWS = {
  A: {
    pompoms: [[246, 172, 15], [230, 200, 6], [573, 195, 6], [694, 151, 15], [738, 152, 5], [686, 228, 6], [84, 112, 7]].map((p) => pompom(...p)).join(''),
    body: () => [windowArt(), bookShelf(), kitchen(), desk(), rug(), lolHouse(), sofa(), bedA()].join(''),
  },
  B: {
    pompoms: [[134, 168, 15], [142, 212, 6], [86, 148, 5], [426, 155, 6], [750, 112, 6], [706, 224, 6]].map((p) => pompom(...p)).join(''),
    body: () => [wardrobe(), doorway(), kallax(), rug(), bedB(), sofaB()].join(''),
  },
};

// Фильтр акварели для всей сцены (значения — в единицах эталона). Смещение контуров и зерно — как у остальных рисунков
// приложения, но один проход на всю картинку, а не на каждый предмет.
function filterDef(id) {
  return `<filter id="${id}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="2" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.55 0 0 0 0.72" result="ga"/>
    <feComposite in="d" in2="ga" operator="in"/>
  </filter>`;
}

// SVG-разметка комнаты (view — 'A' или 'B'). Кадр 380×250; предметы лежат в координатах эталона (px2box).
export function roomMarkup(view = 'A') {
  const v = VIEWS[view] || VIEWS.A;
  const fid = `rm-wc-${view}`;
  const px2box = 'matrix(0.4987 0 0 0.5176 -16.46 -16.56)';
  return `<svg ${NS} class="room-art" data-view="${view}" role="img" viewBox="0 0 380 250" preserveAspectRatio="xMidYMid meet">
  <defs>${filterDef(fid)}</defs>
  <g transform="${px2box}">
    <g filter="url(#${fid})" stroke="${C.ink}" stroke-opacity="0.5" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">
      ${shell(view, v.pompoms)}
      ${v.body()}
    </g>
  </g>
</svg>`;
}

// Готовый элемент SVG (без внешних зависимостей, чтобы страницу просмотра design/room-preview.html можно было открыть отдельно).
export function drawRoom(view = 'A', label = '') {
  const doc = new DOMParser().parseFromString(roomMarkup(view), 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  if (label) el.setAttribute('aria-label', label);
  else el.removeAttribute('role');
  return el;
}
