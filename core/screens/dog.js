// Раздел собаки (ПРОТОТИП): сколько косточек заработано и покупка собаки.
// При покупке ребёнок выбирает породу и цвет, придумывает имя и говорит, сколько собаке лет.
// Косточки пока выдаются кнопкой для просмотра; настоящая схема появления особого задания — позже.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { BREEDS, COLORS, NAMES, NAME_MAX, MAX_AGE, dogPrice, ageLabel, breedById, drawDog } from '../dogs.js';

const D = STR.dog;

export function renderDog(app) {
  let draft = null; // собака, которую выбирают сейчас (пока не куплена), или null

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
    const blocks = [
      h('div', { class: 'dog-stats' },
        h('div', { class: 'dog-earned' },
          h('span', { class: 'dog-earned-bone', text: '🦴' }),
          h('div', {},
            h('strong', { text: format(D.earned, { n: storage.bones() }) }),
            h('small', { text: format(D.spent, { n: storage.bones() - storage.bonesBalance() }) }))),
        h('p', { class: 'hint-line', text: D.howTo })),
    ];

    // Только для прототипа: кнопки, чтобы можно было посмотреть, как всё выглядит.
    const protoBox = h('div', { class: 'dog-proto' },
      h('span', { text: `🧪 ${D.proto}` }),
      button('btn', D.protoBone, () => {
        storage.addBones(1);
        app.services.sounds('star');
        refresh();
      }),
      button('btn quiet', D.protoReset, () => {
        storage.resetDogs();
        refresh();
      }));
    blocks.push(protoBox);

    if (!dogs.length) {
      const ghost = drawDog({ breed: 'labrador', color: 'grey', age: 3 });
      ghost.classList.add('ghost');
      blocks.push(h('div', { class: 'dog-empty' },
        h('div', { class: 'dog-art-box big' }, ghost, h('span', { class: 'dog-question', text: '?' })),
        h('h2', { text: D.emptyTitle }),
        h('p', { text: D.emptyText }),
        buyButton(D.buyFirst)));
    } else {
      blocks.push(h('div', { class: 'dog-grid' }, dogs.map(dogCard)));
      if (price() != null) blocks.push(h('div', { class: 'dog-more' }, buyButton(D.buyNext)));
      else blocks.push(h('p', { class: 'hint-line', text: D.maxDogs }));
    }

    return blocks;
  }

  function dogCard(dog) {
    return h('div', { class: 'dog-card' },
      h('div', { class: 'dog-art-box' }, drawDog(dog)),
      h('strong', { class: 'dog-name', text: dog.name }),
      h('span', { class: 'dog-meta', text: `${breedById.get(dog.breed).name} · ${ageLabel(dog.age)}` }));
  }

  function buyButton(template) {
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
