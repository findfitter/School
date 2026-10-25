import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { STICKERS, SUPER_STICKERS, STARS_PER_STICKER, unlockedCount, starsToNext } from '../rewards.js';
import { superSticker } from '../cycles.js';

export function renderStickers(app) {
  const stars = storage.stars();
  const unlocked = unlockedCount(stars);
  const left = starsToNext(stars);
  const supers = storage.supers();

  const cells = STICKERS.map((emoji, i) =>
    i < unlocked
      ? h('div', { class: 'sticker' }, emoji)
      : h('div', { class: 'sticker locked' },
          h('span', { class: 'sticker-lock', text: '❔' }),
          h('small', { text: format(STR.stickers.locked, { stars: (i + 1) * STARS_PER_STICKER }) }))
  );

  return h('div', { class: 'screen stickers-screen' },
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => app.go.menu()),
      h('h1', { text: STR.stickers.title }),
      h('div', { class: 'chip' }, `⭐ ${stars}`)),
    h('main', { class: 'scroll content' },
      h('h2', { class: 'section-title', text: STR.stickers.superTitle }),
      supers ? null : h('p', { class: 'hint-line', text: STR.stickers.superHint }),
      fairyScene(supers),
      supers > SUPER_STICKERS.length ? extraTreasures(supers) : null,
      h('p', { class: 'hint-line', text: left ? format(STR.stickers.progress, { left }) : STR.stickers.complete }),
      h('div', { class: 'sticker-grid sticker-main' }, cells))
  );
}

// Сказочная сцена: каждая супер-наклейка занимает своё место; свободные места — пунктирные кружки.
function fairyScene(supers) {
  const items = SUPER_STICKERS.map((s, i) => {
    const style = `left:${s.x}%;top:${s.y}%;font-size:${s.size}cqw`;
    return i < supers
      ? h('span', { class: 'scene-item', style, title: s.ru, text: s.emoji })
      : h('span', { class: 'scene-item empty', style, text: '?' });
  });
  return h('div', { class: 'scene' }, h('div', { class: 'scene-hill' }), items);
}

// Если собрано больше наклеек, чем мест на сцене, остальные лежат отдельным рядом.
function extraTreasures(supers) {
  const extras = [];
  for (let n = SUPER_STICKERS.length + 1; n <= supers; n++) {
    extras.push(h('div', { class: 'sticker super' }, superSticker(n).emoji));
  }
  return h('div', {},
    h('h2', { class: 'section-title', text: STR.stickers.superMore }),
    h('div', { class: 'sticker-grid' }, extras));
}
