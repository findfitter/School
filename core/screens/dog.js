// Раздел собаки (ПРОТОТИП): косточки, двор с собакой, корм и уборка, покупка собаки.
// Двор: собака живая (моргает, виляет хвостом, дышит), по касанию радуется. Корм покупается за косточки
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

// Куда падают какашки во дворе (в процентах от сцены): по очереди, чтобы не перекрывали собаку.
const POOP_SPOTS = [[12, 68], [86, 70], [26, 80], [72, 81], [6, 82], [94, 82]];
const EAT_MS = 2600; // сколько собака ест
const POOP_MS = 1500; // сколько она «делает дела» до появления какашки

export function renderDog(app) {
  let draft = null; // собака, которую выбирают сейчас (пока не куплена), или null
  let selectedId = null; // какая собака сейчас во дворе
  let busy = false; // идёт кормление

  const alive = () => screen.isConnected;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const chip = h('div', { class: 'chip' });
  const main = h('main', { class: 'scroll content dog-content' });
  const footer = h('footer', { class: 'buy-bar' });
  const screen = h('div', { class: 'screen dog-screen' },
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => (draft ? closeCreator() : app.go.menu())),
      h('h1', { text: D.title }),
      chip),
    main,
    footer);

  const price = () => dogPrice(storage.dogs().length);
  const missing = () => (price() ?? 0) - storage.bonesBalance();

  function refresh() {
    chip.textContent = format(D.bonesChip, { n: storage.bonesBalance() });
    if (draft) return;
    footer.hidden = true;
    footer.replaceChildren();
    main.replaceChildren(...homeView());
  }

  // ---------- Главный экран раздела ----------
  function homeView() {
    const dogs = storage.dogs();
    if (!dogs.some((d) => d.id === selectedId)) selectedId = dogs[0]?.id ?? null;
    const blocks = [
      h('div', { class: 'dog-stats' },
        h('div', { class: 'dog-earned' },
          h('span', { class: 'dog-earned-bone', text: '🦴' }),
          h('div', {},
            h('strong', { text: format(D.earned, { n: storage.bones() }) }),
            h('small', { text: format(D.spent, { n: storage.bones() - storage.bonesBalance() }) }))),
        h('p', { class: 'hint-line', text: D.howTo }),
        protoBox()),
    ];

    if (!dogs.length) {
      const ghost = drawDog({ breed: 'labrador', color: 'grey', age: 3 });
      ghost.classList.add('ghost');
      blocks.push(h('div', { class: 'dog-empty' },
        h('div', { class: 'dog-art-box big' }, ghost, h('span', { class: 'dog-question', text: '?' })),
        h('h2', { text: D.emptyTitle }),
        h('p', { text: D.emptyText }),
        buyDogButton(D.buyFirst)));
      return blocks;
    }

    blocks.push(yardView(dogs.find((d) => d.id === selectedId)));
    if (dogs.length > 1) {
      blocks.push(h('div', { class: 'dog-switch' },
        dogs.map((d) => button(`chip-btn small${d.id === selectedId ? ' active' : ''}`, d.name, () => {
          if (busy) return;
          selectedId = d.id;
          refresh();
        }))));
    }
    blocks.push(shopView());
    if (price() != null) blocks.push(h('div', { class: 'dog-more' }, buyDogButton(D.buyNext)));
    else blocks.push(h('p', { class: 'hint-line', text: D.maxDogs }));
    return blocks;
  }

  // Только для прототипа: кнопки, чтобы можно было посмотреть, как всё выглядит.
  function protoBox() {
    return h('div', { class: 'dog-proto' },
      h('span', { text: `🧪 ${D.proto}` }),
      button('btn', D.protoBone, () => {
        storage.addBones(1);
        app.services.sounds('star');
        refresh();
      }),
      button('btn quiet', D.protoReset, () => {
        storage.resetDogs();
        selectedId = null;
        refresh();
      }));
  }

  // ---------- Двор: живая собака, кормление, уборка ----------
  function yardView(dog) {
    const dogWrap = h('div', { class: 'dog-wrap' }, drawDog(dog));
    const bubble = h('div', { class: 'dog-bubble', hidden: true });
    const bowl = h('div', { class: 'dog-bowl', hidden: true }, h('span', { class: 'dog-can', text: '🥫' }), h('span', { class: 'dog-food', text: '🥣' }));
    const effects = h('div', { class: 'dog-effects' });
    const poopLayer = h('div', { class: 'dog-poops' });
    const note = h('div', { class: 'dog-note', text: D.petHint });
    const stage = h('div', { class: 'dog-stage' },
      h('div', { class: 'dog-lawn' }),
      poopLayer,
      h('div', { class: 'dog-center' }, dogWrap, bowl),
      bubble,
      effects,
      h('div', { class: 'dog-caption' }, h('strong', { text: dog.name }), h('span', { text: `${breedById.get(dog.breed).name} · ${ageLabel(dog.age)}` })),
      note);

    const feedBtn = button('btn primary big dog-action', '', () => feed());
    const cleanBtn = button('btn big dog-action', '', () => clean());
    const foodLabel = h('span');
    const bagsLabel = h('span');
    feedBtn.append(h('span', { text: `🥫 ${D.feed}` }), foodLabel);
    cleanBtn.append(h('span', { text: `🛍️ ${D.clean}` }), bagsLabel);

    let noteTimer = null;
    function say(text, ms = 1800) {
      note.textContent = text;
      note.classList.add('show');
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => note.classList.remove('show'), ms);
    }

    function drawPoops(hideLast = false) {
      const current = storage.dogs().find((d) => d.id === dog.id);
      const count = Math.max(0, (current?.poops ?? 0) - (hideLast ? 1 : 0));
      foodLabel.textContent = format(D.feedLeft, { n: storage.food() });
      bagsLabel.textContent = format(D.cleanLeft, { n: storage.bags() });
      poopLayer.replaceChildren(...Array.from({ length: count }, (_, i) => {
        const [x, y] = POOP_SPOTS[i];
        const poop = button('dog-poop', '💩', () => clean(poop));
        poop.style.left = `${x}%`;
        poop.style.top = `${y}%`;
        poop.setAttribute('aria-label', D.clean);
        return poop;
      }));
    }

    function floatEffect(emoji, x = 50, y = 40) {
      const fx = h('span', { class: 'dog-fx', text: emoji });
      fx.style.left = `${x + (Math.random() * 16 - 8)}%`;
      fx.style.top = `${y}%`;
      effects.append(fx);
      setTimeout(() => fx.remove(), 1400);
    }

    // Погладить: собака подпрыгивает от радости, вылетают сердечки.
    onPet(dogWrap, () => {
      if (busy) return;
      dogWrap.classList.remove('hop');
      void dogWrap.offsetWidth; // перезапуск анимации
      dogWrap.classList.add('hop');
      floatEffect('❤️', 50, 30);
      app.services.sounds('tap');
    });

    async function feed() {
      if (busy) return;
      if (storage.food() < 1) return say(D.noFood, 2600);
      const fresh = storage.dogs().find((d) => d.id === dog.id);
      if (fresh.poops >= MAX_POOPS) return say(D.yardFull, 2600);
      if (!storage.feedDog(dog.id)) return;
      busy = true;
      feedBtn.disabled = true;
      cleanBtn.disabled = true;
      drawPoops(true); // новая какашка появится после «дел»
      // 1. Ест: банка наклоняется, собака жуёт, хвост виляет быстрее.
      bowl.hidden = false;
      bowl.classList.remove('serve');
      void bowl.offsetWidth;
      bowl.classList.add('serve');
      dogWrap.classList.add('eating');
      bubble.textContent = D.eating;
      bubble.hidden = false;
      app.services.sounds('tap');
      await wait(EAT_MS);
      if (!alive()) return;
      bowl.hidden = true;
      dogWrap.classList.remove('eating');
      floatEffect('❤️', 45, 25);
      // 2. Делает дела.
      dogWrap.classList.add('pooping');
      bubble.textContent = D.pooping;
      await wait(POOP_MS);
      if (!alive()) return;
      dogWrap.classList.remove('pooping');
      bubble.hidden = true;
      // 3. Какашка падает на траву.
      drawPoops(false);
      poopLayer.lastElementChild?.classList.add('drop');
      app.services.sounds('hint');
      busy = false;
      feedBtn.disabled = false;
      cleanBtn.disabled = false;
    }

    // Убрать какашку: по касанию на ней или кнопкой «Убрать» (тогда убирается последняя). Тратится пакетик.
    function clean(poopEl = null) {
      if (busy) return;
      const current = storage.dogs().find((d) => d.id === dog.id);
      if (!current || current.poops < 1) return;
      if (storage.bags() < 1) return say(D.noBags, 2600);
      storage.cleanPoop(dog.id);
      const target = poopEl || poopLayer.lastElementChild;
      if (target) {
        target.disabled = true;
        target.classList.add('gone');
        const rect = target.getBoundingClientRect();
        const box = stage.getBoundingClientRect();
        floatEffect('✨', ((rect.left + rect.width / 2 - box.left) / box.width) * 100, ((rect.top - box.top) / box.height) * 100);
      }
      app.services.sounds('correct');
      say(D.cleaned, 1200);
      setTimeout(() => alive() && drawPoops(false), 450);
    }

    drawPoops(false);
    return h('div', { class: 'dog-yard' }, stage, h('div', { class: 'dog-actions' }, feedBtn, cleanBtn));
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
      h('div', { class: 'dog-shop-row' },
        make(D.buyFood, storage.buyFood),
        make(D.buyBags, storage.buyBags),
        storage.bonesBalance() < PACK_PRICE ? h('span', { class: 'hint-line', text: D.noBones }) : null));
  }

  function buyDogButton(template) {
    const p = price();
    const need = missing();
    const btn = button('btn primary big dog-buy-btn', need > 0 ? format(D.notEnough, { n: need }) : format(template, { price: p }), () => {
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
    const preview = h('div', { class: 'dog-art-box big' });
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
      NAMES.map((name) => button('chip-btn small', name, () => { draft.name = name; update(); })));

    main.replaceChildren(
      h('div', { class: 'dog-create' },
        h('div', { class: 'dog-preview' }, preview, previewName, previewMeta,
          h('h2', { class: 'section-title', text: D.age }), stepper),
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
    main.scrollTop = 0;
    update();
  }

  function onBuy() {
    const dog = storage.buyDog({ ...draft, name: draft.name.trim() });
    if (!dog) return;
    app.services.sounds('star');
    draft = null;
    selectedId = dog.id;
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
