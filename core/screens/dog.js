// Раздел собаки: косточки, двор с собаками, уход, игры, магазин, покупка собаки.
// Экран без прокрутки: слева двор, справа показатели выбранной собаки, вкладки и их кнопки. Все купленные собаки
// стоят во дворе вместе; собака выбирается касанием, уход и игры относятся к выбранной.
// Собаки живые (моргают, виляют хвостом, дышат), по касанию радуются. У каждой есть сытость, настроение и чистота:
// со временем они падают (собака голодает, скучает, пачкается), но наказаний нет — она просто просит внимания.
// Игры и занятия — небольшие режимы на весь экран (core/dog/*.js): «Принеси мяч», мытьё и другие.
// Косточки даются за сложные задания в разделах (core/challenges.js).

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import {
  BREEDS, COLORS, NAMES, NAME_MAX, MAX_AGE, MAX_POOPS, PACK_PRICE, FULL_AT, HUNGRY_AT, SAD_AT, DIRTY_AT, WASH_FROM,
  TIRED_AT, SLEEP_FROM, ENERGY_COST,
  dogPrice, ageLabel, breedById, drawDog, moodState,
} from '../dogs.js';
import { createBallGame } from '../dog/ball.js';
import { createWashGame } from '../dog/wash.js';
import { createTricksGame } from '../dog/tricks.js';
import { createHideGame } from '../dog/hide.js';
import { createWalkGame } from '../dog/walk.js';
import { createQuizGame } from '../dog/quiz.js';
import { createReadingGame } from '../dog/reading.js';
import { createAlbumGame, DECOR_POSITIONS } from '../dog/album.js';
import { createSleepGame } from '../dog/sleep.js';
import { ITEMS, SLOT_GROUPS, itemById } from '../dog-items.js';

const D = STR.dog;

// Где лежат какашки собаки: сдвиг по горизонтали (в % ширины её места) и высота на сцене (в %).
const POOP_SPOTS = [[-34, 70], [34, 70], [-14, 84], [14, 84]];
const EAT_MS = 2600; // сколько собака ест
const POOP_MS = 1500; // сколько она «делает дела» до появления какашки
const TICK_MS = 30000; // как часто пересчитываем показатели на открытом экране
const SUGGESTED_NAMES = NAMES.slice(0, 6); // готовые имена в выборе собаки (на экране без прокрутки их немного)

// Где стоят собаки во дворе (в % ширины сцены) в зависимости от их числа.
const SLOTS = { 1: [50], 2: [30, 70], 3: [18, 50, 82] };

// Вкладки справа. Каждая — список кнопок (см. tabContent).
const TABS = [
  { id: 'care', icon: '🐾', title: D.tabCare },
  { id: 'play', icon: '🎾', title: D.tabPlay },
  { id: 'learn', icon: '🎓', title: D.tabLearn },
  { id: 'outfit', icon: '👕', title: D.tabOutfit },
  { id: 'home', icon: '🏡', title: D.tabHome },
  { id: 'shop', icon: '🛒', title: D.tabShop },
];

