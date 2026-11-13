import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { challengeProgress } from '../challenges.js';
import { createBook, createIllustration, counters, guideDog } from './book.js';
import { svgEl, starIcon, boneMark } from './book-art.js';
import { picOrEmoji } from '../pic.js';

const PATH_STARS = 5; // звёзд на тропинке иллюстрации (как на главном экране)

// Разворот книги: слева собака ребёнка радуется на тропинке к косточке, справа — то, что показывает экран.
function spread({ heading, caption, right }) {
  const { have, need } = challengeProgress();
  const dog = guideDog();
  return createBook({
    className: 'book-result',
    top: [counters(storage.balance(), storage.bonesBalance())],
    left: [
      h('h1', { class: 'rs-praise hand', text: heading }),
      createIllustration({ dog, pathDone: Math.floor((have * PATH_STARS) / need), joy: true, label: dog ? dog.name : '' }),
      h('p', { class: 'rs-score hand', text: caption }),
    ],
    right,
  });
}

export function renderResult(app, { manifest, result, stars, canBuy, locked, superSticker, newChallenges = [] }) {
  const lang = (STR.subjects[manifest.subject] || STR.subjects.other).lang;
  const t = STR.result[lang];
  const plain = manifest.stars === false; // модуль без звёзд (знакомство): без звёздочек и счёта
  const praise = plain ? t.met : t.praise[stars];

  // Звёзды за серию: по одной, с отскоком; не заработанные — карандашным контуром.
  const starEls = [1, 2, 3].map((n) =>
    h('span', { class: `rs-star ${n <= stars ? 'earned' : 'empty'}`, style: `--i:${n}` },
      svgEl(n <= stars ? starIcon('#F4C34E', '#D9A21E') : starIcon('none', '#C4A57A'))));

  const notes = [
    // Подсказка про магазин, если на счету хватает звёзд хотя бы на одну наклейку.
    canBuy && !superSticker ? h('div', { class: 'paper-card rs-note' }, '🛍️ ', t.shopHint) : null,
    // Пройденное в круге задание закрыто: «ещё раз» не предлагаем.
    locked ? h('div', { class: 'paper-card rs-note' }, t.nextTask) : null,
    newChallenges.length
      ? h('div', { class: 'paper-card rs-note' }, '🦴 ', format(t.newChallenge, { subject: newChallenges.map((s) => STR.subjects[s]?.title || s).join(', ') }))
      : null,
  ];

  const buttons = locked
    ? [button('btn primary big', t.toMenu, () => app.go.menu())]
    : [button('btn primary big', t.again, () => app.go.play(manifest)),
       button('btn big', t.toMenu, () => app.go.menu())];

  const book = spread({
    heading: praise,
    caption: plain ? t.metCaption : format(t.score, result),
    right: [
      plain ? null : h('div', { class: 'rs-stars' }, starEls),
      stars > 0 || plain ? h('span', { class: `stamp rs-stamp${plain ? ' plain' : ''}`, style: `animation-delay:${400 * stars + 300}ms`, text: t.stamp }) : null,
      h('div', { class: 'rs-notes' }, notes),
      h('div', { class: 'rs-actions' }, h('div', { class: 'row' }, buttons)),
    ],
  });
  const screen = book.el;

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

// Экран после сложного задания: косточка и кнопки «К собаке» / «В меню».
export function renderChallengeResult(app, { subject, bones }) {
  const lang = (STR.subjects[subject] || STR.subjects.other).lang;
  const t = STR.result[lang].challenge;
  const book = spread({
    heading: t.title,
    caption: format(t.bonesNow, { n: bones }),
    right: [
      h('div', { class: 'rs-bone' }, svgEl(boneMark())),
      h('div', { class: 'rs-notes' }, h('p', { class: 'paper-card rs-note', text: t.text })),
      h('div', { class: 'rs-actions' },
        h('div', { class: 'row' },
          button('btn primary big', `🐶 ${t.toDog}`, () => app.go.dog()),
          button('btn big', t.toMenu, () => app.go.menu()))),
    ],
  });
  const timer = setTimeout(() => {
    app.services.sounds('done');
    app.services.speech.speak(`${t.title} ${t.text}`, lang);
  }, 500);
  return { el: book.el, onLeave: () => clearTimeout(timer) };
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
      picOrEmoji(sticker.emoji, ['super', 'sticker'], 'super-flyer'),
      h('h2', { text: text.title }),
      h('p', { text: message }),
      button('btn primary big', text.ok, () => popup.remove())));
  return popup;
}
