// Hello! Скажи слово: показана картинка, ребёнок называет слово по-английски вслух (сеть и распознавание речи не
// используются), потом нажимает «Проверить» — слово звучит голосом Sonia и пишется на экране — и сам отмечает,
// получилось ли так же. Это тренировка вспоминания, а не узнавания (как в english-quiz).
// Уровни: 0 — виден первая буква и черточки на каждую букву; 1 — только картинка, подсказку можно попросить;
// 2 — только картинка, без подсказки. После ошибки уровень падает, после трёх верных подряд растёт.
// Не получилось — слово звучит ещё раз, ребёнок повторяет за голосом; слово вернётся в конце серии.
// Учёт слов — отдельный: ключ «ens:cat» (называет), не «en:cat» (узнаёт в english-quiz).
// Слова — modules/english-words/words.json.

import { TEXT, SKIP } from './texts.js';

const LEVELS = 3;
const CLEAN_TO_LEVEL_UP = 3; // верных подряд до повышения уровня
const HINT_LEVEL = 1; // на этом уровне подсказку можно попросить (ниже она видна сразу, выше её нет)
const KEYED_FROM_LEVEL = 1; // со слов с подсказкой на экране учёт «называет» не ведётся

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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

// Картинка слова: эмодзи-наклейка, цветной кружок или число с предметами.
function picture(word) {
  const box = el('div', 'sy-pic');
  if (word.color) {
    const swatch = el('div', 'sy-swatch');
    swatch.style.background = word.color;
    box.append(swatch);
  } else if (word.number) {
    box.append(el('div', 'sy-digit', String(word.number)), el('div', 'sy-stars', '⭐'.repeat(word.number)));
  } else {
    box.append(el('div', 'sy-emoji', word.emoji));
  }
  return box;
}

const iconOf = (word) => word.emoji || (word.color ? '🎨' : String(word.number));

// Подсказка-«клеточки»: первая буква и по черточке на каждую следующую, пробел между словами.
function pattern(word) {
  const row = el('div', 'sy-pattern');
  [...word.en].forEach((ch, i) => {
    if (ch === ' ') row.append(el('span', 'sy-gap'));
    else row.append(el('span', i === 0 ? 'sy-letter first' : 'sy-letter', i === 0 ? ch : ''));
  });
  return row;
}

