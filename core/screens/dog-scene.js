// Рисунки экрана собаки в стиле «сказочной книжки» (design/sketch/Dog.dc.html): акварельный двор с рваными краями,
// шкалы показателей, миска и банка корма. Всё — SVG-строки (разбор — svgEl из book-art.js); фильтры wc/wc2/wcS общие
// (core/art/filters.js); маска «рваных краёв» объявлена внутри того же <svg>, где используется.

const NS = 'xmlns="http://www.w3.org/2000/svg"';

// Двор: небо, облака, холм, забор, лужайка. Размер 516×400 растягивается на всю карточку двора.
export function yardArt() {
  const posts = Array.from({ length: 13 }, (_, i) => {
    const x = 18 + i * 40;
    return `<path d="M${x} 232 V176 l9 -9 l9 9 V232 Z" fill="#F3E6CF"/>`;
  }).join('');
  return `<svg ${NS} class="yard-art" aria-hidden="true" width="100%" height="100%" viewBox="0 0 516 400" preserveAspectRatio="none">
  <defs>
    <filter id="yard-deckleF" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>
    <mask id="yard-deckle" maskUnits="userSpaceOnUse" x="0" y="0" width="516" height="400"><rect x="8" y="8" width="500" height="384" rx="6" fill="#FFFFFF" filter="url(#yard-deckleF)"/></mask>
  </defs>
  <g mask="url(#yard-deckle)">
    <rect x="0" y="0" width="516" height="400" fill="#D3E6F2" filter="url(#wc2)"/>
    <g fill="#FFFFFF" opacity="0.8" filter="url(#wc)"><ellipse cx="120" cy="52" rx="56" ry="16"/><ellipse cx="146" cy="40" rx="30" ry="18"/><ellipse cx="380" cy="86" rx="46" ry="13"/></g>
    <circle cx="446" cy="62" r="30" fill="#F7D774" filter="url(#wc)"/>
    <path d="M0 214 C90 176 180 186 262 208 C342 230 420 176 516 190 L516 400 L0 400 Z" fill="#B9D99A" opacity="0.9" filter="url(#wc2)"/>
    <g filter="url(#wcS)">${posts}<rect x="8" y="190" width="500" height="9" rx="4" fill="#E6D4B2"/><rect x="8" y="212" width="500" height="9" rx="4" fill="#E6D4B2"/></g>
    <path d="M0 250 C120 226 260 238 372 252 C440 260 486 252 516 246 L516 400 L0 400 Z" fill="#8FC27A" opacity="0.92" filter="url(#wc)"/>
    <g fill="#E58AA0" filter="url(#wcS)"><circle cx="64" cy="364" r="6"/><circle cx="452" cy="372" r="6"/><circle cx="262" cy="384" r="5"/></g>
    <g fill="#F7D774" filter="url(#wcS)"><circle cx="96" cy="378" r="5"/><circle cx="420" cy="360" r="5"/></g>
  </g>
</svg>`;
}

// Шкала показателя: цветная полоска (акварель) в контуре от руки. value — 0..100.
export function statBar(value, color) {
  const w = Math.max(12, Math.round((228 * Math.max(0, Math.min(100, value))) / 100));
  return `<svg ${NS} aria-hidden="true" width="100%" height="100%" viewBox="0 0 236 22" preserveAspectRatio="none">
  <rect x="4" y="5" width="${w}" height="12" rx="6" fill="${color}" filter="url(#wcS)"/>
  <rect x="2" y="3" width="232" height="16" rx="8" fill="none" stroke="#5A4636" stroke-width="1.8" filter="url(#rough)"/>
</svg>`;
}

// Миска с кормом (появляется рядом с собакой, когда она ест) и банка, из которой корм насыпают.
export const BOWL_ART = `<svg ${NS} aria-hidden="true" viewBox="0 0 80 52"><g filter="url(#wcS)">
  <path d="M6 24 H74 C72 42 60 50 40 50 C20 50 8 42 6 24 Z" fill="#7FB3D5"/>
  <ellipse cx="40" cy="24" rx="34" ry="8" fill="#A6D0E4"/>
  <g fill="#9A6B48"><circle cx="24" cy="21" r="6"/><circle cx="38" cy="17" r="6.5"/><circle cx="52" cy="21" r="6"/><circle cx="31" cy="25" r="5.5"/><circle cx="46" cy="25" r="5.5"/></g>
</g></svg>`;

export const CAN_ART = `<svg ${NS} aria-hidden="true" viewBox="0 0 48 56"><g filter="url(#wcS)">
  <rect x="8" y="10" width="32" height="42" rx="6" fill="#E0604E"/>
  <rect x="8" y="22" width="32" height="14" fill="#FFFDF6"/>
  <ellipse cx="24" cy="10" rx="16" ry="5" fill="#C94A3A"/>
  <circle cx="24" cy="29" r="5" fill="#9A6B48"/>
</g></svg>`;
