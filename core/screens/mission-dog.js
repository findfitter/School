// Собака в комнате во время таймера миссии: «делает вид, что убирается» (ТЗ, раздел 4а, первая версия).
// Идёт от двери к выбранной зоне, по кругу работает (жест зоны) и отдыхает, над зоной вспыхивают искорки «чисто»,
// а в последние секунды гордо сидит рядом. Где и что она делает, решает расписание dogPlan() из core/mission.js
// по прошедшему и оставшемуся времени, поэтому после перезагрузки собака сразу стоит где надо.
// Рисунок — drawDog как есть; движение — transform внешней группы (внутри группы фильтр wcDog стоит неподвижно),
// жесты — анимации частей рисунка (mission.css). При prefers-reduced-motion собака не ходит и не двигается: стоит у зоны.

import { h } from '../dom.js';
import { drawDog } from '../dogs.js';
import { svgEl } from './book-art.js';
import { zoneById, dogPlan, DOG_START, DOG_PROUD_MS } from '../mission.js';

const FRAME_W = 380; // кадр комнаты в единицах рисунка (room-art.js)
const FRAME_H = 250;
const DOG_W = 0.17; // ширина собаки — доля ширины комнаты
const SPARK = 'M0 -12 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4 z';
// Искорки вокруг центра зоны: сдвиги в единицах кадра.
const SPARKS = [[-20, -10], [18, -14], [-6, -24], [24, 4], [-26, 6], [8, 12], [0, -4]];

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Возвращает { el, update({ left, total, extra, view }) }; view — какой вид комнаты показан сейчас ('A' или 'B'): в виде, где зоны нет, собаки не видно. el кладётся внутрь блока комнаты (position: relative/absolute).
// left — сколько мс осталось, total — длина отрезка, extra — сколько раз взрослый добавлял время (тогда собака уже в комнате).
export function createRoomDog({ zone, dog }) {
  const z = zoneById.get(zone);
  const still = reducedMotion();
  const actor = h('div', { class: 'mz-actor' }, drawDog({ ...dog, mood: 'happy' }));
  const walker = h('div', { class: 'mz-walker' }, actor);
  const sparks = SPARKS.map((_, i) => {
    const el = svgEl(`<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="-14 -14 28 28"><path d="${SPARK}" fill="#f4c34e" stroke="#e0a526" stroke-width="1.2" stroke-linejoin="round"/></svg>`, 'mz-spark');
    el.style.animationDelay = `${(i * 0.37).toFixed(2)}s`;
    el.style.display = 'none';
    return el;
  });
  const field = h('div', { class: 'mz-field', 'aria-hidden': 'true' }, ...sparks, walker);
  let mode = '';
  let shown = -1;
  let placed = false;
  let curView = '';

  function place(x, y) {
    const fw = field.clientWidth;
    const fh = field.clientHeight;
    if (!fw || !fh) return;
    const w = fw * DOG_W;
    walker.style.width = `${w}px`;
    walker.style.transform = `translate(${(x / FRAME_W) * fw - w / 2}px, ${(y / FRAME_H) * fh - (w * 270) / 240}px)`;
    if (!placed) {
      placed = true;
      // плавный ход включаем только после первой расстановки: после перезагрузки собака не «едет» с края через всю комнату
      requestAnimationFrame(() => { if (!still) walker.classList.add('moving'); });
    }
  }

  // Искорки вокруг центра зоны в показанном виде.
  function placeSparks(spot) {
    sparks.forEach((el, i) => {
      el.style.left = `${((spot[0] + SPARKS[i][0]) / FRAME_W) * 100}%`;
      el.style.top = `${((spot[1] + SPARKS[i][1]) / FRAME_H) * 100}%`;
    });
  }

  function update({ left, total, extra = 0, view = 'A' }) {
    if (!z) return;
    const stand = z.stand[view];
    const spot = z.spot[view];
    // зоны нет в показанном виде (ребёнок повернула комнату): собаку и искорки не показываем, время идёт как шло
    field.style.visibility = stand ? '' : 'hidden';
    if (!stand) return;
    if (view !== curView) {
      // вид сменился: собака сразу на месте в новой комнате, а не «едет» через неё
      curView = view;
      placeSparks(spot);
      placed = false;
      walker.classList.remove('moving');
    }
    const elapsed = Math.min(total, Math.max(0, total - left));
    const plan = dogPlan(elapsed, left, extra === 0 && !still, Math.min(DOG_PROUD_MS, total / 4));
    const t = easeInOut(plan.t);
    const [sx, sy] = plan.mode === 'walk' ? [DOG_START[0] + (stand[0] - DOG_START[0]) * t, DOG_START[1] + (stand[1] - DOG_START[1]) * t] : stand;
    place(sx, sy);
    if (plan.mode !== mode) {
      mode = plan.mode;
      actor.className = `mz-actor${mode === 'walk' ? ' walk' : mode === 'work' ? ` g-${z.gesture}` : mode === 'proud' ? ' proud' : ''}`;
      field.classList.toggle('all', mode === 'proud');
    }
    // искорки «чисто» прибавляются по мере уборки; в конце горят все
    const count = mode === 'proud' ? sparks.length : Math.min(sparks.length, Math.floor((1 - left / total) * (sparks.length + 1)));
    if (count !== shown) {
      shown = count;
      sparks.forEach((s, i) => { s.style.display = i < count ? '' : 'none'; });
    }
  }

  return { el: field, update };
}
