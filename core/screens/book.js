// Общий компонент «книга на столе»: стол с акварельными пятнами, тканевая обложка, две страницы с корешком
// и бумажной фактурой. Содержимое левой и правой страницы, а также верх стола передаёт экран.
// Размеры — в «пикселях эскиза» (--u, core/styles/base.css), стили — core/styles/book.css (.book-*).
//
//   const book = createBook({ top: [...], left: [...], right: [...] });
//   show(book.el);   // book.leftPage / book.rightPage — сами страницы, если содержимое нужно менять позже
//
// Фильтры (wc, wc2, paper…) вставляет core/art/filters.js при старте.

import { h, button, format } from '../dom.js';
import { ILLUSTRATION_FRONT, svgEl, illustrationBack, starIcon, boneIcon, lockIcon, homeIcon } from './book-art.js';
import { drawDog } from '../dogs.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';

// Собака-проводник страниц книги: первая собака ребёнка; пока своей нет (косточки на неё ещё копятся) —
// золотистый лабрадор Бобик, чтобы страница не была пустой. Это не купленная собака: во дворе её нет.
const GUIDE_DOG = Object.freeze({ name: 'Бобик', breed: 'labrador', color: 'gold', age: 3 });
export const guideDog = () => storage.dogApi('real').dogs()[0] || GUIDE_DOG;

// top — правая часть верха стола (счётчики, записки, замок); topLeft — левая (например, «Домой»).
// Страницы кладутся внутрь position: absolute, поэтому содержимое задаёт позиции само.
export function createBook({ className = '', top = [], topLeft = [], left = [], right = [] } = {}) {
  const leftPage = h('div', { class: 'book-page book-left' }, left);
  const rightPage = h('div', { class: 'book-page book-right' }, right);
  const el = h('div', { class: `screen book-screen ${className}`.trim() },
    h('div', { class: 'book-table', 'aria-hidden': 'true' }),
    h('div', { class: 'book-stage' },
      topLeft.length ? h('div', { class: 'book-top-left' }, topLeft) : null,
      h('header', { class: 'book-top' }, top),
      h('div', { class: 'book-cover', 'aria-hidden': 'true' }),
      leftPage,
      rightPage,
      h('div', { class: 'book-spine', 'aria-hidden': 'true' }),
      h('div', { class: 'book-paper', 'aria-hidden': 'true' })));
  return { el, leftPage, rightPage };
}

// Звёзды и косточки на бумажной плашке.
export function counters(stars, bones) {
  return h('div', { class: 'book-counters' },
    h('span', { class: 'book-count', 'aria-label': format(STR.book.starsLabel, { n: stars }) },
      svgEl(starIcon(), 'book-count-icon'), String(stars)),
    h('span', { class: 'book-count-sep', 'aria-hidden': 'true' }),
    h('span', { class: 'book-count', 'aria-label': format(STR.book.bonesLabel, { n: bones }) },
      svgEl(boneIcon(), 'book-count-icon'), String(bones)));
}

// Записка на скотче: бумажная кнопка с подписью от руки. icon — готовая SVG-строка, className задаёт цвет и наклон.
export function noteButton({ label, icon, className = '', onTap }) {
  const el = button(`book-note ${className}`.trim(), [
    h('i', { class: 'tape', 'aria-hidden': 'true' }),
    icon ? svgEl(icon, 'book-note-icon') : null,
    label,
  ], onTap);
  el.setAttribute('aria-label', label);
  return el;
}

// Маленький полупрозрачный замок «Для родителей».
export function lockButton(label, onTap) {
  const el = button('book-lock', svgEl(lockIcon(), 'book-lock-icon'), onTap);
  el.setAttribute('aria-label', label);
  el.title = label;
  return el;
}

// Одностраничный вариант для экрана задания: на всё окно — бумажная страница в тонкой обложке. Модуль рисует поверх неё
// (контейнер и кнопки экран добавляет сам), поэтому поля узкие: содержимое модуля не должно выходить за страницу.
// Бумага с обложкой (.sheet-paper) перелистывается при открытии (page-turn); содержимое модуля в повороте не участвует —
// иначе модуль измерил бы координаты на повёрнутой странице.
export function createSheet({ className = '' } = {}) {
  const el = h('div', { class: `screen book-sheet ${className}`.trim() },
    h('div', { class: 'sheet-paper page-turn', 'aria-hidden': 'true' },
      h('div', { class: 'sheet-cover' }),
      h('div', { class: 'sheet-page' })));
  return { el };
}

// Иллюстрация левой страницы: луг с тропинкой к косточке; pathDone — сколько из пяти звёзд на тропинке закрашено.
// Собака (если она есть у ребёнка) рисуется через drawDog и стоит на тропинке; joy — собака радуется (прыгает).
export function createIllustration({ dog = null, pathDone = 0, joy = false, label = '' } = {}) {
  return h('div', { class: 'bk-art', role: 'img', 'aria-label': label },
    svgEl(illustrationBack(pathDone), 'bk-art-back'),
    svgEl(ILLUSTRATION_FRONT, 'bk-art-front'),
    dog ? h('div', { class: `bk-dog${joy ? ' joy' : ''}` }, drawDog({ ...dog, mood: 'happy' })) : null);
}

// Бумажный ярлычок «домой» (место и размер — как у прежней кнопки, .home-btn в base.css).
export function homeTag(label, onTap) {
  const el = button('paper-card home-btn', [h('i', { class: 'tape', 'aria-hidden': 'true' }), svgEl(homeIcon(), 'home-icon')], onTap);
  el.setAttribute('aria-label', label);
  el.title = label;
  return el;
}
