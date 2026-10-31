// Наклейки в стиле «сказочной книжки» (design/sketch/Stickers.dc.html). Разворот: слева мир супер-наклеек (акварельная
// сцена из WORLDS), справа — закладки «Коллекция» (альбомы-страницы с наклейками) и «Лавка» (наклейки покупаются за звёзды).
// Купленная наклейка — настоящая наклейка: белая кайма и тень (фильтр stk); ещё не купленная — карандашный набросок
// того же эмодзи (фильтр pencil). Каталог (ALBUMS, WORLDS, цены) — в core/rewards.js, он не меняется.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { ALBUMS, WORLDS, WORLD_SIZE, TOTAL_SUPERS, stickerById, worldProgress } from '../rewards.js';
import { superSticker } from '../cycles.js';
import { createBook, counters, noteButton } from './book.js';
import { svgEl, starIcon } from './book-art.js';

const S = STR.stickers;
const SHOP_PER_PAGE = 12; // карточек на странице лавки (3 в ряд, 4 ряда)

// Страницы лавки: альбом по 12 наклеек (в первом, на 24, — две страницы).
const SHOP_PAGES = ALBUMS.flatMap((album) => {
  const parts = Math.ceil(album.items.length / SHOP_PER_PAGE);
  return Array.from({ length: parts }, (_, i) => ({ album, part: i + 1, parts, items: album.items.slice(i * SHOP_PER_PAGE, (i + 1) * SHOP_PER_PAGE) }));
});

const SPARK = 'M0 -12 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4 z';
const sparkles = () => svgEl(`<svg xmlns="http://www.w3.org/2000/svg" class="st-sparks" aria-hidden="true" viewBox="-50 -50 100 100" overflow="visible"><g transform="translate(34 -30)"><path class="bk-sparkle" d="${SPARK}" fill="#F7D774"/></g><g transform="translate(-36 -8)"><path class="bk-sparkle bk-sparkle-2" d="${SPARK}" transform="scale(0.75)" fill="#F7D774"/></g><g transform="translate(26 34)"><path class="bk-sparkle" d="${SPARK}" transform="scale(0.6)" fill="#F7D774"/></g></svg>`);

// Эмодзи как наклейка (купленная) или как карандашный набросок (ещё нет).
const stickerFace = (emoji, have, extra = '') => h('span', { class: `st-emoji ${have ? 'owned' : 'sketch'} ${extra}`.trim(), text: emoji });

