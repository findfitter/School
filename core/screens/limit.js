// Экран «На сегодня достаточно»: показывается, когда дневной лимит времени исчерпан.
// Ночь, как во дворе у собаки: тёмная акварель, луна, звёзды и спящий Бобик (guideDog: собака ребёнка или проводник).

import { h, button } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';
import { guideDog } from './book.js';
import { svgEl, lockIcon } from './book-art.js';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const SPARK = 'M0 -12 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4 z';

// Луна — небольшой SVG с акварельным фильтром (большой фон без фильтров: он дорогой для слабого процессора).
const MOON = `<svg ${NS} aria-hidden="true" viewBox="0 0 80 80"><path filter="url(#wcS)" d="M46 6 A34 34 0 1 0 74 50 A28 28 0 1 1 46 6 Z" fill="#F7D774"/></svg>`;
const star = (cls) => `<svg ${NS} class="${cls}" aria-hidden="true" viewBox="-14 -14 28 28"><path filter="url(#wcS)" d="${SPARK}" fill="#F7E3A0"/></svg>`;
const STARS = [[8, 12, 1], [20, 28, 0.7], [34, 10, 0.9], [52, 22, 0.6], [66, 8, 1], [78, 30, 0.8], [90, 16, 0.7], [44, 36, 0.6]];

export function renderLimit(app) {
  const art = drawDog({ ...guideDog(), mood: 'ok', energy: 100, paint: false });
  art.classList.add('sleeping'); // глаза закрыты (dog.css)

  const stars = STARS.map(([x, y, s], i) => {
    const el = svgEl(star('limit-star'));
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.style.width = `${s * 3.2}vh`;
    el.style.animationDelay = `${(i * 0.45).toFixed(2)}s`;
    return el;
  });

  const parent = button('paper-card limit-parent', [h('i', { class: 'tape', 'aria-hidden': 'true' }), svgEl(lockIcon(), 'limit-lock'), STR.limit.parent], () => app.go.parent());

  return h('div', { class: 'screen limit-screen' },
    h('div', { class: 'limit-hill' }),
    ...stars,
    svgEl(MOON, 'limit-moon'),
    h('div', { class: 'limit-text' },
      h('h1', { class: 'hand', text: STR.limit.title }),
      h('p', { text: STR.limit.text }),
      parent),
    h('div', { class: 'limit-dog' }, art, h('div', { class: 'limit-zzz hand', 'aria-hidden': 'true' }, h('span', { text: 'Z' }), h('span', { text: 'z' }), h('span', { text: 'z' }))));
}
