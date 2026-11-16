// Движок комикса: глава = серия. Страница из 3–4 кадров; кадры открываются по одному — кадр «подъезжает»
// на всю область страницы, облачки выпрыгивают, срабатывают эффекты, ребёнок читает и решает задание
// (или нажимает «Дальше»), и кадр возвращается на своё место на странице.
//
// Какая глава следующая — помним через level: ядро отдаёт ctx.level = (уровень конца прошлой серии) − 1,
// поэтому в finish передаём «номер следующей главы + 1». Первая серия: ctx.level === null → глава 0.
// Ошибочные задания в конце не повторяются: это история, текст не должен повторяться.

import { el } from './art.js';
import { buildPanel } from './panel.js';
import { runTask, onTap } from './tasks.js';
import { focusPanel } from './focus.js';

const rnd = (n) => Math.floor(Math.random() * n);

export function runComic(ctx, { STORY, HEROES, TEXT }) {
  const chapters = STORY.chapters;
  // Режимы для проверки: ctx.test.chapter из раздела для родителя (на Хромбуке) или параметр адреса (на компьютере).
  // '3' — открыть сразу 3-ю главу; 'all' — пройти все главы подряд за одну серию (следующая после этого — первая).
  const dev = ctx.test ? ctx.test.chapter : new URLSearchParams(location.search).get('comic');
  const all = dev === 'all';
  let idx = dev && !all ? Number(dev) - 1 : all ? 0 : ctx.level ?? 0;
  if (!Number.isInteger(idx) || idx < 0) idx = 0;
  idx %= chapters.length;
  let chapter = chapters[idx];
  const queue = all ? chapters : [chapter];
  const nextIdx = all ? 0 : (idx + 1) % chapters.length;
  const tasksIn = (ch) => ch.pages.reduce((s, pg) => s + pg.panels.filter((pn) => pn.task).length, 0);

  let alive = true;
  const timers = new Set();
  const wait = (ms) =>
    new Promise((resolve) => {
      const t = setTimeout(() => {
        timers.delete(t);
        resolve();
      }, ms);
      timers.add(t);
    });

  // ---------- разметка ----------
  const root = el('div', 'cmx');
  const ribbon = el('div', 'cmx-ribbon', `${TEXT.chapter} ${chapter.id} · ${chapter.title}`);
  const dotsBox = el('div', 'cmx-dots');
  const repeatBtn = el('button', 'cmx-repeat', '🔊');
  repeatBtn.type = 'button';
  repeatBtn.setAttribute('aria-label', TEXT.repeatLabel);
  repeatBtn.hidden = !ctx.voice;
  const top = el('div', 'cmx-top');
  top.append(dotsBox, ribbon, repeatBtn);

  const stageEl = el('div', 'cmx-stage');
  const bar = el('div', 'cmx-bar');
  const askEl = el('p', 'cmx-ask');
  const optsEl = el('div', 'cmx-opts');
  const slotsEl = el('div', 'cmx-slots');
  const askRow = el('div', 'cmx-askrow');
  askRow.append(askEl, slotsEl);
  bar.append(askRow, optsEl);
  root.append(top, stageEl, bar);
  ctx.container.append(root);

  const tasksTotal = queue.reduce((s, ch) => s + tasksIn(ch), 0);
  let dots = [];
  // Лента и точки заданий текущей главы (в режиме «все главы» меняются при переходе).
  function setChapter(ch) {
    chapter = ch;
    ribbon.textContent = `${TEXT.chapter} ${ch.id} · ${ch.title}`;
    dotsBox.replaceChildren();
    dots = Array.from({ length: tasksIn(ch) }, () => el('span', 'cmx-dot'));
    dotsBox.append(...dots);
    done = 0;
  }

  let currentView = null;
  repeatBtn.onclick = async () => {
    for (const b of currentView?.bubbles ?? []) await ctx.speak(b.data.text.replace('___', ''), 'ru');
  };

  // ---------- панель задания ----------
  let retryShown = false;
  const env = {
    ctx,
    TEXT,
    HEROES,
    wait,
    ask(text) {
      askEl.textContent = text;
      askEl.classList.remove('retry');
      retryShown = false;
    },
    options(nodes) {
      optsEl.replaceChildren(...nodes);
    },
    // пустые клеточки 1, 2, 3 рядом с вопросом (задание «по порядку»)
    slots(n) {
      slotsEl.replaceChildren(...Array.from({ length: n }, (_, i) => el('span', 'cmx-slot-dot', String(i + 1))));
    },
    fillSlot(i) {
      slotsEl.children[i]?.classList.add('done');
    },
    hint(text) {
      askEl.textContent = text || TEXT.retry;
      askEl.classList.add('retry');
      retryShown = true;
    },
    praise() {
      askEl.classList.remove('retry');
      askEl.textContent = TEXT.praise[rnd(TEXT.praise.length)];
      askEl.classList.add('praise');
      setTimeout(() => askEl.classList.remove('praise'), 1200);
    },
  };

  function clearBar() {
    askEl.textContent = '';
    askEl.classList.remove('retry', 'praise');
    optsEl.replaceChildren();
    slotsEl.replaceChildren();
    bar.classList.remove('active');
  }

  function nextButton() {
    return new Promise((resolve) => {
      const b = el('button', 'cmx-next');
      b.type = 'button';
      b.append(el('span', null, TEXT.next), el('span', 'cmx-arrow', '▶'));
      optsEl.replaceChildren(b);
      bar.classList.add('active');
      onTap(b, () => {
        ctx.sound('tap');
        resolve();
      });
    });
  }

  // ---------- страница ----------
  // Кадр «подъезжает» на всю страницу или возвращается на место (focus.js: форма увеличенного кадра своя, не раскладки).
  const focus = (panel, on) => focusPanel(panel.el, stageEl, on);

  function buildPage(page) {
    const pageEl = el('div', 'cmx-page enter');
    pageEl.dataset.layout = page.panels.length === 4 ? 'B' : 'A';
    const panels = page.panels.map((data, i) => {
      const slot = el('div', `cmx-slot pos-${i}`);
      pageEl.append(slot);
      const p = buildPanel(data, HEROES);
      p.el.classList.add(`pos-${i}`);
      pageEl.append(p.el);
      return p;
    });
    return { pageEl, panels };
  }

  let correct = 0;
  let done = 0;
  const mistakes = [];

  async function playPanel(p, key) {
    const { data } = p;
    currentView = p;
    p.el.classList.remove('pre');
    void p.el.offsetWidth;
    focus(p, true);
    p.play();
    await wait(620);
    if (!alive) return;
    if (data.task) {
      bar.classList.add('active');
      const ok = await runTask(data.task, p, env);
      if (!alive) return;
      ctx.task({ ok, level: chapter.id });
      dots[done]?.classList.add('done');
      done += 1;
      if (ok) correct += 1;
      else mistakes.push({ key, label: data.bubbles.find((b) => b.text)?.text ?? key });
    } else {
      await nextButton();
    }
    if (!alive) return;
    clearBar();
    focus(p, false);
    await wait(520);
  }

  async function titleCard() {
    const card = el('div', 'cmx-title');
    card.append(
      el('div', 'cmx-title-chapter', `${TEXT.chapter} ${chapter.id}`),
      el('div', 'cmx-title-name', chapter.title),
    );
    const b = el('button', 'cmx-next');
    b.type = 'button';
    b.append(el('span', null, TEXT.start), el('span', 'cmx-arrow', '▶'));
    card.append(b);
    stageEl.append(card);
    await new Promise((resolve) => onTap(b, () => { ctx.sound('tap'); resolve(); }));
    card.remove();
  }

  async function run() {
    for (const ch of queue) {
      setChapter(ch);
      await titleCard();
      for (let pi = 0; pi < chapter.pages.length; pi++) {
        if (!alive) return;
        const { pageEl, panels } = buildPage(chapter.pages[pi]);
        stageEl.replaceChildren(pageEl);
        await wait(380);
        for (let i = 0; i < panels.length; i++) {
          await playPanel(panels[i], `c${chapter.id}.p${pi + 1}.k${i + 1}`);
          if (!alive) return;
        }
        if (pi < chapter.pages.length - 1) {
          await nextButton();
          clearBar();
          pageEl.classList.add('leave');
          await wait(420);
        }
      }
    }
    if (!alive) return;
    ctx.finish({ correct, total: tasksTotal, level: nextIdx + 1, mistakes });
  }

  run();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
