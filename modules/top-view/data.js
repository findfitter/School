// Данные модуля «Вид сверху».
// SOLIDS — предметы и геометрические тела: рисунок спереди/сбоку (front) и вид сверху (top), оба в рамке 100×100.
// У каждого вида сверху свой topKey: два варианта с одинаковым topKey на одном экране не показываются
// (иначе два верных ответа). Лежащий цилиндр и брусок сверху одинаково прямоугольные — у них общий topKey.

const INK = '#5a4636'; // мягкие коричневые линии (без чёрных контуров)

// ---------- Объёмные рисунки (изометрия) ----------
const mix = (hex, other, t) => {
  const a = hex.replace('#', '');
  const b = other.replace('#', '');
  const ch = (i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
  return `#${[0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`;
};
const tone = (base) => ({ top: mix(base, '#ffffff', 0.45), left: base, right: mix(base, '#000000', 0.25) });

const SCALE = 22;
const project = ([x, y, z]) => [(x - y) * SCALE * 0.866, (x + y) * SCALE * 0.5 - z * SCALE];

// faces — [{ pts: [[x, y, z], …], fill }] в порядке рисования; рисунок вписывается в рамку 100×100.
function solid(faces) {
  const drawn = faces.map((f) => ({ fill: f.fill, p: f.pts.map(project) }));
  const xs = drawn.flatMap((f) => f.p.map((q) => q[0]));
  const ys = drawn.flatMap((f) => f.p.map((q) => q[1]));
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(78 / (maxX - minX), 78 / (maxY - minY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return drawn
    .map((f) => `<polygon points="${f.p.map(([x, y]) => `${(50 + (x - cx) * k).toFixed(1)},${(50 + (y - cy) * k).toFixed(1)}`).join(' ')}" fill="${f.fill}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`)
    .join('');
}

// Брусок w×d×h: видны левая (y = d), правая (x = w) и верхняя грани.
function box(w, d, h, base) {
  const t = tone(base);
  return solid([
    { pts: [[0, d, 0], [w, d, 0], [w, d, h], [0, d, h]], fill: t.left },
    { pts: [[w, 0, 0], [w, d, 0], [w, d, h], [w, 0, h]], fill: t.right },
    { pts: [[0, 0, h], [w, 0, h], [w, d, h], [0, d, h]], fill: t.top },
  ]);
}

function pyramid4(base) {
  const t = tone(base);
  const apex = [0.5, 0.5, 1.1];
  return solid([
    { pts: [[0, 1, 0], [1, 1, 0], apex], fill: t.left },
    { pts: [[1, 0, 0], [1, 1, 0], apex], fill: t.right },
  ]);
}

// Прямая призма с правильным n-угольником в основании (стоит): видны только передние боковые грани, сверху — n-угольник.
// Свет слева: грань светлее, чем больше она повёрнута к левому нижнему углу. offsetDeg — поворот основания.
function nPrism(n, base, offsetDeg = 0) {
  const t = tone(base);
  const rad = (deg) => (deg * Math.PI) / 180;
  const ring = (z) => Array.from({ length: n }, (_, k) => [1 + 0.9 * Math.cos(rad(offsetDeg + (360 * k) / n)), 1 + 0.9 * Math.sin(rad(offsetDeg + (360 * k) / n)), z]);
  const low = ring(0);
  const high = ring(1.1);
  const sides = low
    .map((p, k) => ({ pts: [p, low[(k + 1) % n], high[(k + 1) % n], high[k]], mid: rad(offsetDeg + (360 * (k + 0.5)) / n) }))
    .filter((f) => Math.cos(f.mid - Math.PI / 4) > 0)
    .map((f) => ({ pts: f.pts, fill: mix(base, '#000000', 0.3 * (1 - (1 + Math.cos(f.mid - rad(110))) / 2)) }));
  return solid([...sides, { pts: high, fill: t.top }]);
}

// Лесенка из трёх ступеней: самая высокая — дальняя.
function stairs(base) {
  const t = tone(base);
  const d = 1.4;
  const faces = [];
  [3, 2, 1].forEach((h, i) => {
    faces.push({ pts: [[i, d, 0], [i + 1, d, 0], [i + 1, d, h], [i, d, h]], fill: t.left });
    faces.push({ pts: [[i + 1, 0, 0], [i + 1, d, 0], [i + 1, d, h], [i + 1, 0, h]], fill: t.right });
    faces.push({ pts: [[i, 0, h], [i + 1, 0, h], [i + 1, d, h], [i, d, h]], fill: t.top });
  });
  return solid(faces);
}

// ---------- Плоские рисунки по формулам ----------
const pt = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
// правильный n-угольник: первая вершина под углом startDeg (−90 — вершина вверху)
const ngon = (n, startDeg, r, cy = 50) => fmt(Array.from({ length: n }, (_, k) => pt(50, cy, r, startDeg + (360 * k) / n)));
// звезда с n лучами
const star = (n, rOut, rIn) => fmt(Array.from({ length: n * 2 }, (_, k) => pt(50, 50, k % 2 ? rIn : rOut, -90 + (180 * k) / n)));
// круг, разрезанный на n долек по цветам (зонтик сверху)
const pie = (n, r, colors) =>
  Array.from({ length: n }, (_, k) => {
    const [x1, y1] = pt(50, 50, r, -90 + (360 * k) / n);
    const [x2, y2] = pt(50, 50, r, -90 + (360 * (k + 1)) / n);
    return `<path d="M50 50 L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${colors[k % colors.length]}"/>`;
  }).join('');
// n кружков по кругу (лепестки)
const petals = (n, dist, r, attrs, cy = 50) =>
  Array.from({ length: n }, (_, k) => {
    const [x, y] = pt(50, cy, dist, -90 + (360 * k) / n);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" ${attrs}/>`;
  }).join('');

// Треугольная призма «палатка» (лежит): скат и торец.
function prismTent(base) {
  const t = tone(base);
  const w = 2;
  const d = 1.4;
  const h = 1;
  return solid([
    { pts: [[0, d, 0], [w, d, 0], [w, d / 2, h], [0, d / 2, h]], fill: t.left },
    { pts: [[w, 0, 0], [w, d, 0], [w, d / 2, h]], fill: t.right },
  ]);
}

const GEOM_COLORS = { cube: '#7fb3d5', cuboid: '#afa2df', pyramid: '#f4c34e', hex: '#8fc27a', tent: '#e58aa0', prism3: '#e0a06a', prism5: '#6fbfb0', oct: '#b48fd4', stairs: '#d3a679' };

export const SOLIDS = [
  // ----- предметы -----
  {
    id: 'ball',
    topKey: 'circle',
    front: '<circle cx="50" cy="52" r="36" fill="#E0604E"/><ellipse cx="38" cy="38" rx="11" ry="7" fill="#fff" opacity="0.4" transform="rotate(-30 38 38)"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#E0604E"/><ellipse cx="38" cy="36" rx="12" ry="8" fill="#fff" opacity="0.35" transform="rotate(-30 38 36)"/>',
  },
  {
    id: 'cube',
    topKey: 'square',
    front: '<polygon points="50,16 82,32 50,48 18,32" fill="#AFC8EC"/><polygon points="18,32 50,48 50,84 18,68" fill="#7FB3D5"/><polygon points="50,48 82,32 82,68 50,84" fill="#4372B8"/>',
    top: '<rect x="20" y="20" width="60" height="60" rx="4" fill="#AFC8EC" stroke="#4372B8" stroke-width="3"/>',
  },
  {
    id: 'can',
    topKey: 'ring',
    front: '<rect x="24" y="30" width="52" height="46" fill="#B5ADA0"/><ellipse cx="50" cy="76" rx="26" ry="9" fill="#B5ADA0"/><ellipse cx="50" cy="30" rx="26" ry="9" fill="#E3DDD2" stroke="#8A7A6A" stroke-width="2"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#E3DDD2" stroke="#8A7A6A" stroke-width="3"/><circle cx="50" cy="50" r="29" fill="none" stroke="#B5ADA0" stroke-width="3"/>',
  },
  {
    id: 'cone',
    topKey: 'dot',
    front: '<path d="M50 14 L78 74 A28 9 0 0 1 22 74 Z" fill="#E8975A"/><ellipse cx="50" cy="74" rx="28" ry="9" fill="#D9763A" opacity="0.5"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#E8975A"/><circle cx="50" cy="50" r="22" fill="none" stroke="#D9763A" stroke-width="2"/><circle cx="50" cy="50" r="4" fill="#8A3A22"/>',
  },
  {
    id: 'pyramid',
    topKey: 'cross',
    front: '<polygon points="50,14 20,66 50,84" fill="#F4C34E"/><polygon points="50,14 50,84 82,62" fill="#E8A33A"/>',
    top: '<rect x="16" y="16" width="68" height="68" fill="#F4C34E" stroke="#9A6B48" stroke-width="3"/><line x1="16" y1="16" x2="84" y2="84" stroke="#9A6B48" stroke-width="3"/><line x1="84" y1="16" x2="16" y2="84" stroke="#9A6B48" stroke-width="3"/>',
  },
  {
    id: 'mug',
    topKey: 'mug',
    front: '<rect x="26" y="30" width="44" height="48" rx="6" fill="#E8806F"/><ellipse cx="48" cy="30" rx="22" ry="7" fill="#8A3A22"/><path d="M70 42 h6 a10 10 0 0 1 0 20 h-6" fill="none" stroke="#E8806F" stroke-width="7"/>',
    top: '<circle cx="44" cy="50" r="30" fill="#E8806F"/><circle cx="44" cy="50" r="22" fill="#8A3A22"/><circle cx="82" cy="50" r="9" fill="none" stroke="#E8806F" stroke-width="7"/>',
  },
  {
    id: 'house',
    topKey: 'roof',
    front: '<rect x="22" y="48" width="56" height="36" fill="#F7E3A0"/><polygon points="14,48 50,18 86,48" fill="#C94A3A"/><rect x="44" y="62" width="12" height="22" fill="#7A4A2A"/>',
    top: '<rect x="10" y="24" width="80" height="26" fill="#C94A3A"/><rect x="10" y="50" width="80" height="26" fill="#E0604E"/><line x1="10" y1="50" x2="90" y2="50" stroke="#8A3A22" stroke-width="3"/>',
  },
  {
    id: 'umbrella',
    topKey: 'umbrella',
    front: '<path d="M50 54 V78 a7 7 0 0 1 -14 0" fill="none" stroke="#7A4A2A" stroke-width="4" stroke-linecap="round"/><path d="M10 54 Q50 -18 90 54 Q80 46 70 54 Q60 46 50 54 Q40 46 30 54 Q20 46 10 54 Z" fill="#E0604E"/><path d="M50 19 L30 54 Q40 46 50 54 Z" fill="#F7E3A0"/><path d="M50 19 L70 54 Q80 46 90 54 Z" fill="#F7E3A0"/><circle cx="50" cy="16" r="3" fill="#7A4A2A"/>',
    top: pie(8, 38, ['#E0604E', '#F7E3A0']) + '<circle cx="50" cy="50" r="38" fill="none" stroke="#B8402E" stroke-width="3"/><circle cx="50" cy="50" r="5" fill="#7A4A2A"/>',
  },
  {
    id: 'fir',
    topKey: 'fir',
    front: '<rect x="44" y="76" width="12" height="12" fill="#8A5A3A"/><polygon points="50,40 18,80 82,80" fill="#3F8A52"/><polygon points="50,24 24,58 76,58" fill="#4F9A5B"/><polygon points="50,8 30,38 70,38" fill="#6FB46C"/>',
    top: `<polygon points="${star(8, 42, 26)}" fill="#3F8A52" stroke="#2F6B3F" stroke-width="2" stroke-linejoin="round"/><polygon points="${star(8, 30, 17)}" fill="#4F9A5B" stroke="#2F6B3F" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="50" r="6" fill="#8A5A3A"/>`,
  },
  {
    id: 'flower',
    topKey: 'flower',
    front: '<path d="M50 44 V90" stroke="#4F9A5B" stroke-width="5" stroke-linecap="round"/><ellipse cx="36" cy="76" rx="12" ry="6" fill="#6FB46C" transform="rotate(-25 36 76)"/><ellipse cx="64" cy="66" rx="12" ry="6" fill="#6FB46C" transform="rotate(25 64 66)"/>' + petals(6, 15, 11, 'fill="#F28FB0"', 32) + '<circle cx="50" cy="32" r="9" fill="#F4C34E"/>',
    top: petals(8, 24, 15, 'fill="#F28FB0" stroke="#C8587E" stroke-width="2"') + '<circle cx="50" cy="50" r="15" fill="#F4C34E" stroke="#D9A020" stroke-width="2"/>',
  },
  {
    id: 'boat',
    topKey: 'boat',
    front: '<path d="M10 64 H90 L76 82 H24 Z" fill="#B8603E"/><rect x="48" y="14" width="4" height="50" fill="#7A4A2A"/><path d="M54 16 V58 H82 Z" fill="#F4F0E6" stroke="#B9AE98" stroke-width="1.5" stroke-linejoin="round"/><path d="M46 24 V58 H22 Z" fill="#F7E3A0" stroke="#B9AE98" stroke-width="1.5" stroke-linejoin="round"/>',
    top: '<path d="M94 50 Q70 18 14 24 Q6 50 14 76 Q70 82 94 50 Z" fill="#B8603E" stroke="#7A3A22" stroke-width="3" stroke-linejoin="round"/><path d="M84 50 Q66 28 18 32 Q14 50 18 68 Q66 72 84 50 Z" fill="#E3B27A"/><rect x="30" y="47" width="46" height="6" rx="3" fill="#F4F0E6"/><circle cx="40" cy="50" r="4" fill="#7A4A2A"/>',
  },
  {
    id: 'car',
    topKey: 'car',
    front: '<rect x="8" y="52" width="84" height="22" rx="8" fill="#E0604E"/><path d="M24 54 L35 34 H65 L78 54 Z" fill="#E8806F"/><path d="M30 52 L38 38 H48 V52 Z" fill="#CFE8F2"/><path d="M52 52 V38 H63 L72 52 Z" fill="#CFE8F2"/><circle cx="29" cy="74" r="10" fill="#3B4050"/><circle cx="29" cy="74" r="4" fill="#B4BAC6"/><circle cx="71" cy="74" r="10" fill="#3B4050"/><circle cx="71" cy="74" r="4" fill="#B4BAC6"/>',
    top: '<rect x="20" y="22" width="14" height="8" rx="3" fill="#3B4050"/><rect x="66" y="22" width="14" height="8" rx="3" fill="#3B4050"/><rect x="20" y="70" width="14" height="8" rx="3" fill="#3B4050"/><rect x="66" y="70" width="14" height="8" rx="3" fill="#3B4050"/><rect x="8" y="28" width="84" height="44" rx="14" fill="#E0604E" stroke="#8A3A22" stroke-width="3"/><path d="M62 34 L74 39 V61 L62 66 Z" fill="#CFE8F2"/><path d="M34 34 L24 40 V60 L34 66 Z" fill="#CFE8F2"/><rect x="36" y="33" width="24" height="34" rx="4" fill="#E8806F"/>',
  },
  // ----- геометрические тела (стоят и лежат: сверху выглядят по-разному) -----
  {
    id: 'g-cube',
    topKey: 'square',
    front: box(1, 1, 1, GEOM_COLORS.cube),
    top: '<rect x="20" y="20" width="60" height="60" rx="3" fill="#BFE3F2" stroke="#4372B8" stroke-width="3"/>',
  },
  {
    id: 'g-cuboid',
    topKey: 'rect',
    front: box(2.4, 1.1, 0.9, GEOM_COLORS.cuboid),
    top: '<rect x="8" y="28" width="84" height="44" rx="3" fill="#C6BCEA" stroke="#6E5DB8" stroke-width="3"/>',
  },
  {
    id: 'g-cyl',
    topKey: 'circle',
    front: '<rect x="26" y="30" width="48" height="46" fill="#8FC27A" stroke="#3F6B4A" stroke-width="1.5"/><ellipse cx="50" cy="76" rx="24" ry="9" fill="#8FC27A" stroke="#3F6B4A" stroke-width="1.5"/><rect x="27" y="30" width="46" height="45" fill="#8FC27A"/><ellipse cx="50" cy="30" rx="24" ry="9" fill="#CFE8C4" stroke="#3F6B4A" stroke-width="1.5"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#CFE8C4" stroke="#4F8A5B" stroke-width="3"/>',
  },
  {
    id: 'g-cyl-side',
    topKey: 'rect',
    front: '<rect x="22" y="36" width="56" height="36" fill="#8FC27A" stroke="#3F6B4A" stroke-width="1.5"/><ellipse cx="22" cy="54" rx="9" ry="18" fill="#8FC27A" stroke="#3F6B4A" stroke-width="1.5"/><ellipse cx="78" cy="54" rx="9" ry="18" fill="#CFE8C4" stroke="#3F6B4A" stroke-width="1.5"/>',
    top: '<rect x="12" y="30" width="76" height="40" rx="3" fill="#B6DEB0" stroke="#4F8A5B" stroke-width="3"/><line x1="12" y1="42" x2="88" y2="42" stroke="#8FC27A" stroke-width="2"/><line x1="12" y1="58" x2="88" y2="58" stroke="#8FC27A" stroke-width="2"/>',
  },
  {
    id: 'g-cone',
    topKey: 'dot',
    front: '<path d="M50 14 L78 74 A28 9 0 0 1 22 74 Z" fill="#E8975A" stroke="#8A3A22" stroke-width="1.5"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#F3C79B" stroke="#B8512E" stroke-width="3"/><circle cx="50" cy="50" r="22" fill="none" stroke="#E8975A" stroke-width="2"/><circle cx="50" cy="50" r="4" fill="#8A3A22"/>',
  },
  {
    id: 'g-cone-side',
    topKey: 'tri',
    front: '<path d="M12 54 L72 28 A10 26 0 0 1 72 80 Z" fill="#E8975A" stroke="#8A3A22" stroke-width="1.5"/><ellipse cx="72" cy="54" rx="10" ry="26" fill="#F3C79B" stroke="#8A3A22" stroke-width="1.5"/>',
    top: '<polygon points="10,50 88,18 88,82" fill="#F3C79B" stroke="#B8512E" stroke-width="3" stroke-linejoin="round"/>',
  },
  {
    id: 'g-pyr4',
    topKey: 'cross',
    front: pyramid4(GEOM_COLORS.pyramid),
    top: '<rect x="16" y="16" width="68" height="68" fill="#F7E3A0" stroke="#9A6B48" stroke-width="3"/><line x1="16" y1="16" x2="84" y2="84" stroke="#9A6B48" stroke-width="3"/><line x1="84" y1="16" x2="16" y2="84" stroke="#9A6B48" stroke-width="3"/>',
  },
  {
    id: 'g-hex',
    topKey: 'hex',
    front: nPrism(6, GEOM_COLORS.hex),
    top: '<polygon points="88,50 69,83 31,83 12,50 31,17 69,17" fill="#B6DEB0" stroke="#4F8A5B" stroke-width="3" stroke-linejoin="round"/>',
  },
  {
    id: 'g-tent',
    topKey: 'roof',
    front: prismTent(GEOM_COLORS.tent),
    top: '<rect x="10" y="22" width="80" height="28" fill="#F3C79B"/><rect x="10" y="50" width="80" height="28" fill="#E8975A"/><rect x="10" y="22" width="80" height="56" fill="none" stroke="#8A3A22" stroke-width="3"/><line x1="10" y1="50" x2="90" y2="50" stroke="#8A3A22" stroke-width="3"/>',
  },
  {
    id: 'g-torus',
    topKey: 'donut',
    front: '<ellipse cx="50" cy="58" rx="38" ry="22" fill="#E58AA0" stroke="#B8485F" stroke-width="1.5"/><ellipse cx="50" cy="54" rx="15" ry="7" fill="#ffffff" stroke="#B8485F" stroke-width="1.5"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#F2B5C3" stroke="#B8485F" stroke-width="3"/><circle cx="50" cy="50" r="14" fill="#ffffff" stroke="#B8485F" stroke-width="3"/>',
  },
  {
    id: 'g-sphere',
    topKey: 'circle',
    front: '<circle cx="50" cy="52" r="36" fill="#7FB3D5" stroke="#2F4A7A" stroke-width="1.5"/><ellipse cx="38" cy="38" rx="11" ry="7" fill="#fff" opacity="0.45" transform="rotate(-30 38 38)"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#AFC8EC" stroke="#4372B8" stroke-width="3"/><ellipse cx="40" cy="38" rx="12" ry="8" fill="#fff" opacity="0.4" transform="rotate(-30 40 38)"/>',
  },
  {
    id: 'g-prism3',
    topKey: 'tri',
    front: nPrism(3, GEOM_COLORS.prism3, 30),
    top: `<polygon points="${ngon(3, -90, 44, 61)}" fill="#F3D2AE" stroke="#B8702E" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    id: 'g-prism5',
    topKey: 'pent',
    front: nPrism(5, GEOM_COLORS.prism5, 45),
    top: `<polygon points="${ngon(5, -90, 42, 54)}" fill="#BFE6DE" stroke="#3F8A7C" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    id: 'g-oct',
    topKey: 'oct',
    front: nPrism(8, GEOM_COLORS.oct),
    top: `<polygon points="${ngon(8, 22.5, 42)}" fill="#DCCBEE" stroke="#7A52A8" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    id: 'g-stairs',
    topKey: 'stairs',
    front: stairs(GEOM_COLORS.stairs),
    top: '<rect x="12" y="16" width="76" height="22" fill="#F6DDBF"/><rect x="12" y="38" width="76" height="22" fill="#E9C396"/><rect x="12" y="60" width="76" height="22" fill="#D6A676"/><rect x="12" y="16" width="76" height="66" fill="none" stroke="#8A5A3A" stroke-width="3"/><line x1="12" y1="38" x2="88" y2="38" stroke="#8A5A3A" stroke-width="3"/><line x1="12" y1="60" x2="88" y2="60" stroke="#8A5A3A" stroke-width="3"/>',
  },
];

// Пулы по уровням: предметы попроще, все предметы, геометрия попроще, вся геометрия (стоят и лежат), всё вместе (5 и 6 вариантов).
const ALL = SOLIDS.map((s) => s.id);
export const POOLS = [
  ['ball', 'cube', 'house', 'pyramid'],
  ['ball', 'cube', 'can', 'cone', 'pyramid', 'mug', 'house', 'umbrella', 'fir', 'flower', 'boat', 'car'],
  ['g-cube', 'g-cyl', 'g-pyr4', 'g-hex', 'g-torus', 'g-sphere', 'g-prism5', 'g-stairs'],
  SOLIDS.filter((s) => s.id.startsWith('g-')).map((s) => s.id),
  ALL,
  ALL,
];
