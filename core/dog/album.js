// Фотоальбом: снимки двора (собаки в нарядах и обстановка). Снимок хранит только данные и рисуется заново.
// renderScene рисует двор по снимку (для миниатюр и увеличенного снимка), createAlbumGame — экран альбома.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';
import { itemById } from '../dog-items.js';

const A = STR.dog.album;

// Где стоят предметы обстановки (в % сцены) и их размер (в % ширины сцены) — как во дворе (core/screens/dog.js).
export const DECOR_POSITIONS = {
  house: { x: 11, y: 46, size: 13 },
  fun: { x: 84, y: 38, size: 13 },
  bed: { x: 30, y: 52, size: 9 },
  toy: { x: 70, y: 56, size: 7 },
  plant: { x: 93, y: 54, size: 9 },
};
const SLOTS = { 1: [50], 2: [30, 70], 3: [18, 50, 82] };

export function renderScene(photo) {
  const scene = h('div', { class: 'photo-scene' }, h('div', { class: 'photo-sky' }), h('div', { class: 'photo-lawn' }));
  for (const [slot, id] of Object.entries(photo.decor || {})) {
    const item = id && itemById.get(id);
    const pos = DECOR_POSITIONS[slot];
    if (!item || !pos) continue;
    const el = h('span', { class: 'photo-decor', text: item.icon });
    el.style.left = `${pos.x}%`;
    el.style.top = `${pos.y}%`;
    el.style.fontSize = `${pos.size}cqw`;
    scene.append(el);
  }
  const slots = SLOTS[Math.min(3, photo.dogs.length)];
  photo.dogs.forEach((dog, i) => {
    const wrap = h('div', { class: `photo-dog dogs-${photo.dogs.length}` }, drawDog({ ...dog, mood: 'happy' }));
    wrap.style.left = `${slots[i]}%`;
    scene.append(wrap);
  });
  return scene;
}

export function createAlbumGame({ app, store, alive, wait }) {
  const grid = h('div', { class: 'album-grid' });
  const root = h('div', { class: 'album' }, grid);

  function showBig(index, photo) {
    const popup = h('div', { class: 'overlay bought-popup album-big' },
      h('div', { class: 'album-big-card' },
        renderScene(photo),
        h('div', { class: 'album-big-actions' },
          button('btn', A.delete, () => {
            store.deletePhoto(index);
            popup.remove();
            render();
          }),
          button('btn primary', A.close, () => popup.remove()))));
    root.append(popup);
  }

  function render() {
    const photos = store.photos();
    if (!photos.length) {
      grid.replaceChildren(h('div', { class: 'album-empty' }, h('div', { class: 'album-empty-icon', text: '📷' }), h('p', { text: A.empty })));
      return;
    }
    grid.replaceChildren(...photos.map((photo, i) => {
      const thumb = button('album-thumb', renderScene(photo), () => showBig(i, photo));
      thumb.append(h('small', { text: format(A.date, { date: new Date(photo.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) }) }));
      return thumb;
    }));
  }

  render();
  return { el: root, cleanup() {} };
}
