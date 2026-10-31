// Рисунки обстановки двора (слоты house, bed, toy, plant, fun): по одному SVG на вещь, в акварельном стиле «книжки».
// Домики — по design/sketch/Wardrobe.dc.html, остальное дорисовано в той же манере: фильтры wc/wcS (core/art/filters.js),
// палитра из design/README.md, мягкие формы без чёрных контуров. Внешних картинок нет.
//
//   drawDecor('doghouse', { name: 'Бобик' })  →  <svg class="decor-art">…</svg>

import { drawDog } from './dogs.js';

const NS = 'xmlns="http://www.w3.org/2000/svg"';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shadow = (cx, cy, rx, ry = 7) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#4A3A2A" opacity="0.14"/>`;

// Табличка на будке: имя собаки рукописным шрифтом; длинное имя уменьшается, чтобы влезть.
function doghouseSign(name) {
  const text = esc(String(name || '').slice(0, 12));
  const size = Math.min(19, Math.round(121 / Math.max(4, text.length)));
  return `<text x="140" y="${143 - (19 - size) / 4}" text-anchor="middle" font-family="Caveat, cursive" font-size="${size}" font-weight="700" fill="#6B3A22">${text}</text>`;
}

// id вещи → { view: viewBox, svg(name) }. Ширина на дворе: ART_WIDTH (в долях размера слота).
const ART = {
  doghouse: {
    view: '24 30 264 208',
    svg: (name) => `${shadow(150, 228, 126, 9)}
      <g filter="url(#wcS)">
        <rect x="56" y="112" width="168" height="110" fill="#C9623A"/>
        <path d="M40 120 L140 40 L240 120 Z" fill="#8A3A22"/>
        <path d="M104 222 V170 a36 36 0 0 1 72 0 V222 Z" fill="#4A2E22"/>
        <rect x="110" y="128" width="60" height="20" rx="3" fill="#F3E6CF"/>
        <path d="M228 214 h48 a24 10 0 0 1 -48 0 z" fill="#7FB3D5"/>
      </g>
      <g stroke="#7A3A20" stroke-width="2" opacity="0.35"><path d="M76 150 V222 M96 150 V222 M184 150 V222 M204 150 V222"/></g>
      <g stroke="#6A2A16" stroke-width="2" fill="none" opacity="0.4"><path d="M80 100 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0"/><path d="M104 80 q9 7 18 0 q9 7 18 0 q9 7 18 0 q9 7 18 0"/></g>
      ${doghouseSign(name)}`,
  },
  tent: {
    view: '10 18 282 236',
    svg: () => `${shadow(150, 230, 126, 8)}
      <path d="M150 64 V26" stroke="#7A6A5C" stroke-width="3"/>
      <path d="M150 26 L180 34 L150 42 Z" fill="#E0604E" filter="url(#wcS)"/>
      <g filter="url(#wcS)">
        <path d="M150 62 L40 222 L84 222 Z" fill="#7FB3D5"/>
        <path d="M150 62 L84 222 L128 222 Z" fill="#FFFDF6"/>
        <path d="M150 62 L128 222 L172 222 Z" fill="#7FB3D5"/>
        <path d="M150 62 L172 222 L216 222 Z" fill="#FFFDF6"/>
        <path d="M150 62 L216 222 L260 222 Z" fill="#7FB3D5"/>
        <path d="M150 112 L116 222 L184 222 Z" fill="#33405E"/>
        <path d="M150 112 L116 222 L100 222 Z" fill="#E58AA0"/>
        <path d="M150 112 L184 222 L200 222 Z" fill="#E58AA0"/>
      </g>
      <g stroke="#9C8C7A" stroke-width="1.6"><path d="M40 222 L18 236 M260 222 L284 236"/></g>
      <g fill="#8A6A3A"><rect x="14" y="232" width="6" height="10" rx="2"/><rect x="282" y="232" width="6" height="10" rx="2"/></g>
      <g filter="url(#wcS)"><circle cx="300" cy="236" r="7" fill="#F4C34E"/><circle cx="40" cy="246" r="6" fill="#E58AA0"/></g>`,
  },
  castle: {
    view: '14 12 272 226',
    svg: () => `${shadow(150, 230, 130, 8)}
      <path d="M54 48 V22 M246 48 V22" stroke="#7A6A5C" stroke-width="2.5"/>
      <g filter="url(#wcS)">
        <path d="M54 22 L78 28 L54 34 Z" fill="#F4C34E"/>
        <path d="M246 22 L270 28 L246 34 Z" fill="#7FB3D5"/>
        <rect x="76" y="110" width="148" height="114" fill="#C6BCEA"/>
        <g fill="#C6BCEA"><rect x="80" y="94" width="18" height="18"/><rect x="112" y="94" width="18" height="18"/><rect x="144" y="94" width="18" height="18"/><rect x="176" y="94" width="18" height="18"/><rect x="204" y="94" width="18" height="18"/></g>
        <rect x="30" y="74" width="50" height="150" fill="#AFA2DF"/>
        <rect x="220" y="74" width="50" height="150" fill="#AFA2DF"/>
        <path d="M22 80 L54 44 L88 80 Z" fill="#D9667F"/>
        <path d="M212 80 L246 44 L278 80 Z" fill="#D9667F"/>
        <path d="M124 224 V178 a26 26 0 0 1 52 0 V224 Z" fill="#5A4A8A"/>
      </g>
      <g fill="#F7E6A6"><path d="M48 120 v-10 a7 7 0 0 1 14 0 v10 z"/><path d="M238 120 v-10 a7 7 0 0 1 14 0 v10 z"/><path d="M48 170 v-10 a7 7 0 0 1 14 0 v10 z"/><path d="M238 170 v-10 a7 7 0 0 1 14 0 v10 z"/></g>
      <path transform="translate(150 146)" d="M0 4 C0 -4 -11 -5 -11 3 C-11 9 -4 13 0 17 C4 13 11 9 11 3 C11 -5 0 -4 0 4 Z" fill="#E58AA0"/>`,
  },
  cushion: {
    view: '0 0 200 96',
    svg: () => `${shadow(100, 86, 90, 7)}
      <g filter="url(#wcS)">
        <ellipse cx="100" cy="58" rx="92" ry="34" fill="#D9667F"/>
        <ellipse cx="100" cy="54" rx="72" ry="24" fill="#F2B5C3"/>
      </g>
      <ellipse cx="100" cy="54" rx="64" ry="20" fill="none" stroke="#FFFDF6" stroke-width="2" stroke-dasharray="6 7" opacity="0.7"/>
      <g fill="#E58AA0" opacity="0.7" filter="url(#wcS)"><ellipse cx="100" cy="58" rx="9" ry="6"/><circle cx="87" cy="49" r="3.4"/><circle cx="96" cy="44" r="3.4"/><circle cx="106" cy="44" r="3.4"/><circle cx="114" cy="49" r="3.4"/></g>`,
  },
  sofa: {
    view: '0 0 220 130',
    svg: () => `${shadow(110, 122, 98, 7)}
      <g filter="url(#wcS)">
        <rect x="22" y="22" width="176" height="72" rx="26" fill="#7FB3D5"/>
        <rect x="14" y="62" width="192" height="44" rx="18" fill="#9CC8E0"/>
        <rect x="4" y="48" width="38" height="62" rx="17" fill="#6FA6C8"/>
        <rect x="178" y="48" width="38" height="62" rx="17" fill="#6FA6C8"/>
        <rect x="26" y="106" width="12" height="16" rx="4" fill="#8A6A3A"/>
        <rect x="182" y="106" width="12" height="16" rx="4" fill="#8A6A3A"/>
        <path d="M120 40 C118 34 150 32 152 40 L156 74 C150 80 124 80 118 74 Z" fill="#E58AA0"/>
      </g>
      <path d="M110 66 V100" stroke="#FFFDF6" stroke-width="2" stroke-dasharray="5 6" opacity="0.55"/>`,
  },
  teddy: {
    view: '0 0 120 148',
    svg: () => `${shadow(60, 141, 42, 6)}
      <g filter="url(#wcS)">
        <circle cx="38" cy="19" r="11" fill="#B9793A"/><circle cx="82" cy="19" r="11" fill="#B9793A"/>
        <circle cx="38" cy="20" r="6" fill="#F2C9B8"/><circle cx="82" cy="20" r="6" fill="#F2C9B8"/>
        <ellipse cx="60" cy="102" rx="31" ry="35" fill="#C08139"/>
        <ellipse cx="60" cy="106" rx="19" ry="23" fill="#F3E6CF"/>
        <ellipse cx="28" cy="92" rx="10" ry="19" fill="#B9793A" transform="rotate(18 28 92)"/>
        <ellipse cx="92" cy="92" rx="10" ry="19" fill="#B9793A" transform="rotate(-18 92 92)"/>
        <ellipse cx="44" cy="134" rx="15" ry="10" fill="#B9793A"/><ellipse cx="76" cy="134" rx="15" ry="10" fill="#B9793A"/>
        <circle cx="60" cy="42" r="28" fill="#C99048"/>
        <ellipse cx="60" cy="52" rx="14" ry="11" fill="#F3E6CF"/>
        <path d="M60 70 l-13 7 v10 l13 -5 l13 5 v-10 z" fill="#E58AA0"/>
      </g>
      <ellipse cx="60" cy="48" rx="4.6" ry="3.4" fill="#5A4636"/>
      <circle cx="49" cy="38" r="2.8" fill="#3B2412"/><circle cx="71" cy="38" r="2.8" fill="#3B2412"/>
      <path d="M60 52 q-4 5 -8 3 M60 52 q4 5 8 3" stroke="#5A4636" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  },
  balloon: {
    view: '0 0 100 176',
    svg: () => `
      <g filter="url(#wcS)">
        <ellipse cx="50" cy="56" rx="36" ry="46" fill="#E0604E"/>
        <path d="M43 100 L57 100 L50 111 Z" fill="#C94A3A"/>
      </g>
      <ellipse cx="38" cy="36" rx="8" ry="15" fill="#FFFFFF" opacity="0.4" transform="rotate(18 38 36)"/>
      <path d="M50 111 C38 130 64 142 48 170" stroke="#9C8C7A" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  'bone-toy': {
    view: '0 0 160 84',
    svg: () => `${shadow(80, 76, 66, 5)}
      <g filter="url(#wcS)">
        <g fill="#F3E2BF"><circle cx="24" cy="26" r="17"/><circle cx="24" cy="54" r="17"/><circle cx="136" cy="26" r="17"/><circle cx="136" cy="54" r="17"/><rect x="24" y="24" width="112" height="32"/></g>
        <rect x="24" y="46" width="112" height="10" fill="#EBD3A8" opacity="0.8"/>
      </g>
      <ellipse cx="80" cy="32" rx="42" ry="4.5" fill="#FFF6D6" opacity="0.85"/>`,
  },
  tulips: {
    view: '0 0 150 140',
    svg: () => `${shadow(75, 134, 52, 5)}
      <g stroke="#6BAE5E" stroke-width="5" fill="none" stroke-linecap="round"><path d="M40 132 C42 104 40 84 40 64"/><path d="M75 132 C75 100 76 76 75 52"/><path d="M110 132 C108 104 110 86 110 68"/></g>
      <g fill="#6BAE5E" filter="url(#wcS)"><path d="M40 132 C16 114 18 94 28 84 C36 100 44 112 40 132 Z"/><path d="M110 132 C134 114 132 96 122 86 C114 102 106 114 110 132 Z"/><path d="M75 132 C60 118 58 104 64 96 C72 106 78 118 75 132 Z"/></g>
      <g filter="url(#wcS)">
        <path d="M24 44 C24 70 56 70 56 44 L50 28 L40 40 L30 28 Z" fill="#E58AA0"/>
        <path d="M59 34 C59 60 91 60 91 34 L85 18 L75 30 L65 18 Z" fill="#E0604E"/>
        <path d="M94 48 C94 74 126 74 126 48 L120 32 L110 44 L100 32 Z" fill="#F4C34E"/>
      </g>`,
  },
  pot: {
    view: '0 0 100 138',
    svg: () => `${shadow(50, 132, 34, 5)}
      <path d="M50 78 C50 56 49 46 50 34" stroke="#6BAE5E" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g fill="#6FAE6B" filter="url(#wcS)"><ellipse cx="30" cy="62" rx="19" ry="8" transform="rotate(-28 30 62)"/><ellipse cx="70" cy="58" rx="19" ry="8" transform="rotate(28 70 58)"/></g>
      <g filter="url(#wcS)">
        <g fill="#F2B5C3"><circle cx="50" cy="16" r="9"/><circle cx="62" cy="25" r="9"/><circle cx="57" cy="39" r="9"/><circle cx="43" cy="39" r="9"/><circle cx="38" cy="25" r="9"/></g>
        <circle cx="50" cy="28" r="8" fill="#F4C34E"/>
        <path d="M24 86 L76 86 L68 130 L32 130 Z" fill="#C9623A"/>
        <rect x="19" y="78" width="62" height="14" rx="5" fill="#B8512E"/>
      </g>`,
  },
  sunflower: {
    view: '0 0 124 204',
    svg: () => `${shadow(62, 198, 30, 5)}
      <path d="M62 194 C60 154 64 124 62 98" stroke="#6BAE5E" stroke-width="7" fill="none" stroke-linecap="round"/>
      <g fill="#6FAE6B" filter="url(#wcS)"><ellipse cx="40" cy="154" rx="22" ry="9" transform="rotate(-32 40 154)"/><ellipse cx="86" cy="138" rx="22" ry="9" transform="rotate(32 86 138)"/></g>
      <g filter="url(#wcS)">
        ${Array.from({ length: 12 }, (_, i) => `<ellipse cx="62" cy="36" rx="9" ry="19" transform="rotate(${i * 30} 62 66)" fill="${i % 2 ? '#F7D774' : '#F4C34E'}"/>`).join('')}
        <circle cx="62" cy="66" r="21" fill="#9A6B48"/>
      </g>
      <g fill="#7A5236" opacity="0.7"><circle cx="54" cy="60" r="2.4"/><circle cx="66" cy="58" r="2.4"/><circle cx="60" cy="70" r="2.4"/><circle cx="72" cy="70" r="2.4"/><circle cx="52" cy="72" r="2.4"/></g>`,
  },
  tree: {
    view: '0 0 190 252',
    svg: () => `${shadow(95, 244, 62, 7)}
      <path d="M82 240 C84 204 86 174 90 146 L108 146 C106 176 108 208 112 240 Z" fill="#9A6B48" filter="url(#wcS)"/>
      <g filter="url(#wc)"><g fill="#6FAE6B"><circle cx="95" cy="82" r="60"/><circle cx="50" cy="118" r="40"/><circle cx="140" cy="118" r="42"/></g></g>
      <g fill="#8FC27A" opacity="0.8" filter="url(#wcS)"><circle cx="76" cy="62" r="26"/><circle cx="118" cy="96" r="20"/><circle cx="44" cy="110" r="16"/></g>
      <g fill="#E0604E" filter="url(#wcS)"><circle cx="70" cy="100" r="7"/><circle cx="118" cy="68" r="7"/><circle cx="146" cy="124" r="7"/><circle cx="56" cy="136" r="6"/></g>`,
  },
  kite: {
    view: '0 0 140 206',
    svg: () => `
      <path d="M70 152 C56 170 90 184 66 204" stroke="#9C8C7A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <g filter="url(#wcS)">
        <path d="M70 70 L70 8 L22 72 Z" fill="#E58AA0"/>
        <path d="M70 70 L70 8 L118 72 Z" fill="#F4C34E"/>
        <path d="M70 70 L22 72 L70 152 Z" fill="#7FB3D5"/>
        <path d="M70 70 L118 72 L70 152 Z" fill="#9ED3A8"/>
        <g fill="#E0604E"><ellipse cx="62" cy="178" rx="9" ry="5" transform="rotate(-24 62 178)"/><ellipse cx="78" cy="188" rx="9" ry="5" transform="rotate(24 78 188)"/></g>
      </g>`,
  },
  fountain: {
    view: '0 0 200 194',
    svg: () => `${shadow(100, 186, 90, 7)}
      <g stroke="#7FB3D5" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.85" filter="url(#wcS)"><path d="M100 78 C100 36 70 30 56 66"/><path d="M100 78 C100 36 130 30 144 66"/><path d="M100 78 C100 52 100 40 100 30"/></g>
      <g filter="url(#wcS)">
        <ellipse cx="100" cy="158" rx="88" ry="28" fill="#AFA2DF"/>
        <ellipse cx="100" cy="150" rx="74" ry="20" fill="#BFE3F2"/>
        <rect x="88" y="84" width="24" height="70" fill="#C6BCEA"/>
        <ellipse cx="100" cy="86" rx="40" ry="11" fill="#AFA2DF"/>
        <ellipse cx="100" cy="83" rx="31" ry="7" fill="#BFE3F2"/>
      </g>
      <g fill="#BFE3F2" filter="url(#wcS)"><circle cx="52" cy="76" r="4.5"/><circle cx="148" cy="76" r="4.5"/><circle cx="104" cy="22" r="4"/><circle cx="68" cy="144" r="4"/></g>`,
  },
  circus: {
    view: '0 0 262 224',
    svg: () => `${shadow(131, 214, 120, 8)}
      <g filter="url(#wcS)">
        <rect x="36" y="122" width="190" height="86" fill="#FFFDF6"/>
        ${[0, 2, 4, 6].map((i) => `<rect x="${36 + i * 23.75}" y="122" width="23.75" height="86" fill="#E0604E" opacity="0.9"/>`).join('')}
        <path d="M16 128 L131 34 L246 128 Z" fill="#E0604E"/>
        <path d="M131 34 L96 128 L131 128 Z" fill="#FFFDF6"/>
        <path d="M131 34 L166 128 L201 128 Z" fill="#FFFDF6"/>
        <path d="M105 208 V170 a26 26 0 0 1 52 0 V208 Z" fill="#5A4A8A"/>
        <path d="M131 34 V8" stroke="#7A6A5C" stroke-width="3"/>
        <path d="M131 8 L160 15 L131 22 Z" fill="#F4C34E"/>
        <g fill="#F4C34E"><circle cx="30" cy="132" r="6"/><circle cx="64" cy="134" r="6"/><circle cx="98" cy="134" r="6"/><circle cx="164" cy="134" r="6"/><circle cx="198" cy="134" r="6"/><circle cx="232" cy="132" r="6"/></g>
        <g fill="#7FB3D5"><circle cx="47" cy="135" r="5"/><circle cx="81" cy="136" r="5"/><circle cx="181" cy="136" r="5"/><circle cx="215" cy="135" r="5"/></g>
      </g>`,
  },
};

// Ширина вещи на дворе — во сколько раз больше размера слота (DECOR_POSITIONS): у эмодзи размер был «кегль», у рисунка — ширина.
export const ART_WIDTH = {
  doghouse: 1.5, tent: 1.45, castle: 1.65, cushion: 1.4, sofa: 1.6, teddy: 0.95, balloon: 0.7, 'bone-toy': 1.35,
  tulips: 1.05, pot: 0.85, sunflower: 0.8, tree: 1.15, kite: 0.95, fountain: 1.35, circus: 1.6,
};

export const hasDecorArt = (id) => id in ART;

// Рисунок вещи обстановки. name — имя собаки для таблички на будке.
export function drawDecor(id, { name = '' } = {}) {
  const art = ART[id];
  if (!art) return null;
  const markup = `<svg ${NS} viewBox="${art.view}" role="img" aria-hidden="true" style="overflow:visible">${art.svg(name)}</svg>`;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  el.setAttribute('class', `decor-art decor-art-${id}`);
  return el;
}

// Вещь обстановки на дворе или на снимке: рисунок, поставленный в точку pos (% сцены) шириной pos.size × ART_WIDTH
// (в % ширины сцены, cqw). className — класс места (dog-decor во дворе, photo-decor на снимке).
export function decorElement(id, pos, { name = '', className = 'dog-decor' } = {}) {
  const el = drawDecor(id, { name });
  if (!el) return null;
  el.setAttribute('class', `${className} decor-art decor-art-${id}`);
  el.style.left = `${pos.x}%`;
  el.style.top = `${pos.y}%`;
  el.style.width = `${(pos.size * (ART_WIDTH[id] || 1)).toFixed(1)}cqw`;
  return el;
}

// Что показывает плитка каталога: наряд — надетым на маленькую собаку (кадр на голове или на шее), обстановка — её рисунок.
// item — вещь из ITEMS (или null — «ничего» в слоте slot), dog — собака ребёнка (порода и окрас), name — имя для таблички.
const HEAD_VIEW = '34 -40 172 172';
const NECK_VIEW = '40 90 160 160';
const NECK_ITEMS = new Set(['collar', 'scarf', 'medal']);

export function drawItem(item, { dog, slot, name = '' } = {}) {
  if (item?.kind === 'decor') return drawDecor(item.id, { name });
  const slotId = item ? item.slot : slot;
  const art = drawDog({ breed: dog.breed, color: dog.color, age: 3, mood: 'happy', outfit: item ? { [slotId]: item.id } : {}, paint: false });
  art.setAttribute('viewBox', slotId === 'collar' || (item && NECK_ITEMS.has(item.id)) ? NECK_VIEW : HEAD_VIEW);
  art.setAttribute('class', 'dog-art item-art');
  art.style.overflow = 'hidden'; // в рамке кадра — только голова или шея
  return art;
}
