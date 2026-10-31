// Сон: ребёнок выключает свет, собака засыпает, ночь, звёзды и «Zzz». Потом свет включается — собака бодрая.
// Если во дворе стоит лежанка, собака спит в ней и просыпается веселее (store.sleepDog).

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import { drawDog } from '../dogs.js';
import { itemById } from '../dog-items.js';

const S = STR.dog.sleep;
const SLEEP_MS = 5000;

export function createSleepGame({ app, store, dog, alive, wait, exit }) {
  let ended = false;
  const bedId = store.decor().bed;
  const art = drawDog({ ...store.dogs().find((d) => d.id === dog.id) });
  const wrap = h('div', { class: 'dog-wrap sleep-dog' }, art);
  const bed = h('div', { class: 'sleep-bed', text: bedId ? itemById.get(bedId).icon : '🧺' });
  const zzz = h('div', { class: 'sleep-zzz', hidden: true }, h('span', { text: 'Z' }), h('span', { text: 'z' }), h('span', { text: 'z' }));
  const sky = h('div', { class: 'sleep-sky' }, h('span', { class: 'sleep-moon', text: '🌙' }),
    ...[8, 22, 38, 60, 78, 90].map((x, i) => {
      const star = h('span', { class: 'sleep-star', text: i % 2 ? '⭐' : '✨' });
      star.style.left = `${x}%`;
      star.style.top = `${6 + ((i * 17) % 28)}%`;
      return star;
    }));
  const msg = h('p', { class: 'sleep-msg', text: format(S.sleepy, { name: dog.name }) });
  const lamp = button('btn primary big sleep-lamp', `💡 ${S.lightsOut}`, lightsOut);
  const stage = h('div', { class: 'sleep-stage' }, sky, h('div', { class: 'dog-lawn' }),
    h('div', { class: 'sleep-center' }, bed, wrap, zzz));
  const root = h('div', { class: 'sleep-game' }, stage, h('div', { class: 'sleep-panel' }, msg, lamp));

  async function lightsOut() {
    lamp.disabled = true;
    root.classList.add('night');
    art.classList.add('sleeping');
    zzz.hidden = false;
    msg.textContent = S.goodNight;
    app.services.sounds('hint');
    await wait(SLEEP_MS);
    if (!alive() || ended) return;
    store.sleepDog(dog.id);
    root.classList.remove('night');
    art.classList.remove('sleeping');
    zzz.hidden = true;
    app.services.sounds('done');
    msg.textContent = format(S.woke, { name: dog.name });
    lamp.replaceWith(button('btn primary big', S.done, exit));
  }

  return { el: root, cleanup() { ended = true; } };
}
