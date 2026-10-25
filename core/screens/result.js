import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';

export function renderResult(app, { manifest, result, stars, canBuy, locked, superSticker }) {
  const lang = (STR.subjects[manifest.subject] || STR.subjects.other).lang;
  const t = STR.result[lang];
  const praise = t.praise[stars];

  const starEls = [1, 2, 3].map((n) =>
    h('span', { class: `star ${n <= stars ? 'earned' : 'empty'}`, style: `--i:${n}`, text: n <= stars ? '⭐' : '☆' })
  );

  // Подсказка про магазин, если на счету хватает звёзд хотя бы на одну наклейку.
  const shop = canBuy && !superSticker
    ? h('div', { class: 'shop-hint' }, '🛍️ ', t.shopHint)
    : null;

  // Пройденное в круге задание закрыто: «ещё раз» не предлагаем.
  const buttons = locked
    ? [button('btn primary big', t.toMenu, () => app.go.menu())]
    : [button('btn primary big', t.again, () => app.go.play(manifest)),
       button('btn big', t.toMenu, () => app.go.menu())];

  const screen = h('div', { class: 'screen result-screen' },
    h('div', { class: 'stars' }, starEls),
    h('h1', { text: praise }),
    h('p', { class: 'score', text: format(t.score, result) }),
    shop,
    locked ? h('p', { class: 'score', text: t.nextTask }) : null,
    h('div', { class: 'row' }, buttons)
  );

  const timers = [];
  for (let n = 1; n <= stars; n++) {
    timers.push(setTimeout(() => app.services.sounds('star'), 400 * n));
  }
  if (superSticker) {
    // Супер-наклейка: после звёзд вылетает окно с поздравлением.
    timers.push(setTimeout(() => {
      app.services.sounds('done');
      screen.append(superPopup(app, t.superPopup, superSticker, lang));
    }, 400 * stars + 800));
  } else {
    timers.push(setTimeout(() => app.services.speech.speak(praise, lang), 400 * stars + 500));
  }
  // Таймеры не должны сработать после ухода с экрана.
  return { el: screen, onLeave: () => timers.forEach(clearTimeout) };
}

const SPARKLES = ['✨', '💖', '⭐', '🌸', '💫'];

function superPopup(app, text, sticker, lang) {
  const name = sticker[lang] || sticker.ru;
  const world = sticker.world;
  const parts = [format(text.text, { name, grow: world.grow[lang] || world.grow.ru })];
  if (sticker.nextWorld) parts.push(format(text.worldDone, { world: sticker.nextWorld.title[lang] || sticker.nextWorld.title.ru }));
  if (sticker.allWorldsDone) parts.push(text.allDone);
  const message = parts.join(' ');
  app.services.speech.speak(`${text.title} ${message}`, lang);

  const sparkles = Array.from({ length: 16 }, (_, i) =>
    h('span', {
      class: 'sparkle',
      style: `--x:${Math.round((i * 100) / 16 + Math.random() * 4)}%;--d:${(Math.random() * 2).toFixed(2)}s;--s:${(0.8 + Math.random()).toFixed(2)}`,
      text: SPARKLES[i % SPARKLES.length],
    })
  );
  const popup = h('div', { class: 'overlay super-popup' },
    sparkles,
    h('div', { class: 'super-card' },
      h('div', { class: 'super-flyer', text: sticker.emoji }),
      h('h2', { text: text.title }),
      h('p', { text: message }),
      button('btn primary big', text.ok, () => popup.remove())));
  return popup;
}
