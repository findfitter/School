// Hello! Знакомство: ребёнок слушает и разглядывает новые английские слова (голос Sonia).
// Выбор темы: сверху крупно «Новое» (темы, которые ещё не слушала, и начатые — не больше BIG_COUNT), ниже мелко
// «Ещё темы», в самом низу тусклые «Уже слушали» (все слова темы прослушаны). Прослушанное слово ядро помнит
// под ключом «enh:слово» (ctx.words.mark / seen).
// Тема -> страницы по 4 карточки. При открытии страницы слова проговариваются по очереди,
// касание карточки повторяет слово. Проверок нет — это знакомство; задания «услышь и выбери»
// будут отдельным модулем.

import { TEXT } from './texts.js';

const PAGE_SIZE = 4;
const GAP_MS = 350; // пауза между словами при автоматическом чтении страницы
const BIG_COUNT = 6; // сколько тем показывается крупно (следующие для знакомства)

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Касание кнопки: срабатывает при отпускании пальца на самой кнопке (и с клавиатуры).
function onTap(button, fn) {
  let down = false;
  button.addEventListener('pointerdown', () => {
    down = true;
    button.classList.add('pressed');
  });
  button.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    button.classList.remove('pressed');
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (under && button.contains(under)) fn();
  });
  const cancel = () => {
    down = false;
    button.classList.remove('pressed');
  };
  button.addEventListener('pointercancel', cancel);
  button.addEventListener('pointerleave', cancel);
  button.addEventListener('click', (e) => {
    if (e.detail === 0) fn();
  });
}

function button(className, label, handler) {
  const node = el('button', className, label);
  node.type = 'button';
  onTap(node, handler);
  return node;
}

// Картинка карточки: эмодзи, цветной кружок или число с предметами.
function picture(word) {
  const box = el('div', 'ew-pic');
  if (word.color) {
    const swatch = el('div', 'ew-swatch');
    swatch.style.background = word.color;
    box.append(swatch);
  } else if (word.number) {
    box.append(el('div', 'ew-digit', String(word.number)), el('div', 'ew-dots', '⭐'.repeat(word.number)));
  } else {
    box.append(el('div', 'ew-emoji', word.emoji));
  }
  return box;
}

