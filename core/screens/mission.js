// Экраны ежедневной миссии «Уборка комнаты»: разговор ребёнка с собакой на развороте книги.
// Слева комната (подсвечена выбранная зона) и собака с облачком, справа — ответы ребёнка.
//   choose — выбор одной зоны и «Начнём!»;  timer — уборка: дуга-таймер, реплики собаки, собака в комнате делает вид, что убирается, «Я убралась!»;
//   wait — «позови взрослого» → проверка умножением → вопрос взрослому;  подарок (косточка для собаки) — после «Да, убрано».
// Ребёнок может сама пропустить уборку за SKIP_COST звёзд (кнопка на странице выбора, с подтверждением, без подарка).
// Экран по фазе из storage.mission() выбирает core/mission.js; здесь только показ и переходы.
// У ребёнка нет кнопок «домой» и «пропустить»; пропустить может только взрослый (после проверки умножением).

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { drawDog } from '../dogs.js';
import { ZONES, zoneById, chooseZone, startTimer, markCleaned, addTime, confirmDone, skipToday, skipForStars, SKIP_COST, missionState, msLeft, timerMs } from '../mission.js';
import { createBook, guideDog, lockButton, noteButton } from './book.js';
import { drawRoom } from './room-art.js';
import { svgEl, starIcon, boneMark } from './book-art.js';
import { renderGate } from './gate.js';
import { createRoomDog } from './mission-dog.js';

const M = STR.mission;

const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const TICK_MS = 500; // как часто обновляем дугу и время; сам таймер идёт по endsAt, а не по этим тикам
const RING_R = 100; // радиус дуги в её координатах (viewBox 240×240)
const RING_LEN = 2 * Math.PI * RING_R;
const LAST_MS = 60000; // «последняя минута»

// Не даём экрану погаснуть, пока идёт таймер (Screen Wake Lock, если браузер его даёт). Лок снимается, когда вкладка
// скрыта, поэтому при возврате берём его заново. Возвращает функцию, которая всё отпускает.
function keepAwake() {
  let lock = null;
  let active = true;
  const take = async () => {
    try {
      if (active && navigator.wakeLock && document.visibilityState === 'visible') {
        const got = await navigator.wakeLock.request('screen');
        if (active) lock = got;
        else got.release().catch(() => {}); // экран закрыли, пока браузер думал: сразу отпускаем, иначе экран не гас бы дальше
      }
    } catch {
      // нет разрешения или режим экономии — таймер идёт и без этого
    }
  };
  const onVisible = () => { if (document.visibilityState === 'visible' && (!lock || lock.released)) take(); };
  document.addEventListener('visibilitychange', onVisible);
  take();
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisible);
    if (lock) lock.release().catch(() => {});
  };
}

// Комната в виде view ('A' или 'B'); выбранная зона подсвечена. Меняем только картинку (кнопка «повернуть» и собака лежат рядом).
function paintRoom(box, view, zoneId) {
  box.dataset.zone = zoneId || '';
  if (box.dataset.view !== view) {
    box.dataset.view = view;
    const svg = drawRoom(view);
    const old = box.querySelector('.room-art');
    if (old) old.replaceWith(svg);
    else box.prepend(svg);
  }
  for (const g of box.querySelectorAll('[data-zone]')) g.classList.toggle('hi', g.dataset.zone === zoneId);
}

