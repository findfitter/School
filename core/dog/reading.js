// «Читаем вместе»: ребёнок читает собаке слово или предложение вслух (по-русски или по-немецки),
// нажимает «Прочитала!» — собака слушает, радуется и хвалит. Распознавания речи нет: честное слово ребёнка.
// Каждые три прочитанных — вкусняшка. Слова простые, как в разделах чтения.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';

const R = STR.dog.reading;
const POOLS = {
  ru: {
    words: [['кот', '🐱'], ['дом', '🏠'], ['мяч', '⚽'], ['рыба', '🐟'], ['лиса', '🦊'], ['слон', '🐘'], ['сова', '🦉'], ['торт', '🍰'], ['ёлка', '🌲'], ['яблоко', '🍎'], ['зебра', '🦓'], ['лодка', '⛵']],
    sentences: [['Кот пьёт молоко', '🐱🥛'], ['Собака бежит по траве', '🐶🌿'], ['Мама читает книгу', '👩📖'], ['Заяц ест морковь', '🐇🥕'], ['Птица летит в небе', '🐦☁️'], ['Девочка рисует радугу', '👧🌈'], ['Медведь спит в лесу', '🐻🌲'], ['Мальчик ест яблоко', '👦🍎']],
  },
  de: {
    words: [['Hund', '🐶'], ['Katze', '🐱'], ['Haus', '🏠'], ['Ball', '⚽'], ['Fisch', '🐟'], ['Baum', '🌳'], ['Eule', '🦉'], ['Kuchen', '🍰'], ['Apfel', '🍎'], ['Schiff', '🚢'], ['Zebra', '🦓'], ['Mond', '🌙']],
    sentences: [['Die Katze trinkt Milch', '🐱🥛'], ['Der Hund läuft im Wald', '🐶🌲'], ['Mama liest ein Buch', '👩📖'], ['Der Hase frisst Möhren', '🐇🥕'], ['Der Vogel fliegt am Himmel', '🐦☁️'], ['Das Mädchen malt Blumen', '👧🌸'], ['Der Bär schläft im Wald', '🐻🌲'], ['Der Junge isst einen Apfel', '👦🍎']],
  },
};
const TREAT_EVERY = 3;

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function createReadingGame({ app, store, dog, alive, wait }) {
  let lang = 'ru';
  let kind = 'words';
  let readCount = 0;
  let busy = false;
  let current = null;

  const fresh = () => store.dogs().find((d) => d.id === dog.id) || dog;
  const wrap = h('div', { class: 'dog-wrap quiz-dog' }, drawDog(fresh()));
  const bubble = h('div', { class: 'quiz-bubble', text: R.hello });
  const effects = h('div', { class: 'dog-effects' });
  const card = h('div', { class: 'read-card' });
  const counter = h('div', { class: 'quiz-progress' });
  const doneBtn = button('btn primary big', R.done, () => finishReading());
  const nextBtn = button('btn big', R.next, () => nextText());

  const pickBtn = (label, active, handler) => button(`chip-btn small${active ? ' active' : ''}`, label, handler);
  const controls = h('div', { class: 'read-controls' });

  function renderControls() {
    controls.replaceChildren(
      pickBtn('🇷🇺', lang === 'ru', () => { lang = 'ru'; nextText(); }),
      pickBtn('🇩🇪', lang === 'de', () => { lang = 'de'; nextText(); }),
      pickBtn(R.words, kind === 'words', () => { kind = 'words'; nextText(); }),
      pickBtn(R.sentences, kind === 'sentences', () => { kind = 'sentences'; nextText(); }));
  }

  function nextText() {
    if (busy) return;
    const [text, emoji] = pick(POOLS[lang][kind].filter((item) => !current || item[0] !== current[0]));
    current = [text, emoji];
    card.replaceChildren(h('div', { class: 'read-emoji', text: emoji }), h('div', { class: `read-text${kind === 'sentences' ? ' long' : ''}`, text }));
    bubble.textContent = R.hello;
    counter.textContent = format(R.count, { n: readCount });
    renderControls();
  }

  function floatEffect(emoji) {
    const fx = h('span', { class: 'dog-fx', text: emoji });
    fx.style.left = `${40 + Math.random() * 20}%`;
    fx.style.top = '20%';
    effects.append(fx);
    setTimeout(() => fx.remove(), 1400);
  }

  // Собака слушает, потом хвалит.
  async function finishReading() {
    if (busy) return;
    busy = true;
    wrap.classList.add('listening');
    bubble.textContent = R.listening;
    await wait(1800);
    if (!alive()) return;
    wrap.classList.remove('listening');
    readCount += 1;
    wrap.classList.remove('hop');
    void wrap.offsetWidth;
    wrap.classList.add('hop');
    floatEffect('❤️');
    app.services.sounds('correct');
    store.adjust(dog.id, { mood: 3, fed: 0 });
    if (readCount % TREAT_EVERY === 0) {
      floatEffect('🍖');
      store.adjust(dog.id, { fed: 6 });
      bubble.textContent = R.treat;
    } else {
      bubble.textContent = pick(R.praise);
    }
    counter.textContent = format(R.count, { n: readCount });
    await wait(1300);
    if (!alive()) return;
    busy = false;
    nextText();
  }

  nextText();
  const right = h('div', { class: 'quiz-main' }, counter, bubble, card, controls, h('div', { class: 'read-actions' }, doneBtn, nextBtn));
  return {
    el: h('div', { class: 'quiz-game' }, h('div', { class: 'quiz-dog-side' }, wrap, effects), right),
    cleanup() { busy = true; },
  };
}