export function renderStickers(app) {
  const supers = () => storage.supers();
  const topWorld = () => Math.min(WORLDS.length - 1, Math.floor(supers() / WORLD_SIZE));
  let tab = 'mine';
  let worldIdx = topWorld(); // какой мир показан слева
  let albumIdx = 0; // страница альбома в «Коллекции»
  let shopIdx = 0; // страница лавки
  let selected = null; // выбранная для покупки наклейка
  let say = ''; // реплика под заголовком вкладки
  let sayMood = 'idle'; // idle | yay | miss
  let boughtId = null; // только что купленная наклейка: отскок и искорки при перерисовке

  const topCounters = h('div', { class: 'st-counters' });
  const book = createBook({
    className: 'stickers-book',
    topLeft: [noteButton({ label: `⬅ ${STR.common.back}`, className: 'dog-back', onTap: () => app.go.menu() })],
    top: [topCounters],
  });
  const left = h('div', { class: 'st-left' });
  const side = h('div', { class: 'dog-side st-side' });
  book.leftPage.append(left);
  book.rightPage.append(side);
  const screen = book.el;

  function refresh({ turn = false } = {}) {
    topCounters.replaceChildren(counters(storage.balance(), storage.bonesBalance()));
    renderLeft();
    renderSide(turn);
    boughtId = null;
  }

  // ---------- Левая страница: мир супер-наклеек ----------
  function renderLeft() {
    const n = supers();
    const world = WORLDS[worldIdx];
    const count = worldProgress(n, worldIdx);
    const open = topWorld();
    const goWorld = (step) => () => {
      worldIdx = Math.max(0, Math.min(open, worldIdx + step));
      app.services.sounds('tap');
      renderLeft();
    };
    const arrow = (label, step, disabled) => {
      const b = button('paper-card st-arrow', label, goWorld(step === '‹' ? -1 : 1));
      b.setAttribute('aria-label', step === '‹' ? S.prevWorld : S.nextWorld);
      if (disabled) b.disabled = true;
      return b;
    };
    const left0 = WORLD_SIZE - count;
    const caption = n === 0 ? S.worldHint : left0 > 0 ? format(S.worldLeft, { n: left0 }) : S.worldDone;

    const extras = [];
    for (let k = TOTAL_SUPERS + 1; k <= n; k++) extras.push(stickerFace(superSticker(k).emoji, true));

    left.replaceChildren(...[
      h('div', { class: 'dog-head-row' },
        h('h1', { class: 'dog-name hand', text: world.title.ru }),
        h('span', { class: 'dog-meta', text: format(S.worldProgress, { n: count, total: WORLD_SIZE }) })),
      worldScene(world, count),
      h('div', { class: 'st-world-row' },
        open > 0 ? arrow('‹', '‹', worldIdx === 0) : null,
        h('p', { class: 'st-caption hand', text: caption }),
        open > 0 ? arrow('›', '›', worldIdx === open) : null),
      extras.length ? h('div', { class: 'st-extras', 'aria-label': S.superMore }, extras) : null,
    ].filter(Boolean));
  }

  // ---------- Правая страница: закладки и страница альбома / лавки ----------
  function renderSide(turn) {
    const shop = tab === 'shop';
    side.replaceChildren(
      tabStrip(),
      h('div', { class: `dog-tab-page${turn ? ' page-turn' : ''} ${shop ? 's-english' : 's-russian'}` },
        shop ? shopPage() : minePage()));
  }

  function tabStrip() {
    const mk = (id, icon, label, color) => {
      const btn = button(`ribbon dog-tab ${color}${tab === id ? ' on active' : ''}`, [
        h('span', { class: 'dog-tab-icon', text: icon }),
        h('span', { class: 'dog-tab-label', text: label }),
      ], () => {
        if (tab === id) return;
        tab = id;
        selected = null;
        say = '';
        sayMood = 'idle';
        app.services.sounds('tap');
        refresh({ turn: true });
      });
      btn.setAttribute('aria-pressed', String(tab === id));
      btn.setAttribute('aria-label', id === 'mine' ? S.tabMine : S.shopTitle);
      return btn;
    };
    return h('nav', { class: 'dog-tabs', 'aria-label': S.tabsLabel },
      mk('mine', '📒', S.tabMineShort, 's-russian'), mk('shop', '🛍️', S.tabShopShort, 's-english'));
  }

  // Заголовок страницы, стрелки «назад / вперёд» и реплика.
  function pageHead(title, sub, index, total, go) {
    const arrow = (label, delta) => {
      const b = button('paper-card st-arrow', label, () => go(delta));
      b.setAttribute('aria-label', delta < 0 ? S.prevPage : S.nextPage);
      if ((delta < 0 && index === 0) || (delta > 0 && index === total - 1)) b.disabled = true;
      return b;
    };
    return h('div', { class: 'dog-tab-head' },
      h('div', { class: 'st-head-row' },
        h('h2', { class: 'dog-tab-title hand', text: title }),
        h('div', { class: 'st-nav' }, arrow('‹', -1), arrow('›', 1))),
      h('p', { class: `dog-tab-hint st-say ${sayMood}`, text: sub }));
  }

  // «Коллекция»: страница альбома — все наклейки альбома, купленные в цвете, остальные карандашом.
  function minePage() {
    const album = ALBUMS[albumIdx];
    const owned = new Set(storage.owned());
    const have = album.items.filter((s) => owned.has(s.id)).length;
    const cols = album.items.length > 12 ? 6 : 4;
    return [
      pageHead(`${album.icon} ${album.title}`, `${format(S.albumProgress, { n: have, total: album.items.length })}${have === 0 ? ` · ${S.mineEmpty}` : ''}`, albumIdx, ALBUMS.length, (d) => {
        albumIdx += d;
        app.services.sounds('tap');
        refresh({ turn: true });
      }),
      h('div', { class: 'st-grid st-album', style: `--cols:${cols}` },
        album.items.map((s) => h('div', { class: 'st-slot' }, stickerFace(s.emoji, owned.has(s.id))))),
    ];
  }

  // «Лавка наклеек»: бумажные карточки с ценой на жёлтой плашке; на купленных печать «Есть!».
  function shopPage() {
    const page = SHOP_PAGES[shopIdx];
    const owned = new Set(storage.owned());
    const sub = say || S.shopSub;
    return [
      pageHead(S.shopTitle, sub, shopIdx, SHOP_PAGES.length, (d) => {
        shopIdx += d;
        selected = null;
        say = '';
        sayMood = 'idle';
        app.services.sounds('tap');
        refresh({ turn: true });
      }),
      h('p', { class: 'st-album-name', text: `${page.album.icon} ${page.album.title}${page.parts > 1 ? ` · ${page.part}/${page.parts}` : ''}` }),
      h('div', { class: 'st-grid st-shop' }, page.items.map((s, k) => shopCard(s, owned.has(s.id), k))),
      buyBar(),
    ];
  }

  function shopCard(sticker, isOwned, k) {
    const far = !isOwned && sticker.price > storage.balance();
    const fresh = boughtId === sticker.id;
    const card = button(`paper-card st-card${isOwned ? ' owned' : ''}${selected === sticker.id ? ' selected' : ''}${far ? ' far' : ''}`, [
      h('i', { class: 'tape', 'aria-hidden': 'true' }),
      h('span', { class: 'st-card-pic' }, stickerFace(sticker.emoji, true, fresh ? 'pop' : ''), fresh ? sparkles() : null),
      isOwned ? h('span', { class: 'stamp st-stamp', text: S.stamp }) : h('span', { class: 'st-price' }, svgEl(starIcon(far ? '#D8C9AE' : '#F4C34E'), 'st-price-star'), String(sticker.price)),
    ], () => {
      if (isOwned) {
        say = S.sayOwned;
        sayMood = 'idle';
        selected = null;
      } else {
        selected = sticker.id;
        if (far) {
          say = S.notEnoughHint;
          sayMood = 'miss';
        } else {
          say = S.sayPick;
          sayMood = 'idle';
        }
      }
      app.services.sounds('tap');
      refresh();
    });
    card.style.setProperty('--rot', `${[-1.5, 1.2, -0.8, 1.4, -1.1, 0.9][k % 6]}deg`);
    card.style.setProperty('--tape-rot', `${[3, -4, 5, -3, 2, -5][k % 6]}deg`);
    card.setAttribute('aria-label', isOwned ? `${S.stamp}` : format(S.price, { price: sticker.price }));
    return card;
  }

  // Кнопка «Купить» (нужна, чтобы не купить случайным касанием); если звёзд не хватает — мягкая подсказка вместо неё.
  function buyBar() {
    const sticker = selected && stickerById.get(selected);
    if (!sticker) return h('div', { class: 'st-buy' });
    const missing = sticker.price - storage.balance();
    if (missing > 0) return h('div', { class: 'st-buy' }); // мягкая подсказка уже в заголовке страницы, плашка цены бледная
    const buy = button('btn primary big st-buy-btn', format(S.buy, { price: sticker.price }), () => {
      if (!storage.buySticker(sticker.id)) return;
      app.services.sounds('star');
      boughtId = sticker.id;
      selected = null;
      say = S.sayBought;
      sayMood = 'yay';
      refresh();
    });
    return h('div', { class: 'st-buy' }, stickerFace(sticker.emoji, true, 'st-buy-pic'), buy);
  }

  refresh();
  return screen;
}

// Сцена мира: небо и холм из WORLDS (акварельные края), предметы на своих местах — полученные настоящими наклейками,
// остальные карандашным наброском того же эмодзи.
function worldScene(world, count) {
  const items = world.items.map((s, i) => {
    const have = i < count;
    const el = h('span', { class: `scene-item ${have ? 'owned' : 'sketch'}`, title: have ? s.ru : '', text: s.emoji });
    el.style.left = `${s.x}%`;
    el.style.top = `${s.y}%`;
    el.style.fontSize = `${s.size * 1.15}cqw`;
    return el;
  });
  const sky = h('div', { class: 'scene-sky' });
  sky.style.background = world.sky;
  const hill = h('div', { class: 'scene-hill' });
  hill.style.background = world.ground;
  return h('div', { class: 'st-scene', role: 'img', 'aria-label': world.title.ru }, h('div', { class: 'scene-paint' }, sky, hill), items);
}
