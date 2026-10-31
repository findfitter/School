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

// Шестигранная призма (стоит): боковые грани от дальних к ближним, сверху — шестиугольник.
function hexPrism(base) {
  const t = tone(base);
  const ring = (z) => Array.from({ length: 6 }, (_, k) => [1 + 0.9 * Math.cos((k * Math.PI) / 3), 1 + 0.9 * Math.sin((k * Math.PI) / 3), z]);
  const low = ring(0);
  const high = ring(1.1);
  const sides = low
    .map((p, k) => ({ pts: [p, low[(k + 1) % 6], high[(k + 1) % 6], high[k]], depth: p[0] + p[1] + low[(k + 1) % 6][0] + low[(k + 1) % 6][1] }))
    .sort((a, b) => a.depth - b.depth)
    .map((f, i) => ({ pts: f.pts, fill: i % 2 ? t.left : t.right }));
  return solid([...sides, { pts: high, fill: t.top }]);
}

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

const GEOM_COLORS = { cube: '#7fb3d5', cuboid: '#afa2df', pyramid: '#f4c34e', hex: '#8fc27a', tent: '#e58aa0' };

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
    front: hexPrism(GEOM_COLORS.hex),
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
];

// Пулы по уровням: предметы попроще, все предметы, геометрия попроще, вся геометрия (стоят и лежат).
export const POOLS = [
  ['ball', 'cube', 'house', 'pyramid'],
  ['ball', 'cube', 'can', 'cone', 'pyramid', 'mug', 'house'],
  ['g-cube', 'g-cyl', 'g-pyr4', 'g-hex', 'g-torus', 'g-sphere'],
  SOLIDS.filter((s) => s.id.startsWith('g-')).map((s) => s.id),
];