export async function start(ctx) {
  const { topics } = await fetch(new URL('../english-words/words.json', import.meta.url)).then((r) => r.json());
  const skip = new Set(SKIP);
  const all = topics.flatMap((t) => t.words.filter((w) => !skip.has(w.en)).map((w) => ({ ...w, topic: t.id })));
  const byKey = new Map(all.map((w) => [w.en, w]));
  const total = ctx.settings.seriesLength;
  ctx.words.size('ens', all.length);
  const showTranslation = Boolean(ctx.settings.translation);
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

  const root = el('div', 'sy');
  ctx.container.append(root);

  // ---------- выбор темы ----------
  function showTopics() {
    const tile = (info, pool) => {
      const node = button('paper-card sy-topic', '', () => run(pool));
      node.append(el('span', 'sy-topic-icon', info.icon), el('span', 'sy-topic-title', info.title), el('span', 'sy-topic-ru', info.ru));
      return node;
    };
    const grid = el('div', 'sy-topics');
    grid.append(
      ...topics.map((t) => [t, all.filter((w) => w.topic === t.id)]).filter(([, pool]) => pool.length).map(([t, pool]) => tile(t, pool)),
      tile(TEXT.mix, all));
    root.replaceChildren(el('div', 'sy-heading hand', TEXT.chooseTopic), grid);
  }

  // ---------- одно задание ----------
  // Возвращает true, если ребёнок назвал слово сам (без подсказки) и отметил «получилось».
  function playTask(word, level) {
    return new Promise((resolve) => {
      let hinted = false;
      let done = false;
      const say = () => ctx.speak(word.en, 'en');

      const prompt = el('div', 'sy-prompt hand', TEXT.ask);
      const card = el('div', 'paper-card sy-card');
      card.append(el('i', 'tape'), picture(word));
      const line = el('div', 'sy-line'); // подсказка-«клеточки», потом само слово
      const actions = el('div', 'sy-actions');
      root.replaceChildren(prompt, card, line, actions);

      const showWord = () => {
        // Слово крупно; касание слова — послушать ещё раз
        const label = button('sy-word', '', say);
        const speaker = el('span', 'sy-word-speaker', '🔊');
        speaker.hidden = !ctx.voice;
        label.append(el('span', 'sy-word-text', word.en), speaker);
        label.setAttribute('aria-label', TEXT.listenLabel);
        line.replaceChildren(label);
        if (showTranslation) line.append(el('div', 'sy-translation', word.ru));
      };

      // 1) назвать слово
      const askPhase = () => {
        prompt.textContent = TEXT.ask;
        if (level < HINT_LEVEL || hinted) line.replaceChildren(pattern(word));
        else line.replaceChildren();
        const buttons = [];
        if (level === HINT_LEVEL && !hinted) {
          const hint = button('btn big quiet sy-hint', `💡 ${TEXT.hint}`, () => {
            if (hinted || done) return;
            hinted = true;
            ctx.sound('hint');
            line.replaceChildren(pattern(word));
            hint.remove();
          });
          buttons.push(hint);
        }
        buttons.push(button('btn big primary sy-check', `👂 ${TEXT.check}`, checkPhase));
        actions.replaceChildren(...buttons);
      };

      // 2) услышать слово и самому оценить, получилось ли так же
      async function checkPhase() {
        if (done || !alive) return;
        prompt.textContent = TEXT.compare;
        showWord();
        actions.replaceChildren(
          button('btn big sy-yes', `✅ ${TEXT.yes}`, () => answer(true)),
          button('btn big quiet sy-no', `🔁 ${TEXT.no}`, () => answer(false)));
        await say();
      }

      async function answer(said) {
        if (done || !alive) return;
        if (said) {
          done = true;
          actions.replaceChildren();
          ctx.sound('correct');
          await wait(900);
          resolve(!hinted);
          return;
        }
        // 3) не получилось: слово звучит ещё раз, ребёнок повторяет за голосом, потом идём дальше
        ctx.sound('hint');
        prompt.textContent = TEXT.together;
        actions.replaceChildren(button('btn big primary sy-next', `${TEXT.next} ➡`, () => {
          if (done) return;
          done = true;
          resolve(false);
        }));
        await say();
      }

      askPhase();
    });
  }

  // ---------- серия ----------
  async function run(pool) {
    let level = Math.min(ctx.level ?? 0, LEVELS - 1); // уровень помнится между сериями (core: ctx.level)
    let clean = 0;
    let correct = 0;
    const used = new Set();
    const mistakes = new Map();
    const count = total;

    // Трудные слова из прошлых серий этой темы — в случайных местах серии.
    const planned = new Map();
    const positions = shuffle(Array.from({ length: Math.max(0, count - 1) }, (_, i) => i + 1));
    const poolKeys = new Set(pool.map((w) => w.en));
    for (const word of shuffle(ctx.hard.map((k) => byKey.get(k)).filter((w) => w && poolKeys.has(w.en))).slice(0, 2)) {
      if (positions.length) planned.set(positions.pop(), word);
    }

    for (let i = 0; i < count; i++) {
      const fresh = pool.filter((w) => !used.has(w.en));
      const word = planned.get(i) || ctx.words.pick(fresh.length ? fresh : pool, (w) => `ens:${w.en}`); // выученные слова реже
      used.add(word.en);
      const firstTry = await playTask(word, level);
      ctx.task({ ok: firstTry, level, key: level >= KEYED_FROM_LEVEL ? `ens:${word.en}` : undefined });
      if (!alive) return;
      if (firstTry) {
        correct += 1;
        clean += 1;
        if (clean >= CLEAN_TO_LEVEL_UP && level < LEVELS - 1) {
          level += 1;
          clean = 0;
        }
      } else {
        mistakes.set(word.en, word);
        level = Math.max(0, level - 1);
        clean = 0;
      }
    }

    // Слова, которые не получились, — ещё раз в конце. На результат не влияют.
    const again = [...mistakes.values()];
    for (const word of again) {
      await playTask(word, level);
      if (!alive) return;
    }

    ctx.finish({
      correct,
      level,
      total: count,
      mistakes: again.map((w) => ({ key: w.en, label: `${iconOf(w)} ${w.en}` })),
    });
  }

  showTopics();

  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
    root.remove();
  };
}
