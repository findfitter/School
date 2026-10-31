// Трюки: ребёнок даёт команду кнопкой, собака выполняет (сидит, подаёт лапу, лает, крутится, танцует).
// Каждое повторение растит навык трюка (до 5 звёзд); с 3 звёзд трюк выучен. Сложные трюки открываются,
// когда выучены простые. Каждый трюк чуть поднимает настроение собаки.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog, TRICKS, MAX_SKILL, KNOWN_AT, trickKnown, trickUnlocked, trickById } from '../dogs.js';

const T = STR.dog.tricks;
const DURATION = { sit: 1700, paw: 1700, speak: 1500, spin: 1500, dance: 2600 }; // сколько длится показ, мс

export function createTricksGame({ app, store, dog, alive, wait }) {
  let busy = false;
  const fresh = () => store.dogs().find((d) => d.id === dog.id) || dog;

  const wrap = h('div', { class: 'dog-wrap trick-dog' }, drawDog(fresh()));
  const bubble = h('div', { class: 'trick-bubble', hidden: true });
  const effects = h('div', { class: 'dog-effects' });
  const stage = h('div', { class: 'trick-stage' }, h('div', { class: 'dog-lawn' }), h('div', { class: 'trick-center' }, wrap), bubble, effects);
  const list = h('div', { class: 'trick-list' });

  function stars(level) {
    return '★'.repeat(level) + '☆'.repeat(MAX_SKILL - level);
  }

  function say(text, ms = 1100) {
    bubble.textContent = text;
    bubble.hidden = false;
    return wait(ms).then(() => { if (alive()) bubble.hidden = true; });
  }

  function floatEffect(emoji, x = 50, y = 25) {
    const fx = h('span', { class: 'dog-fx', text: emoji });
    fx.style.left = `${x + (Math.random() * 10 - 5)}%`;
    fx.style.top = `${y}%`;
    effects.append(fx);
    setTimeout(() => fx.remove(), 1400);
  }

  function renderList() {
    const current = fresh();
    list.replaceChildren(...TRICKS.map((trick) => {
      const level = current.tricks[trick.id];
      const open = trickUnlocked(current, trick.id);
      const btn = button(`btn trick-btn${open ? '' : ' locked'}${trickKnown(current, trick.id) ? ' known' : ''}`, [
        h('span', { class: 'trick-icon', text: open ? trick.icon : '🔒' }),
        h('span', { class: 'trick-name' }, h('strong', { text: trick.title }),
          h('small', { text: open ? stars(level) : format(T.needs, { list: trick.needs.map((id) => trickById.get(id).title).join(', ') }) })),
      ], () => perform(trick));
      return btn;
    }));
  }

  async function perform(trick) {
    if (busy) return;
    const current = fresh();
    if (!trickUnlocked(current, trick.id)) return say(format(T.needs, { list: trick.needs.map((id) => trickById.get(id).title).join(', ') }), 1800);
    busy = true;
    const first = current.tricks[trick.id] === 0;
    if (first) await say(T.learning, 900); // в первый раз собака ещё не понимает, что от неё хотят
    if (!alive()) return;
    wrap.classList.add(`do-${trick.id}`);
    if (trick.id === 'speak') say(T.woof, 1400);
    app.services.sounds('tap');
    await wait(DURATION[trick.id]);
    if (!alive()) return;
    wrap.classList.remove(`do-${trick.id}`);
    const level = store.practiceTrick(dog.id, trick.id);
    store.adjust(dog.id, { mood: 3, fed: -1 });
    floatEffect('❤️');
    app.services.sounds('correct');
    renderList();
    if (level === KNOWN_AT) {
      floatEffect('⭐', 40, 15);
      await say(format(T.learned, { title: trick.title }), 1800);
    }
    busy = false;
  }

  renderList();
  const hint = h('p', { class: 'trick-hint', text: T.hint });
  return {
    el: h('div', { class: 'trick-game' }, stage, h('div', { class: 'trick-side' }, hint, list)),
    cleanup() { busy = true; },
  };
}