// scope: 'real' — рабочий экран ребёнка; 'test' — тестовый экран в разделе для родителя (свои собаки и косточки,
// сверху панель «+1 🦴» и сброс), чтобы проверять новые возможности, не трогая рабочие данные.
export function renderDog(app, { scope = 'real', onBack = () => app.go.menu() } = {}) {
  const store = storage.dogApi(scope);
  const testing = scope === 'test';
  let draft = null; // собака, которую выбирают сейчас (пока не куплена), или null
  let selectedId = null; // какая собака выбрана во дворе
  let busy = false; // идёт кормление
  let tab = 'care'; // какая вкладка открыта справа
  let game = null; // идущая мини-игра { el, cleanup }
  let yard = null; // двор текущего главного экрана (см. yardView)
  const catSlot = { outfit: 'hat', decor: 'house' }; // открытое место в каталогах «Наряды» и «Дом»

  const alive = () => screen.isConnected;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const chip = h('div', { class: 'chip' });
  const main = h('main', { class: 'content dog-content' });
  const footer = h('footer', { class: 'buy-bar dog-footer' });
  const screen = h('div', { class: 'screen dog-screen' },
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => (game ? endGame() : draft ? closeCreator() : onBack())),
      h('h1', { text: testing ? D.testTitle : D.title }),
      testing ? testTools() : null,
      chip),
    main,
    footer);

  // Тестовый экран: выдать косточки и начать сначала (только для проверки новых возможностей).
  function testTools() {
    return h('div', { class: 'dog-test-tools' },
      h('span', { text: `🧪 ${D.testBadge}` }),
      button('btn', D.testBone1, () => { store.addBones(1); app.services.sounds('star'); refresh(); }),
      button('btn', D.testBone5, () => { store.addBones(5); app.services.sounds('star'); refresh(); }),
      button('btn', D.testDays, () => { if (busy || game) return; store.shiftTime(4); app.services.sounds('star'); refresh(); }),
      button('btn quiet', D.testReset, () => {
        if (busy || game) return;
        store.reset();
        selectedId = null;
        refresh();
      }));
  }

  const price = () => dogPrice(store.dogs().length);
  const missing = () => (price() ?? 0) - store.bonesBalance();
  const selected = () => store.dogs().find((d) => d.id === selectedId);

  function refresh() {
    chip.textContent = format(D.bonesChip, { n: store.bonesBalance() });
    if (draft || game) return;
    footer.hidden = true;
    footer.replaceChildren();
    main.replaceChildren(homeView());
    showNews();
  }

  // Дни рождения и рождение щенка: поздравление показывается один раз.
  function showNews() {
    for (const news of store.takeNews()) {
      const dog = store.dogs().find((d) => d.id === news.dogId);
      if (!dog) continue;
      const text = news.type === 'puppy'
        ? format(D.puppyBorn, { name: news.name })
        : format(D.birthday, { name: news.name, age: ageLabel(news.age) });
      const popup = h('div', { class: 'overlay bought-popup' },
        h('div', { class: 'super-card dog-popup' },
          h('div', { class: 'dog-art-box' }, drawDog(dog)),
          h('h2', { text }),
          button('btn primary big', D.ok, () => popup.remove())));
      screen.append(popup);
      app.services.sounds('done');
    }
  }

  // ---------- Мини-игры и занятия на весь экран ----------
  function startGame(create) {
    const dog = selected();
    if (!dog || busy || game) return;
    game = create({
      app, store, dog, alive, wait,
      exit: () => endGame(),
    });
    footer.hidden = true;
    main.replaceChildren(game.el);
  }

  function endGame() {
    if (!game) return;
    game.cleanup?.();
    game = null;
    refresh();
  }

  // ---------- Главный экран раздела ----------
  function homeView() {
    const dogs = store.dogs();
    if (!dogs.some((d) => d.id === selectedId)) selectedId = dogs[0]?.id ?? null;
    if (!dogs.length) {
      yard = null;
      const ghost = drawDog({ breed: 'labrador', color: 'grey', age: 3 });
      ghost.classList.add('ghost');
      return h('div', { class: 'dog-empty' },
        h('div', { class: 'dog-art-box' }, ghost, h('span', { class: 'dog-question', text: '?' })),
        h('h2', { text: D.emptyTitle }),
        h('p', { text: `${D.emptyText} ${D.howTo}` }),
        h('p', { class: 'dog-earned-line', text: `${format(D.earned, { n: store.bones() })} · ${format(D.spent, { n: store.bones() - store.bonesBalance() })}` }),
        buyDogButton(D.buyFirst));
    }
    const side = h('div', { class: 'dog-side' });
    yard = yardView(dogs, () => renderSide(side));
    renderSide(side);
    startTicker(side, dogs.length);
    return h('div', { class: 'dog-home' }, yard.stage, side);
  }

  // Каждые полминуты показатели пересчитываются, собака на экране меняет выражение.
  let tickerId = 0;
  function startTicker(side, count) {
    clearInterval(tickerId);
    const mine = yard;
    tickerId = setInterval(() => {
      if (!alive()) return clearInterval(tickerId);
      if (yard !== mine || busy || game) return;
      if (store.dogs().length !== count) return refresh(); // родился щенок
      mine.repaint();
      renderSide(side);
    }, TICK_MS);
  }

  // ---------- Правая колонка: показатели, вкладки, кнопки ----------
  function renderSide(side) {
    const dog = selected();
    side.replaceChildren(statsCard(dog), tabStrip(side), tabContent(side, dog));
  }

  function bar(icon, value, label) {
    const level = value < 25 ? 'low' : value < 55 ? 'mid' : 'high';
    const fill = h('i', { class: `dog-bar-fill ${level}` });
    fill.style.width = `${Math.round(value)}%`;
    const wrap = h('div', { class: 'dog-bar', title: `${label}: ${Math.round(value)}%` }, h('span', { text: icon }), h('div', { class: 'dog-bar-track' }, fill));
    return wrap;
  }

  function statsCard(dog) {
    return h('div', { class: 'dog-stats' },
      h('div', { class: 'dog-stats-name' }, h('strong', { text: dog.name }), h('small', { text: `${breedById.get(dog.breed).name} · ${ageLabel(dog.age)}` })),
      h('div', { class: 'dog-bars' }, bar('🍖', dog.fed, D.statFed), bar('❤️', dog.mood, D.statMood), bar('🧼', 100 - dog.dirt, D.statClean), bar('⚡', dog.energy, D.statEnergy)));
  }

  function tabStrip(side) {
    return h('div', { class: 'dog-tabs', role: 'tablist' },
      TABS.map((t) => {
        const btn = button(`dog-tab${t.id === tab ? ' active' : ''}`, [h('span', { class: 'dog-tab-icon', text: t.icon }), h('span', { class: 'dog-tab-title', text: t.title })], () => {
          if (busy) return;
          tab = t.id;
          renderSide(side);
        });
        btn.setAttribute('aria-label', t.title);
        return btn;
      }));
  }

  // Кнопка действия: подпись слева, счётчик справа.
  function action(label, count, handler, { primary = false, disabled = false } = {}) {
    const btn = button(`btn dog-action${primary ? ' primary' : ''}`, [h('span', { text: label }), count != null ? h('span', { text: count }) : null], handler);
    if (disabled) btn.disabled = true;
    return btn;
  }

  function tabContent(side, dog) {
    const box = h('div', { class: 'dog-tab-body' });
    if (tab === 'care') {
      box.append(
        action(`🥫 ${D.feed}`, format(D.feedLeft, { n: store.food() }), () => yard.feed(), { primary: true }),
        action(`🛍️ ${D.clean}`, format(D.cleanLeft, { n: store.bags() }), () => yard.clean()),
        action(`🧼 ${D.wash}`, format(D.washLeft, { n: store.shampoo() }), () => {
          if (busy) return;
          const fresh = selected();
          if (fresh.dirt < WASH_FROM) return yard.say(D.alreadyClean, 2200);
          if (store.shampoo() < 1) return yard.say(D.noShampoo, 2600);
          startGame(createWashGame);
        }),
        action(`😴 ${D.sleepAction}`, null, () => {
          if (busy) return;
          if (selected().energy >= SLEEP_FROM) return yard.say(D.notSleepy, 2200);
          startGame(createSleepGame);
        }));
    } else if (tab === 'play') {
      // Игры, где собака бегает, требуют сил: голодная собака сначала должна поесть.
      const play = (create, cost) => () => {
        if (busy) return;
        if (selected().fed < HUNGRY_AT) return yard.say(D.hungryNoPlay, 2600);
        if (selected().energy < TIRED_AT) return yard.say(D.tiredNoPlay, 2600);
        store.adjust(selected().id, { energy: -cost });
        startGame(create);
      };
      box.append(
        action(`🎾 ${D.ballTitle}`, null, play(createBallGame, ENERGY_COST.ball), { primary: true }),
        action(`🎓 ${D.tricks.title}`, null, () => { if (!busy) startGame(createTricksGame); }),
        action(`🙈 ${D.hide.title}`, null, play(createHideGame, ENERGY_COST.hide)),
        action(`🌳 ${D.walk.title}`, null, play(createWalkGame, ENERGY_COST.walk)));
    } else if (tab === 'learn') {
      box.append(
        action(`❓ ${D.quiz.title}`, null, () => { if (!busy) startGame(createQuizGame); }, { primary: true }),
        action(`📖 ${D.reading.title}`, null, () => { if (!busy) startGame(createReadingGame); }),
        h('small', { class: 'dog-earned-note', text: D.learnNote }));
    } else if (tab === 'outfit' || tab === 'home') {
      box.append(...catalogPanel(side, tab === 'outfit' ? 'outfit' : 'decor', dog));
    } else if (tab === 'shop') {
      const buy = (template, buyFn) => {
        const btn = button('btn dog-shop-btn', format(template, { price: PACK_PRICE }), () => {
          if (store.bonesBalance() < PACK_PRICE || !buyFn()) return;
          app.services.sounds('star');
          refresh();
        });
        btn.disabled = store.bonesBalance() < PACK_PRICE;
        return btn;
      };
      box.append(
        buy(D.buyFood, store.buyFood),
        buy(D.buyBags, store.buyBags),
        buy(D.buyShampoo, store.buyShampoo),
        price() != null ? buyDogButton(D.buyNext) : h('p', { class: 'hint-line', text: D.maxDogs }),
        h('small', { class: 'dog-earned-note', text: `${format(D.earned, { n: store.bones() })} · ${format(D.spent, { n: store.bones() - store.bonesBalance() })}` }));
    }
    return box;
  }

  // ---------- Каталоги: наряды на собаку и обстановка во дворе ----------
  // Касание предмета: свой — надеть/снять (поставить/убрать); чужой — купить за косточки и сразу надеть/поставить.
  function catalogPanel(side, kind, dog) {
    const groups = SLOT_GROUPS[kind];
    const slot = catSlot[kind];
    const info = h('small', { class: 'dog-earned-note', text: kind === 'outfit' ? D.outfitHint : D.homeHint });
    const owned = new Set(store.items());
    const current = kind === 'outfit' ? dog.outfit[slot] : store.decor()[slot];

    const chips = h('div', { class: 'dog-slot-chips' },
      groups.map((g) => {
        const chipBtn = button(`chip-btn small${g.id === slot ? ' active' : ''}`, `${g.icon} ${g.title}`, () => {
          catSlot[kind] = g.id;
          renderSide(side);
        });
        return chipBtn;
      }));

    // Плитка «ничего» (снять / убрать). Для ошейника это обычный красный.
    const none = button(`dog-tile${current ? '' : ' on'}`, [h('span', { text: slot === 'collar' ? '🔴' : '✖️' })], () => apply(side, kind, slot, '', dog));
    none.title = slot === 'collar' ? D.collarDefault : D.takeOff;
    const tiles = h('div', { class: 'dog-tiles' }, none,
      ITEMS.filter((i) => i.kind === kind && i.slot === slot).map((item) => {
        const have = owned.has(item.id);
        const tile = button(`dog-tile${current === item.id ? ' on' : ''}${have ? '' : ' locked'}`, [
          h('span', { text: item.icon }),
          h('i', { class: 'dog-tile-badge', text: have ? '✓' : `${item.price}🦴` }),
        ], () => {
          if (!have) {
            if (store.bonesBalance() < item.price) return yard.say(format(D.itemNeedBones, { title: item.title, price: item.price }), 2600);
            if (!store.buyItem(item.id)) return;
            app.services.sounds('star');
            chip.textContent = format(D.bonesChip, { n: store.bonesBalance() });
          }
          apply(side, kind, slot, item.id, dog);
        });
        tile.title = `${item.title} — ${have ? D.owned : `${item.price} 🦴`}`;
        return tile;
      }));

    const out = [chips, tiles, info];
    if (kind === 'decor') {
      out.push(h('div', { class: 'dog-photo-row' },
        action(`📷 ${D.album.shoot}`, null, () => yard.photo(), { primary: true }),
        action(`📒 ${D.album.open}`, null, () => { if (!busy) startGame(createAlbumGame); })));
    }
    return out;
  }

  function apply(side, kind, slot, itemId, dog) {
    if (busy) return;
    if (kind === 'outfit') {
      // Повторное касание надетого — снимает.
      const now = dog.outfit[slot] === itemId ? '' : itemId;
      store.equip(dog.id, slot, now);
      yard.repaint();
    } else {
      const now = store.decor()[slot] === itemId ? '' : itemId;
      store.place(slot, now);
      yard.repaintDecor();
    }
    app.services.sounds('tap');
    renderSide(side);
  }

  // ---------- Двор: живые собаки, кормление, уборка ----------
  // Возвращает { stage, feed, clean, say, repaint }; правую колонку обновляет onChange.
  function yardView(dogs, onChange) {
    const slots = SLOTS[Math.min(3, dogs.length)];
    const parts = new Map(); // id собаки -> { slot, wrap, bowl, bubble, tag, status, look }
    const poopLayer = h('div', { class: 'dog-poops' });
    const effects = h('div', { class: 'dog-effects' });
    const note = h('div', { class: 'dog-note', text: D.petHint });
    const decorLayer = h('div', { class: 'dog-decor-layer' });
    const stage = h('div', { class: `dog-stage dogs-${dogs.length}` }, h('div', { class: 'dog-lawn' }), decorLayer, poopLayer);

    const lookKey = (dog) => `${moodState(dog.mood)}-${dog.dirt >= 70 ? 3 : dog.dirt >= DIRTY_AT ? 2 : dog.dirt >= WASH_FROM ? 1 : 0}-${Object.values(dog.outfit).join('/')}-${dog.age}-${dog.energy < TIRED_AT ? 'tired' : ''}`;
    const statusIcons = (dog) => [dog.fed < HUNGRY_AT ? '🍖' : '', dog.mood < SAD_AT ? '😢' : '', dog.dirt >= DIRTY_AT ? '🧼' : ''].join('');

    dogs.forEach((dog, i) => {
      const wrap = h('div', { class: 'dog-wrap' }, drawDog(dog));
      const bubble = h('div', { class: 'dog-bubble', hidden: true });
      const bowl = h('div', { class: 'dog-bowl', hidden: true }, h('span', { class: 'dog-can', text: '🥫' }), h('span', { class: 'dog-food', text: '🥣' }));
      const status = h('span', { class: 'dog-status', text: statusIcons(dog) });
      const tag = h('div', { class: 'dog-tag' }, h('span', { class: 'dog-pointer', text: '▼' }), h('strong', { text: dog.name }), status);
      const slot = h('div', { class: 'dog-slot' }, tag, h('div', { class: 'dog-center' }, wrap, bowl), bubble);
      slot.style.left = `${slots[i]}%`;
      parts.set(dog.id, { slot, wrap, bowl, bubble, tag, status, look: lookKey(dog) });
      stage.append(slot);
      // Касание: выбрать собаку и погладить (подпрыгивает, сердечки, настроение растёт).
      onPet(slot, () => {
        if (busy) return;
        const changed = select(dog.id);
        wrap.classList.remove('hop');
        void wrap.offsetWidth; // перезапуск анимации
        wrap.classList.add('hop');
        floatEffect('❤️', slots[i], 30);
        store.adjust(dog.id, { mood: 2 }, false);
        app.services.sounds('tap');
        repaint();
        if (changed) onChange();
      });
    });
    stage.append(effects, note);

    const noteText = () => (dogs.length > 1 ? D.chooseHint : D.petHint);

    // Выбрать собаку; true, если выбор изменился.
    function select(id) {
      const changed = selectedId !== id;
      selectedId = id;
      for (const [dogId, p] of parts) p.tag.classList.toggle('selected', dogId === id);
      note.textContent = noteText();
      return changed;
    }

    let noteTimer = null;
    function say(text, ms = 1800) {
      note.textContent = text;
      note.classList.add('show');
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        note.classList.remove('show');
        note.textContent = noteText();
      }, ms);
    }

    // Перерисовать собак, у которых изменилось выражение или грязь; обновить значки.
    function repaint() {
      for (const dog of store.dogs()) {
        const p = parts.get(dog.id);
        if (!p) continue;
        const key = lookKey(dog);
        if (key !== p.look) {
          p.look = key;
          p.wrap.replaceChildren(drawDog(dog));
        }
        p.status.textContent = statusIcons(dog);
      }
    }

    // Рисует какашки всех собак; у кормящейся последняя пока скрыта (появится после «дел»).
    function drawPoops(hideFor = null) {
      const items = [];
      for (const dog of store.dogs()) {
        const part = parts.get(dog.id);
        if (!part) continue;
        const count = Math.max(0, dog.poops - (hideFor === dog.id ? 1 : 0));
        for (let n = 0; n < count; n++) {
          const [dx, y] = POOP_SPOTS[n];
          const poop = button('dog-poop', '💩', () => clean(dog.id, poop));
          poop.style.left = `${parseFloat(part.slot.style.left) + dx / Math.min(3, dogs.length)}%`;
          poop.style.top = `${y}%`;
          poop.dataset.dog = dog.id;
          poop.setAttribute('aria-label', D.clean);
          items.push(poop);
        }
      }
      poopLayer.replaceChildren(...items);
    }

    function floatEffect(emoji, x = 50, y = 40) {
      const fx = h('span', { class: 'dog-fx', text: emoji });
      fx.style.left = `${x + (Math.random() * 10 - 5)}%`;
      fx.style.top = `${y}%`;
      effects.append(fx);
      setTimeout(() => fx.remove(), 1400);
    }

    async function feed() {
      if (busy) return;
      const dog = selected();
      if (!dog) return;
      if (store.food() < 1) return say(D.noFood, 2600);
      if (dog.fed >= FULL_AT) return say(D.full, 2200);
      if (dog.poops >= MAX_POOPS) return say(D.yardFull, 2600);
      if (!store.feedDog(dog.id)) return;
      const { wrap, bowl, bubble, slot } = parts.get(dog.id);
      busy = true;
      drawPoops(dog.id); // новая какашка появится после «дел»
      onChange();
      // 1. Ест: банка наклоняется, собака жуёт, хвост виляет быстрее.
      bowl.hidden = false;
      bowl.classList.remove('serve');
      void bowl.offsetWidth;
      bowl.classList.add('serve');
      wrap.classList.add('eating');
      bubble.textContent = D.eating;
      bubble.hidden = false;
      app.services.sounds('tap');
      await wait(EAT_MS);
      if (!alive()) return;
      bowl.hidden = true;
      wrap.classList.remove('eating');
      floatEffect('❤️', parseFloat(slot.style.left), 25);
      repaint();
      // 2. Делает дела.
      wrap.classList.add('pooping');
      bubble.textContent = D.pooping;
      await wait(POOP_MS);
      if (!alive()) return;
      wrap.classList.remove('pooping');
      bubble.hidden = true;
      // 3. Какашка падает на траву.
      drawPoops();
      const mine = [...poopLayer.children].filter((p) => p.dataset.dog === dog.id);
      mine[mine.length - 1]?.classList.add('drop');
      app.services.sounds('hint');
      busy = false;
      onChange();
    }

    // Убрать какашку: по касанию на ней или кнопкой «Убрать» (выбранной собаки, иначе первой, у кого есть).
    // Тратится пакетик.
    function clean(dogId = null, poopEl = null) {
      if (busy) return;
      const all = store.dogs();
      const dog = all.find((d) => d.id === (dogId ?? selectedId) && d.poops > 0) || all.find((d) => d.poops > 0);
      if (!dog) return;
      if (store.bags() < 1) return say(D.noBags, 2600);
      store.cleanPoop(dog.id);
      const target = poopEl || [...poopLayer.children].reverse().find((p) => p.dataset.dog === dog.id);
      if (target) {
        target.disabled = true;
        target.classList.add('gone');
        const rect = target.getBoundingClientRect();
        const box = stage.getBoundingClientRect();
        floatEffect('✨', ((rect.left + rect.width / 2 - box.left) / box.width) * 100, ((rect.top - box.top) / box.height) * 100);
      }
      app.services.sounds('correct');
      say(D.cleaned, 1200);
      setTimeout(() => { if (alive()) { drawPoops(); onChange(); } }, 450);
    }

    // Обстановка во дворе: предметы стоят позади собак.
    function repaintDecor() {
      const decor = store.decor();
      decorLayer.replaceChildren(...Object.entries(decor).filter(([, id]) => id).map(([slot, id]) => {
        const pos = DECOR_POSITIONS[slot];
        const el = h('span', { class: `dog-decor decor-${slot}`, text: itemById.get(id).icon });
        el.style.left = `${pos.x}%`;
        el.style.top = `${pos.y}%`;
        el.style.fontSize = `${pos.size}cqw`;
        return el;
      }));
    }

    // Сфотографировать двор: снимок собак (с нарядами) и обстановки уходит в альбом.
    function photo() {
      if (busy) return;
      const ok = store.addPhoto({ dogs: store.dogs(), decor: store.decor() });
      if (!ok) return;
      const flash = h('div', { class: 'dog-flash' });
      stage.append(flash);
      setTimeout(() => flash.remove(), 700);
      app.services.sounds('star');
      say(D.album.saved, 2200);
    }

    select(selectedId);
    drawPoops();
    repaintDecor();
    return { stage, feed, clean, say, repaint, repaintDecor, photo };
  }

  function buyDogButton(template) {
    const p = price();
    const need = missing();
    const btn = button('btn primary dog-buy-btn', need > 0 ? format(D.notEnough, { n: need }) : format(template, { price: p }), () => {
      app.services.sounds('tap');
      openCreator();
    });
    if (need > 0) btn.disabled = true;
    return btn;
  }

  // ---------- Выбор собаки ----------
  function openCreator() {
    draft = { breed: 'labrador', color: 'ginger', age: 3, name: '' };
    renderCreator();
  }

  function closeCreator() {
    draft = null;
    refresh();
  }

  function renderCreator() {
    const preview = h('div', { class: 'dog-art-box' });
    const previewName = h('strong', { class: 'dog-name' });
    const previewMeta = h('span', { class: 'dog-meta' });
    const breedBtns = new Map();
    const colorBtns = new Map();
    const ageText = h('span', { class: 'dog-age-value' });
    const nameInput = h('input', { class: 'dog-input', type: 'text', maxLength: NAME_MAX, placeholder: D.namePlaceholder, autocomplete: 'off' });
    const buy = button('btn primary big', '', onBuy);
    const cancel = button('btn', D.cancel, closeCreator);

    for (const breed of BREEDS) {
      breedBtns.set(breed.id, button('chip-btn', breed.name, () => { draft.breed = breed.id; update(); }));
    }
    for (const color of COLORS) {
      const swatch = button('swatch', '', () => { draft.color = color.id; update(); });
      swatch.style.background = color.hex;
      swatch.setAttribute('aria-label', color.name);
      swatch.title = color.name;
      colorBtns.set(color.id, swatch);
    }
    nameInput.addEventListener('input', () => {
      draft.name = nameInput.value;
      update(false);
    });

    function update(syncInput = true) {
      preview.replaceChildren(drawDog(draft));
      previewName.textContent = draft.name.trim() || '…';
      previewMeta.textContent = `${breedById.get(draft.breed).name} · ${ageLabel(draft.age)}`;
      for (const [id, btn] of breedBtns) btn.classList.toggle('active', id === draft.breed);
      for (const [id, btn] of colorBtns) btn.classList.toggle('active', id === draft.color);
      ageText.textContent = ageLabel(draft.age);
      if (syncInput && nameInput.value !== draft.name) nameInput.value = draft.name;
      const need = missing();
      const named = draft.name.trim().length > 0;
      buy.textContent = !named ? D.needName : need > 0 ? format(D.notEnough, { n: need }) : format(D.buy, { price: price() });
      buy.disabled = !named || need > 0;
    }

    const stepper = h('div', { class: 'dog-stepper' },
      button('btn round', '−', () => { draft.age = Math.max(0, draft.age - 1); update(); }),
      ageText,
      button('btn round', '+', () => { draft.age = Math.min(MAX_AGE, draft.age + 1); update(); }));

    const names = h('div', { class: 'dog-names' },
      SUGGESTED_NAMES.map((name) => button('chip-btn small', name, () => { draft.name = name; update(); })));

    main.replaceChildren(
      h('div', { class: 'dog-create' },
        h('div', { class: 'dog-preview' }, preview, previewName, previewMeta,
          h('div', { class: 'dog-age' }, h('span', { text: D.age }), stepper)),
        h('div', { class: 'dog-controls' },
          h('h2', { class: 'section-title', text: D.breed }),
          h('div', { class: 'dog-chips' }, [...breedBtns.values()]),
          h('h2', { class: 'section-title', text: D.color }),
          h('div', { class: 'dog-swatches' }, [...colorBtns.values()]),
          h('h2', { class: 'section-title', text: D.name }),
          nameInput,
          names)));
    footer.hidden = false;
    footer.replaceChildren(cancel, buy);
    update();
  }

  function onBuy() {
    const dog = store.buyDog({ ...draft, name: draft.name.trim() });
    if (!dog) return;
    app.services.sounds('star');
    draft = null;
    selectedId = dog.id; // новая собака становится выбранной, прежние остаются во дворе
    tab = 'care';
    refresh();
    screen.append(boughtPopup(dog));
  }

  function boughtPopup(dog) {
    const popup = h('div', { class: 'overlay bought-popup' },
      h('div', { class: 'super-card dog-popup' },
        h('div', { class: 'dog-art-box' }, drawDog(dog)),
        h('h2', { text: format(D.bought, { name: dog.name }) }),
        button('btn primary big', D.ok, () => popup.remove())));
    return popup;
  }

  refresh();
  return screen;
}

// Касание собаки (это не кнопка, поэтому свои pointer-события): срабатывает при отпускании на ней.
function onPet(el, fn) {
  let down = false;
  el.addEventListener('pointerdown', () => { down = true; });
  el.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    fn();
  });
  el.addEventListener('pointercancel', () => { down = false; });
  el.addEventListener('pointerleave', () => { down = false; });
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.addEventListener('click', (e) => { if (e.detail === 0) fn(); }); // Enter / Пробел
}