// test — пробный запуск из раздела для родителя (ничего не записывается, вместо замка — «Выйти из проверки», onExit возвращает к родителю).
// Возвращает { el, onLeave }; внутри экран сам меняет «страницы» (диалог → проверка для взрослых → вопрос взрослому).
export function renderMission(app, { test = false, onExit = null } = {}) {
  const holder = h('div', { class: 'mission-holder' });
  const exit = () => (test && onExit ? onExit() : app.go.menu()); // конец миссии: меню (в пробном запуске — экран родителя)
  // Вид комнаты: по умолчанию — тот, где видна выбранная зона; кнопка «Повернуть комнату» включает ручной вид (на весь экран миссии).
  let roomView = { manual: false, view: 'A' };
  const viewFor = (zoneId) => (roomView.manual ? roomView.view : zoneById.get(zoneId)?.view || 'A');
  let leaveView = null; // очистка текущей страницы (проверка для взрослых слушает клавиатуру)

  const swap = (el, onLeave = null) => {
    if (leaveView) leaveView();
    leaveView = onLeave;
    holder.replaceChildren(el);
  };

  // Разворот: слева комната и собака с облачком, справа — то, что делает ребёнок.
  function page({ zone, text, right, joy = false, onLeave = null, dogHere = true, skip = false }) {
    const room = h('div', { class: 'mz-room', role: 'img', 'aria-label': M.roomLabel });
    const turn = button('paper-card mz-turn', [h('span', { class: 'mz-turn-icon', text: '↻' }), M.turnShort], () => {
      roomView = { manual: true, view: room.dataset.view === 'A' ? 'B' : 'A' };
      paintRoom(room, roomView.view, room.dataset.zone);
    });
    turn.setAttribute('aria-label', M.turnRoom);
    room.append(turn);
    paintRoom(room, viewFor(zone), zone);
    const bubble = h('div', { class: 'mz-bubble hand', 'aria-live': 'polite' }, text);
    // dogHere: false — собаки под комнатой нет (на экране таймера она в самой комнате, mission-dog.js), облачко на всю ширину
    const dog = dogHere ? h('div', { class: `mz-dog${joy ? ' joy' : ''}` }, drawDog({ ...guideDog(), mood: 'happy' })) : null;
    const book = createBook({
      className: 'mission-book',
      top: [
        skip ? noteButton({ label: format(M.skipButton, { cost: SKIP_COST }), icon: starIcon(), className: 'mz-skip', onTap: () => askSkip(bubble) }) : null,
        test ? button('btn quiet', M.testExit, exit) : lockButton(M.lock, () => app.go.parent()),
      ],
      left: [room, h('div', { class: `mz-talk${dogHere ? '' : ' alone'}` }, dog, bubble)],
      right: [h('div', { class: 'mz-right' }, right)],
    });
    swap(book.el, onLeave);
    return { room, bubble };
  }

  // Выбранная зона крупной карточкой (на страницах после выбора).
  const zoneCard = (id) => h('div', { class: 'paper-card mz-zone' },
    h('i', { class: 'tape', 'aria-hidden': 'true' }),
    h('span', { class: 'mz-icon', text: zoneById.get(id)?.icon || '' }),
    h('span', { class: 'mz-name', text: M.zones[id] || '' }));

  // По фазе дня показываем нужную страницу. done / skipped сюда не попадают (охрана в main.js), но на всякий случай — в меню.
  function next() {
    const m = missionState();
    if (m.phase === 'choose') return chooseView();
    if (m.phase === 'timer') return cleanView();
    if (m.phase === 'wait') return waitView();
    return exit();
  }

  // 1. Приветствие и выбор одной зоны. До «Начнём!» ребёнок может передумать, после — выбор фиксируется на день.
  function chooseView() {
    let zone = missionState().zone;
    const cards = ZONES.map((z) => {
      const card = button('paper-card mz-card', [
        h('i', { class: 'tape', 'aria-hidden': 'true' }),
        h('span', { class: 'mz-icon', text: z.icon }),
        h('span', { class: 'mz-name', text: M.zones[z.id] }),
      ], () => pick(z.id));
      card.setAttribute('aria-pressed', String(z.id === zone));
      card.classList.toggle('on', z.id === zone);
      return card;
    });
    const go = button('btn primary big mz-go', M.start, () => {
      if (!zone) return;
      startTimer();
      next(); // по фазе: таймер, а если день уже закрыт (другое окно, полночь) — меню
    });
    go.disabled = !zone;
    const view = page({
      zone,
      text: zone ? M.zonePick[zone] : M.greet,
      right: [h('div', { class: 'mz-cards' }, cards), go],
      skip: true,
    });
    function pick(id) {
      if (!chooseZone(id)) return next(); // фаза сменилась (другое окно, полночь): показываем актуальную страницу
      zone = id;
      app.services.sounds('tap');
      cards.forEach((c, i) => {
        const on = ZONES[i].id === id;
        c.classList.toggle('on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      view.bubble.textContent = M.zonePick[id];
      go.disabled = false;
      // выбранной зоны нет в том виде, который ребёнок повернула вручную, — возвращаем вид, где зона видна
      if (roomView.manual && !zoneById.get(id).views.includes(view.room.dataset.view)) roomView = { manual: false, view: 'A' };
      paintRoom(view.room, viewFor(id), id);
    }
  }

  // Пропуск уборки за звёзды: не хватает — собака объясняет, хватает — подтверждение (случайное касание не должно тратить звёзды).
  function askSkip(bubble) {
    if (holder.querySelector('.mz-dialog')) return; // окно уже открыто: второе нажатие не плодит окна
    if (!test && storage.balance() < SKIP_COST) {
      bubble.textContent = format(M.skipNeed, { cost: SKIP_COST, n: storage.balance() });
      app.services.sounds('hint');
      return;
    }
    const close = () => overlay.remove();
    const overlay = h('div', { class: 'overlay' },
      h('div', { class: 'dialog mz-dialog' },
        h('p', { class: 'hand', text: format(M.skipAsk, { cost: SKIP_COST }) }),
        h('div', { class: 'row' },
          button('btn primary big', M.skipNo, close),
          button('btn big', M.skipYes, () => { close(); if (skipForStars()) skippedView(); else next(); }))));
    holder.append(overlay);
  }

  // Уборку пропустили за звёзды: подарка нет, дальше — задания.
  function skippedView() {
    page({
      zone: '',
      text: M.skipDoneText,
      right: [
        h('div', { class: 'mz-spent hand', text: format(M.skipSpent, { cost: SKIP_COST }) }),
        button('btn primary big mz-go', M.skipToTasks, exit),
      ],
    });
  }

  // 2. Уборка с таймером. Время считается по endsAt (core/mission.js), поэтому перезагрузка и возврат во вкладку ничего
  // не сбивают; тики только перерисовывают дугу. Время вышло — мягкий звук и реплика, кнопка «Я убралась!» есть всегда.
  function cleanView() {
    const m = missionState();
    const total = timerMs();
    const left0 = msLeft();
    let expired = left0 === 0; // уже вышло до открытия экрана — звук не нужен, он был бы «из прошлого»
    let line = '';
    let ticker = null;
    let release = null;

    const clockEl = h('div', { class: 'mz-clock hand' });
    const dial = svgEl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true">
      <circle class="mz-ring-track" cx="120" cy="120" r="${RING_R}"/>
      <circle class="mz-ring-arc" cx="120" cy="120" r="${RING_R}" stroke-dasharray="${RING_LEN}"/></svg>`);
    const arc = dial.querySelector('.mz-ring-arc');
    const ring = h('div', { class: 'mz-ring' }, dial,
      h('div', { class: 'mz-ring-text' }, h('span', { class: 'mz-ring-label', text: M.timerLabel }), clockEl));

    const lastMs = Math.min(LAST_MS, total / 4); // в коротком пробном таймере «последняя минута» — его последняя четверть
    const lineFor = (left) => (left === 0 ? M.timeUp : left <= lastMs ? M.lastMinute : left <= total / 2 ? M.half : M.cleaning);

    function paint() {
      if (document.visibilityState !== 'visible') return; // вкладка скрыта: не рисуем, при возврате перерисуем
      // Фаза уже не «таймер» (наступил новый день, родитель закрыл миссию в другом окне): показываем актуальную страницу,
      // иначе экран остался бы с 0:00 и кнопкой, которая ничего не делает.
      if (missionState().phase !== 'timer') { next(); return; }
      const left = msLeft();
      clockEl.textContent = clock(Math.ceil(left / 1000));
      arc.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - Math.min(1, left / total))));
      clockEl.classList.toggle('over', left === 0);
      const phrase = lineFor(left); // не next: так называется функция показа страницы по фазе, её paint вызывает выше
      if (phrase !== line) { line = phrase; view.bubble.textContent = phrase; }
      roomDog.update({ left, total, extra: m.extra, view: view.room.dataset.view });
      if (left === 0 && !expired) { expired = true; app.services.sounds('done'); }
    }

    const stop = () => {
      clearInterval(ticker);
      document.removeEventListener('visibilitychange', paint);
      if (release) release();
    };
    const view = page({
      zone: m.zone,
      text: lineFor(left0),
      right: [
        ring,
        h('div', { class: 'mz-zone-chip' }, h('span', { class: 'mz-icon', text: zoneById.get(m.zone)?.icon || '' }), h('span', { text: M.zones[m.zone] || '' })),
        button('btn primary big mz-go', M.cleaned, () => { markCleaned(); next(); }),
      ],
      onLeave: stop,
      dogHere: false,
    });
    const roomDog = createRoomDog({ zone: m.zone, dog: guideDog() });
    view.room.append(roomDog.el);
    line = lineFor(left0);
    paint();
    ticker = setInterval(paint, TICK_MS);
    document.addEventListener('visibilitychange', paint);
    release = keepAwake();
  }

  // 3. Зов взрослого: кнопка ведёт на проверку умножением.
  function waitView() {
    const m = missionState();
    page({
      zone: m.zone,
      text: M.callText,
      right: [zoneCard(m.zone), button('btn primary big mz-go', M.callAdult, askAdult)],
    });
  }

  function askAdult() {
    const gate = renderGate(app, { onPass: adultView, onCancel: waitView });
    swap(gate.el, gate.onLeave);
  }

  // 3б. Вопрос взрослому (после проверки): что выбрала ребёнок, сколько ушло времени и три ответа.
  function adultView() {
    const m = missionState();
    const spent = Math.max(0, Math.round(((m.cleanedAt || Date.now()) - m.startedAt) / 1000));
    page({
      zone: m.zone,
      text: format(M.adultAsk, { name: guideDog().name }),
      right: [
        h('p', { class: 'mz-info', text: format(M.adultInfo, { zone: (M.zones[m.zone] || '').toLowerCase(), time: clock(spent) }) }),
        h('div', { class: 'mz-adult' },
          button('btn primary big', M.adultDone, () => { if (confirmDone()) giftView(); else exit(); }),
          button('btn big', timerMs() < 60000 ? format(M.adultMoreSec, { n: Math.round(timerMs() / 1000) }) : format(M.adultMore, { n: Math.round(timerMs() / 60000) }), () => { addTime(); next(); }),
          button('btn big', M.adultSkip, () => { skipToday(); exit(); })),
        button('btn quiet', `⬅ ${M.adultBack}`, waitView),
      ],
    });
  }

  // 4. Подарок: собака радуется, косточка для неё (REWARD в core/mission-data.js; её уже выдал storage.completeMission).
  function giftView() {
    app.services.sounds('done');
    page({
      zone: '',
      text: M.giftText,
      joy: true,
      right: [
        h('div', { class: 'rs-bone mz-bone' }, svgEl(boneMark())),
        h('p', { class: 'mz-gift-caption hand', text: test ? M.giftBoneTest : format(M.giftBone, { n: storage.bonesBalance() }) }),
        button('btn primary big mz-go', M.giftThanks, exit),
      ],
    });
  }

  next();
  return { el: holder, onLeave: () => { if (leaveView) leaveView(); } };
}
