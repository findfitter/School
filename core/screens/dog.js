// Раздел собаки (ПРОТОТИП): косточки, двор с собаками, корм и уборка, покупка собаки.
// Экран без прокрутки: слева двор, справа косточки, кнопки и магазин. Все купленные собаки стоят во дворе
// вместе (новая добавляется к прежним); собака выбирается касанием — корм и уборка относятся к выбранной.
// Собаки живые (моргают, виляют хвостом, дышат), по касанию радуются. Корм покупается за косточки
// (1 🦴 — 5 банок), собаку можно покормить: она ест, потом какает. Какашки убираются пакетиками
// (1 🦴 — 5 штук). При покупке собаки ребёнок выбирает породу и цвет, придумывает имя и возраст.
// Косточки пока выдаются кнопкой для просмотра; настоящая схема появления особого задания — позже.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import {
  BREEDS, COLORS, NAMES, NAME_MAX, MAX_AGE, MAX_POOPS, PACK_PRICE, dogPrice, ageLabel, breedById, drawDog,
} from '../dogs.js';

const D = STR.dog;

// Где лежат какашки собаки: сдвиг по горизонтали (в % ширины её места) и высота на сцене (в %).
const POOP_SPOTS = [[-34, 70], [34, 70], [-14, 84], [14, 84]];
const EAT_MS = 2600; // сколько собака ест
const POOP_MS = 1500; // сколько она «делает дела» до появления какашки
const SUGGESTED_NAMES = NAMES.slice(0, 6); // готовые имена в выборе собаки (на экране без прокрутки их немного)

// Где стоят собаки во дворе (в % ширины сцены) в зависимости от их числа.
const SLOTS = { 1: [50], 2: [30, 70], 3: [18, 50, 82] };

