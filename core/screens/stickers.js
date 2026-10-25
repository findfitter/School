// Наклейки: вкладка «Моя коллекция» (миры супер-наклеек и купленные наклейки)
// и вкладка «Магазин» (наклейки покупаются за звёзды).

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { ALBUMS, CATALOG, WORLDS, WORLD_SIZE, TOTAL_SUPERS, stickerById, worldProgress } from '../rewards.js';
import { superSticker } from '../cycles.js';

const S = STR.stickers;

export function renderStickers(app) {
  let tab = 'mine';
  let selected = null;

  const chip = h('div', { class: 'chip' });
  const main = h('main', { class: 'scroll content' });
  const footer = h('footer', { class: 'buy-bar' });
  const tabMine = button('tab', S.tabMine, () => switchTab('mine'));
  const tabShop = button('tab', S.tabShop, () => switchTab('shop'));

  const screen = h('div', { class: 'screen stickers-screen' },
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => app.go.menu()),
      h('h1', { text: S.title }),
      chip),
    h('div', { class: 'tabs' }, tabMine, tabShop),
    main,
    footer);

  function switchTab(next) {
    if (tab === next) return;
    tab = next;
    selected = null;
    main.scrollTop = 0;
    refresh();
  }

  function refresh() {
    const scroll = main.scrollTop;
    chip.textContent = format(S.balance, { n: storage.balance() });
    tabMine.classList.toggle('active', tab === 'mine');
    tabShop.classList.toggle('active', tab === 'shop');
    main.replaceChildren(...(tab === 'mine' ? mineView() : shopView()));
    footer.hidden = tab !== 'shop';
    footer.replaceChildren(...(tab === 'shop' ? buyBar() : []));
    main.scrollTop = scroll;
  }

  // ---------- Моя коллекция ----------
  function mineView() {
    const supers = storage.supers();
    const owned = new Set(storage.owned());
    const blocks = [];

    // Миры: показываем открытые и следующий закрытый.
    const current = Math.min(WORLDS.length - 1, Math.floor(supers / WORLD_SIZE));
    if (supers === 0) blocks.push(h('p', { class: 'hint-line', text: S.worldHint }));
    for (let w = 0; w <= current; w++) {
      const count = worldProgress(supers, w);
      blocks.push(
        h('h2', { class: 'section-title' },
          WORLDS[w].title.ru,
          h('small', { text: format(S.worldProgress, { n: count, total: WORLD_SIZE }) })),
        worldScene(WORLDS[w], count));
    }
    if (current + 1 < WORLDS.length && worldProgress(supers, current) === WORLD_SIZE) {
      blocks.push(h('p', { class: 'hint-line', text: format(S.worldLocked, { world: WORLDS[current + 1].title.ru }) }));
    }
    if (supers > TOTAL_SUPERS) {
      const extras = [];
      for (let n = TOTAL_SUPERS + 1; n <= supers; n++) extras.push(h('div', { class: 'sticker super' }, superSticker(n).emoji));
      blocks.push(h('h2', { class: 'section-title', text: S.superMore }), h('div', { class: 'sticker-grid' }, extras));
    }

    // Купленные наклейки по альбомам.
    let any = false;
    for (const album of ALBUMS) {
      const mine = album.items.filter((s) => owned.has(s.id));
      if (!mine.length) continue;
      any = true;
      blocks.push(
        h('h2', { class: 'section-title' },
          `${album.icon} ${album.title}`,
          h('small', { text: format(S.albumProgress, { n: mine.length, total: album.items.length }) })),
        h('div', { class: 'sticker-grid sticker-main' }, mine.map((s) => h('div', { class: 'sticker' }, s.emoji))));
    }
    if (!any) blocks.push(h('p', { class: 'hint-line', text: S.mineEmpty }));
    return blocks;
  }

  // ---------- Магазин ----------
  function shopView() {
    const owned = new Set(storage.owned());
    const blocks = [];
    for (const album of ALBUMS) {
      const have = album.items.filter((s) => owned.has(s.id)).length;
      blocks.push(
        h('h2', { class: 'section-title' },
          `${album.icon} ${album.title}`,
          h('small', { text: format(S.albumProgress, { n: have, total: album.items.length }) })),
        h('div', { class: 'shop-grid' }, album.items.map((s) => shopItem(s, owned.has(s.id)))));
    }
    return blocks;
  }

  function shopItem(sticker, isOwned) {
    const classes = ['shop-item'];
    if (isOwned) classes.push('owned');
    if (selected === sticker.id) classes.push('selected');
    if (!isOwned && sticker.price > storage.balance()) classes.push('far');
    const item = button(classes.join(' '), [
      h('span', { class: 'shop-emoji', text: sticker.emoji }),
      h('span', { class: 'shop-price', text: isOwned ? '✓' : format(S.price, { price: sticker.price }) }),
    ], () => {
      if (isOwned) return;
      selected = sticker.id;
      app.services.sounds('tap');
      refresh();
    });
    if (isOwned) item.disabled = true;
    return item;
  }

  function buyBar() {
    const sticker = selected && stickerById.get(selected);
    if (!sticker) return [h('span', { class: 'buy-hint', text: S.pick })];
    const missing = sticker.price - storage.balance();
    const buy = button('btn primary big', missing > 0 ? format(S.notEnough, { n: missing }) : format(S.buy, { price: sticker.price }), () => {
      if (!storage.buySticker(sticker.id)) return;
      app.services.sounds('star');
      selected = null;
      refresh();
      screen.append(boughtPopup(sticker));
    });
    if (missing > 0) buy.disabled = true;
    return [h('span', { class: 'buy-emoji', text: sticker.emoji }), buy];
  }

  function boughtPopup(sticker) {
    const popup = h('div', { class: 'overlay bought-popup' },
      h('div', { class: 'super-card' },
        h('div', { class: 'super-flyer', text: sticker.emoji }),
        h('h2', { text: S.bought }),
        button('btn primary big', S.ok, () => popup.remove())));
    return popup;
  }

  refresh();
  return screen;
}

// Сцена мира: полученные предметы стоят на местах, остальные — пунктирные кружки.
function worldScene(world, count) {
  const items = world.items.map((s, i) => {
    const style = `left:${s.x}%;top:${s.y}%;font-size:${s.size}cqw`;
    return i < count
      ? h('span', { class: 'scene-item', style, title: s.ru, text: s.emoji })
      : h('span', { class: 'scene-item empty', style, text: '?' });
  });
  const scene = h('div', { class: 'scene' }, h('div', { class: 'scene-hill' }), items);
  scene.style.background = world.sky;
  scene.querySelector('.scene-hill').style.background = world.ground;
  return scene;
}