export async function start(ctx) {
  const { topics } = await fetch(new URL('words.json', import.meta.url)).then((r) => r.json());
  let alive = true;
  let run = 0; // номер последнего озвучивания: старая очередь слов останавливается
  const timers = new Set();

  const wait = (ms) =>
    new Promise((resolve) => {
      const t = setTimeout(() => {
        timers.delete(t);
        resolve();
      }, ms);
      timers.add(t);
    });

  const root = el('div', 'ew');
  ctx.container.append(root);

  // ---------- выбор темы ----------
  // Сколько слов темы уже прослушано: new — ни одного, started — часть, done — все.
  function topicState(topic) {
    const heard = topic.words.filter((w) => ctx.words.seen(`enh:${w.en}`)).length;
    const total = topic.words.length;
    return { topic, heard, total, status: heard === 0 ? 'new' : heard < total ? 'started' : 'done' };
  }

  function showTopics() {
    run += 1;
    const states = topics.map(topicState);
    // Сначала начатые, потом новые (внутри — порядок из words.json); прослушанные уходят вниз.
    const todo = [...states.filter((s) => s.status === 'started'), ...states.filter((s) => s.status === 'new')];
    const done = states.filter((s) => s.status === 'done');

    const bigTile = (s) => {
      const tile = button(`ew-topic big ${s.status}`, '', () => showLesson(s.topic, 0));
      tile.append(
        el('span', 'ew-badge', s.status === 'new' ? TEXT.badgeNew : `${s.heard}/${s.total}`),
        el('span', 'ew-topic-icon', s.topic.icon),
        el('span', 'ew-topic-title', s.topic.title),
        el('span', 'ew-topic-ru', s.topic.ru));
      return tile;
    };
    const smallTile = (s) => {
      const tile = button(`ew-topic small ${s.status}`, '', () => showLesson(s.topic, 0));
      tile.append(el('span', 'ew-topic-icon', s.topic.icon), el('span', 'ew-topic-title', s.topic.title));
      if (s.status === 'done') tile.append(el('span', 'ew-check', '✓'));
      return tile;
    };
    const group = (title, tiles, extra = '') => {
      if (!tiles.length) return null;
      const box = el('div', `ew-group ${extra}`);
      box.append(el('div', 'ew-group-title', title), (() => {
        const row = el('div', 'ew-row');
        row.append(...tiles);
        return row;
      })());
      return box;
    };

    const topics_ = el('div', 'ew-topics');
    topics_.append(...[
      group(TEXT.groupNew, todo.slice(0, BIG_COUNT).map(bigTile), 'big'),
      group(TEXT.groupMore, todo.slice(BIG_COUNT).map(smallTile)),
      group(TEXT.groupDone, done.map(smallTile), 'done'),
    ].filter(Boolean));
    root.replaceChildren(el('div', 'ew-heading', TEXT.chooseTopic), topics_);
  }

  // ---------- страница с карточками ----------
  function showLesson(topic, pageIndex) {
    const pages = Math.ceil(topic.words.length / PAGE_SIZE);
    const words = topic.words.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
    const showTranslation = Boolean(ctx.settings.translation);

    const cards = words.map((word) => {
      const card = button('ew-card', '', () => say(word, card));
      card.append(picture(word), el('div', 'ew-word', word.en));
      if (showTranslation) card.append(el('div', 'ew-translation', word.ru));
      card.append(el('span', 'ew-speaker', '🔊'));
      return card;
    });

    // Озвучить одно слово (подсветить его карточку). Старая очередь отменяется.
    async function say(word, card) {
      const mine = ++run;
      highlight(card);
      await ctx.speak(word.en, 'en');
      if (alive) ctx.words.mark(`enh:${word.en}`); // слово прослушано
      if (alive && mine === run) highlight(null);
    }

    // Проговорить все слова страницы по порядку.
    async function sayAll() {
      const mine = ++run;
      for (let i = 0; i < words.length; i++) {
        if (!alive || mine !== run) return;
        highlight(cards[i]);
        await ctx.speak(words[i].en, 'en');
        if (alive) ctx.words.mark(`enh:${words[i].en}`); // слово прослушано
        await wait(GAP_MS);
      }
      if (alive && mine === run) highlight(null);
    }

    const dots = el('div', 'ew-dots-row');
    for (let i = 0; i < pages; i++) dots.append(el('span', i === pageIndex ? 'ew-dot now' : i < pageIndex ? 'ew-dot done' : 'ew-dot'));

    const nav = el('div', 'ew-nav');
    nav.append(
      pageIndex > 0
        ? button('ew-btn', `⬅ ${TEXT.back}`, () => showLesson(topic, pageIndex - 1))
        : button('ew-btn', `⬅ ${topic.title}`, showTopics),
      button('ew-btn listen', `🔊 ${TEXT.listenAgain}`, sayAll),
      button('ew-btn go', `${TEXT.next} ➡`, () => (pageIndex + 1 < pages ? showLesson(topic, pageIndex + 1) : showDone(topic))));

    const row = el('div', 'ew-cards');
    row.append(...cards);
    root.replaceChildren(
      el('div', 'ew-heading', `${topic.icon} ${topic.title}`),
      dots,
      row,
      nav);
    sayAll();
  }

  function highlight(card) {
    root.querySelectorAll('.ew-card.speaking').forEach((c) => c.classList.remove('speaking'));
    card?.classList.add('speaking');
  }

  // ---------- конец темы ----------
  function showDone(topic) {
    run += 1;
    ctx.sound('done');
    root.replaceChildren(
      el('div', 'ew-done-icon', '🎉'),
      el('div', 'ew-heading', TEXT.done),
      el('div', 'ew-done-text', TEXT.doneText),
      (() => {
        const nav = el('div', 'ew-nav center');
        nav.append(
          button('ew-btn', TEXT.again, () => showLesson(topic, 0)),
          button('ew-btn go', TEXT.otherTopic, showTopics));
        return nav;
      })());
  }

  showTopics();

  return () => {
    alive = false;
    run += 1;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