export function renderDog(app, { onBack = () => app.go.menu() } = {}) {
  let draft = null; // собака, которую выбирают сейчас (пока не куплена), или null
  let selectedId = null; // какая собака выбрана во дворе
  let busy = false; // идёт кормление

  const alive = () => screen.isConnected;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const chip = h('div', { class: 'chip' });
  const proto = protoBox();
  const main = h('main', { class: 'content dog-content' });
  const footer = h('footer', { class: 'buy-bar dog-footer' });
  const screen = h('div', { class: 'screen dog-screen' },
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => (draft ? closeCreator() : onBack())),
      h('h1', { text: D.title }),
      proto,
      chip),
    main,
    footer);

  const price = () => dogPrice(storage.dogs().length);
  const missing = () => (price() ?? 0) - storage.bonesBalance();

  function refresh() {
    chip.textContent = format(D.bonesChip, { n: storage.bonesBalance() });
    proto.hidden = Boolean(draft);
    if (draft) return;
    footer.hidden = true;
    footer.replaceChildren();
    main.replaceChildren(homeView());
  }

  // ---------- Главный экран раздела ----------
  function homeView() {
    const dogs = storage.dogs();
    if (!dogs.some((d) => d.id === selectedId)) selectedId = dogs[0]?.id ?? null;
    if (!dogs.length) {
      const ghost = drawDog({ breed: 'labrador', color: 'grey', age: 3 });
      ghost.classList.add('ghost');
      return h('div', { class: 'dog-empty' },
        h('div', { class: 'dog-art-box' }, ghost, h('span', { class: 'dog-question', text: '?' })),
        h('h2', { text: D.emptyTitle }),
        h('p', { text: `${D.emptyText} ${D.howTo}` }),
        h('p', { class: 'dog-earned-line', text: `${format(D.earned, { n: storage.bones() })} · ${format(D.spent, { n: storage.bones() - storage.bonesBalance() })}` }),
        buyDogButton(D.buyFirst));
    }
    const side = h('div', { class: 'dog-side' },
      h('div', { class: 'dog-earned' },
        h('span', { class: 'dog-earned-bone', text: '🦴' }),
        h('div', {},
          h('strong', { text: format(D.earned, { n: storage.bones() }) }),
          h('small', { text: `${format(D.spent, { n: storage.bones() - storage.bonesBalance() })} · ${D.howTo}` }))));
    const yard = yardView(dogs, side);
    return h('div', { class: 'dog-home' }, yard, side);
  }

  // Только для прототипа: кнопки в шапке, чтобы можно было посмотреть, как всё выглядит.
  function protoBox() {
    return h('div', { class: 'dog-proto', title: D.proto },
      h('span', { text: '🧪' }),
      button('btn', D.protoBone, () => {
        storage.addBones(1);
        app.services.sounds('star');
        refresh();
      }),
      button('btn quiet', D.protoReset, () => {
        if (busy) return;
        storage.resetDogs();
        selectedId = null;
        refresh();
      }));
  }

  // ---------- Двор: живые собаки, кормление, уборка ----------
  // Возвращает сцену; кнопки, счётчики и магазин добавляются в правую колонку `side`.
  function yardView(dogs, side) {
    const slots = SLOTS[Math.min(3, dogs.length)];
    const parts = new Map(); // id собаки -> { slot, wrap, bowl, bubble, tag }
    const poopLayer = h('div', { class: 'dog-poops' });
    const effects = h('div', { class: 'dog-effects' });
    const note = h('div', { class: 'dog-note', text: D.petHint });
    const stage = h('div', { class: `dog-stage dogs-${dogs.length}` }, h('div', { class: 'dog-lawn' }), poopLayer);

    dogs.forEach((dog, i) => {
      const wrap = h('div', { class: 'dog-wrap' }, drawDog(dog));
      const bubble = h('div', { class: 'dog-bubble', hidden: true });
      const bowl = h('div', { class: 'dog-bowl', hidden: true }, h('span', { class: 'dog-can', text: '🥫' }), h('span', { class: 'dog-food', text: '🥣' }));
      const tag = h('div', { class: 'dog-tag' }, h('span', { class: 'dog-pointer', text: '▼' }), h('strong', { text: dog.name }));
      const slot = h('div', { class: 'dog-slot' }, tag, h('div', { class: 'dog-center' }, wrap, bowl), bubble);
      slot.style.left = `${slots[i]}%`;
      parts.set(dog.id, { slot, wrap, bowl, bubble, tag });
      stage.append(slot);
      // Касание: выбрать собаку и погладить (подпрыгивает, сердечки).
      onPet(slot, () => {
        if (busy) return;
        select(dog.id);
        wrap.classList.remove('hop');
        void wrap.offsetWidth; // перезапуск анимации
        wrap.classList.add('hop');
        floatEffect('❤️', slots[i], 30);
        app.services.sounds('tap');
      });
    });
    stage.append(effects, note);

    const feedBtn = button('btn primary dog-action', '', () => feed());
    const cleanBtn = button('btn dog-action', '', () => clean());
    const foodLabel = h('span');
    const bagsLabel = h('span');
    feedBtn.append(h('span', { text: `🥫 ${D.feed}` }), foodLabel);
    cleanBtn.append(h('span', { text: `🛍️ ${D.clean}` }), bagsLabel);

    side.append(
      h('div', { class: 'dog-actions' }, feedBtn, cleanBtn),
      shopView(),
      price() != null ? buyDogButton(D.buyNext) : h('p', { class: 'hint-line', text: D.maxDogs }));

    const selected = () => storage.dogs().find((d) => d.id === selectedId);

    function select(id) {
      selectedId = id;
      for (const [dogId, p] of parts) p.tag.classList.toggle('selected', dogId === id);
      note.textContent = dogs.length > 1 ? D.chooseHint : D.petHint;
    }

    let noteTimer = null;
    function say(text, ms = 1800) {
      note.textContent = text;
      note.classList.add('show');
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        note.classList.remove('show');
        note.textContent = dogs.length > 1 ? D.chooseHint : D.petHint;
      }, ms);
    }

    // Рисует какашки всех собак; у кормящейся последняя пока скрыта (появится после «дел»).
    function drawPoops(hideFor = null) {
      foodLabel.textContent = format(D.feedLeft, { n: storage.food() });
      bagsLabel.textContent = format(D.cleanLeft, { n: storage.bags() });
      const items = [];
      for (const dog of storage.dogs()) {
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
      if (storage.food() < 1) return say(D.noFood, 2600);
      if (dog.poops >= MAX_POOPS) return say(D.yardFull, 2600);
      if (!storage.feedDog(dog.id)) return;
      const { wrap, bowl, bubble, slot } = parts.get(dog.id);
      busy = true;
      feedBtn.disabled = true;
      cleanBtn.disabled = true;
      drawPoops(dog.id); // новая какашка появится после «дел»
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
      feedBtn.disabled = false;
      cleanBtn.disabled = false;
    }

    // Убрать какашку: по касанию на ней или кнопкой «Убрать» (выбранной собаки, иначе первой, у кого есть).
    // Тратится пакетик.
    function clean(dogId = null, poopEl = null) {
      if (busy) return;
      const all = storage.dogs();
      const dog = all.find((d) => d.id === (dogId ?? selectedId) && d.poops > 0) || all.find((d) => d.poops > 0);
      if (!dog) return;
      if (storage.bags() < 1) return say(D.noBags, 2600);
      storage.cleanPoop(dog.id);
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
      setTimeout(() => alive() && drawPoops(), 450);
    }

    select(selectedId);
    drawPoops();
    return stage;
  }

  // ---------- Магазин корма и пакетиков ----------
  function shopView() {
    const make = (template, buyFn) => {
      const btn = button('btn dog-shop-btn', format(template, { price: PACK_PRICE }), () => {
        if (storage.bonesBalance() < PACK_PRICE || !buyFn()) return;
        app.services.sounds('star');
        refresh();
      });
      btn.disabled = storage.bonesBalance() < PACK_PRICE;
      return btn;
    };
    return h('div', { class: 'dog-shop' },
      h('h2', { class: 'section-title', text: D.shopTitle }),
      make(D.buyFood, storage.buyFood),
      make(D.buyBags, storage.buyBags));
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
    proto.hidden = true;
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
    const dog = storage.buyDog({ ...draft, name: draft.name.trim() });
    if (!dog) return;
    app.services.sounds('star');
    draft = null;
    selectedId = dog.id; // новая собака становится выбранной, прежние остаются во дворе
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
