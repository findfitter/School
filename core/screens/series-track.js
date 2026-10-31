// Дорожка серии на экране задания: акварельные лапки к косточке вместо серых точек модуля.
// Лапок столько, сколько заданий в серии (настройка seriesLength); закрашивается лапка за каждое задание,
// законченное с первого захода (ядро получает его из ctx.task, повторы ошибок в конце серии не считаются).

import { h, format } from '../dom.js';
import { STR } from '../strings.js';
import { svgEl, pawMark, boneMark } from './book-art.js';

export function createTrack(total) {
  const paws = Array.from({ length: total }, () => h('span', { class: 'track-paw' }, svgEl(pawMark())));
  const bone = h('span', { class: 'track-bone' }, svgEl(boneMark()));
  const el = h('div', { class: 'series-track', role: 'img', 'aria-label': format(STR.book.trackLabel, { n: 0, total }) }, paws, bone);
  let done = 0;

  const paint = () => {
    paws.forEach((paw, i) => {
      paw.classList.toggle('done', i < done);
      paw.classList.toggle('next', i === done);
    });
    bone.classList.toggle('done', done >= total);
    el.setAttribute('aria-label', format(STR.book.trackLabel, { n: done, total }));
  };
  paint();

  return {
    el,
    // Одно задание закончено: закрасить следующую лапку (с отскоком).
    advance() {
      if (done >= total) return;
      done += 1;
      paint();
      paws[done - 1].classList.add('pop');
    },
  };
}
