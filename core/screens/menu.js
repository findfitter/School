// Главный экран — «сказочная книжка» (общий компонент core/screens/book.js): слева страница с собакой ребёнка
// и дорожкой к косточке, справа закладки-главы (разделы) и карточки заданий выбранной главы.
// Рисунки — core/screens/book-art.js, стили — core/styles/book.css.
import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { moduleIcon } from '../registry.js';
import { isLocked } from '../cycles.js';
import { challengeProgress } from '../challenges.js';
import { starsFor } from '../rewards.js';
import { createBook, createIllustration, counters, noteButton, lockButton, guideDog } from './book.js';
import { svgEl, SPEECH_TAIL, starIcon, boneIcon, pawIcon, blob, trackBar } from './book-art.js';

const TILT = [-1.4, 1.1, 0.8, -1, 1.3, -0.7, 1, -1.2]; // наклон карточек, градусы
const TAPE_TILT = [3, -4, 5, -3, 2, -5, 4, -2]; // наклон полосок скотча
const PATH_STARS = 5; // звёзд на дорожке; закрашиваются по мере набора 25 звёзд
const CHAPTER_KEY = 'chapter'; // выбранная глава помнится (storage.uiState), пока открыта вкладка
const LEAVE_MS = 350; // через сколько убрать старую страницу: новая к этому времени непрозрачна (page-turn, 0.5 с, 60%)

// «1 звезду / 2 звезды / 5 звёзд», «1 задание / 2 задания / 5 заданий»
function plural(n, forms) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

function today() {
  try {
    return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

// Звёзды карточки задания: 0 — серий ещё не было, иначе по доле верных с первой попытки за всё время (starsFor).
// Формат сохранения не меняется: отдельных «звёзд модуля» в нём нет.
function moduleStars(id) {
  const p = storage.moduleProgress(id);
  return p.series > 0 && p.total > 0 ? starsFor(p.correct, p.total) : 0;
}

export function renderMenu(app) {
  const disabled = new Set(storage.settings().disabledModules);
  const groups = new Map();
  for (const m of app.manifests) {
    if (disabled.has(m.id)) continue;
    const subject = STR.subjects[m.subject] ? m.subject : 'other';
    if (!groups.has(subject)) groups.set(subject, []);
    groups.get(subject).push(m);
  }
  const subjects = [...STR.subjectOrder, 'other'].filter((subject) => groups.has(subject));
  let current = storage.uiState(CHAPTER_KEY);
  if (!subjects.includes(current)) current = subjects[0] ?? null;

  const body = h('div', { class: 'bk-page-body' });
  const ribbons = new Map();

  function pick(subject, animate = true) {
    current = subject;
    storage.setUiState(CHAPTER_KEY, subject);
    for (const [id, el] of ribbons) {
      const on = id === subject;
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', String(on));
    }
    showChapter(app, body, subject, groups.get(subject) || [], subjects.indexOf(subject), animate);
  }

  const nav = h('nav', { class: 'bk-ribbons', 'aria-label': STR.book.chaptersNav },
    subjects.map((subject) => {
      const el = button(`ribbon s-${subject}`, h('span', { text: STR.subjects[subject].glyph }), () => {
        if (subject === current) return;
        app.services.sounds('tap');
        pick(subject);
      });
      el.setAttribute('aria-label', STR.subjects[subject].title);
      ribbons.set(subject, el);
      return el;
    }));

  const book = createBook({
    className: 'menu-screen',
    top: [
      counters(storage.balance(), storage.bonesBalance()),
      noteButton({
        label: STR.menu.dog,
        icon: pawIcon(),
        className: 'bk-note-dog',
        onTap: () => {
          app.services.sounds('tap');
          app.go.dog();
        },
      }),
      noteButton({ label: STR.menu.stickers, icon: starIcon('#D9667F'), className: 'bk-note-stickers', onTap: () => app.go.stickers() }),
      lockButton(STR.menu.parent, () => app.go.parent()),
    ],
    left: leftPage(app),
    right: [nav, body],
  });

  if (subjects.length) pick(current, true);
  else body.append(h('p', { class: 'bk-empty', text: STR.menu.empty }));
  return book.el;
}

// ---------- Левая страница ----------

// Собака ребёнка (первая из купленных) на тропинке; пока своей нет — собака-проводник Бобик (guideDog).
function leftPage(app) {
  const { have, need, left } = challengeProgress();
  const pathDone = Math.floor((have * PATH_STARS) / need);
  const pending = Boolean(app.challenge) && Object.keys(storage.challenges().pending).length > 0;
  const dog = guideDog();
  const progress = format(STR.book.pathProgress, { n: have, total: need });

  const art = createIllustration({ dog, pathDone, label: dog ? `${STR.book.artLabel}: ${dog.name}` : STR.book.artLabel });

  return [
    h('div', { class: 'bk-left-head' },
      h('h1', { class: 'bk-title hand', text: STR.appTitle }),
      h('span', { class: 'bk-date hand', text: today() })),
    art,
    dog ? h('div', { class: 'bk-bubble hand' }, pending ? STR.book.helloChallenge : STR.book.hello, svgEl(SPEECH_TAIL, 'bk-bubble-tail')) : null,
    h('div', { class: 'bk-path' },
      h('div', { class: 'bk-path-head' },
        h('span', { class: 'bk-path-title hand', text: STR.book.pathTitle }),
        h('span', { class: 'bk-path-count', text: progress })),
      h('div', { class: 'bk-track', role: 'img', 'aria-label': progress }, svgEl(trackBar(have / need))),
      h('p', { class: 'bk-path-hint', text: format(STR.book.pathLeft, { n: left, stars: plural(left, STR.book.starForms) }) })),
  ];
}

// ---------- Правая страница: глава ----------

// Новая страница «переворачивается» (page-turn) поверх старой, старая убирается, когда новая проявилась, — без мигания. Цвета предмета лежат
// на самой странице главы (s-<предмет>), а не на общем контейнере, поэтому тающая страница не перекрашивается.
function showChapter(app, body, subject, modules, index, animate) {
  const info = STR.subjects[subject];
  const locked = modules.filter((m) => isLocked(m)).length;
  const count = modules.length;
  const meta = `${count} ${plural(count, STR.book.taskForms)}${locked ? ` · ${format(STR.book.doneCount, { n: locked })}` : ''}`;

  const cards = [challengeCard(app, subject), ...modules.map((m) => taskCard(app, m))].filter(Boolean);
  cards.forEach((el, k) => {
    el.style.setProperty('--rot', `${TILT[(k + 1) % TILT.length]}deg`);
    el.style.setProperty('--tape-rot', `${TAPE_TILT[k % TAPE_TILT.length]}deg`);
  });

  const page = h('div', { class: `bk-turn s-${subject}${animate ? ' page-turn' : ''}` },
    h('div', { class: 'bk-chapter-head' },
      h('div', {},
        h('div', { class: 'bk-chapter hand', text: STR.book.chapters[index] || '' }),
        h('h2', { class: 'bk-chapter-name hand', text: info.short || info.title })),
      h('span', { class: 'bk-meta', text: meta })),
    h('div', { class: 'bk-grid' }, cards));

  for (const old of [...body.children]) {
    if (old.classList.contains('leaving')) {
      old.remove();
      continue;
    }
    old.classList.add('leaving');
    old.setAttribute('inert', '');
    setTimeout(() => old.remove(), LEAVE_MS);
  }
  body.append(page);
}

function glyphOrIcon(manifest) {
  if (!manifest.glyph) return moduleIcon(manifest);
  return h('span', { class: `bk-glyph-text${[...manifest.glyph].length > 3 ? ' long' : ''}`, text: manifest.glyph });
}

function stars(n) {
  return h('span', { class: 'bk-stars', role: 'img', 'aria-label': format(STR.book.cardStars, { n }) },
    [0, 1, 2].map((k) => svgEl(k < n ? starIcon('#F4C34E', '#D9A21E') : starIcon('none', '#D8C9AE'))));
}

// Сложное задание раздела: золотая карточка с косточкой, пока задание не пройдено (core/challenges.js).
function challengeCard(app, subject) {
  const info = app.challenge?.challenge?.subjects?.[subject];
  if (!info || !storage.challenges().pending[subject]) return null;
  const el = button('paper-card bk-card bk-card-challenge', [
    h('i', { class: 'tape', 'aria-hidden': 'true' }),
    h('span', { class: 'bk-icon' }, svgEl(blob(), 'bk-blob'), svgEl(boneIcon('#FFFDF6'), 'bk-bone-big')),
    h('span', { class: 'bk-card-text' },
      h('span', { class: 'bk-card-title', text: info.title }),
      h('span', { class: 'bk-card-sub hand', text: STR.book.challengeBonus })),
  ], () => {
    app.services.sounds('tap');
    app.go.play(app.challenge, { subject });
  });
  if (app.challenge.description) el.title = app.challenge.description;
  return el;
}

function taskCard(app, manifest) {
  const locked = isLocked(manifest); // пройдено в текущем круге — закрыто до конца круга, но яркое, с печатью
  const el = button(locked ? 'paper-card bk-card done' : 'paper-card bk-card', [
    h('i', { class: 'tape', 'aria-hidden': 'true' }),
    h('span', { class: 'bk-icon' }, svgEl(blob(), 'bk-blob'), h('span', { class: 'bk-glyph' }, glyphOrIcon(manifest))),
    h('span', { class: 'bk-card-text' },
      h('span', { class: 'bk-card-title', text: manifest.title }),
      stars(moduleStars(manifest.id))),
    locked ? h('span', { class: 'stamp', title: STR.menu.done, text: STR.book.stamp }) : null,
  ], locked ? null : () => {
    app.services.sounds('tap');
    app.go.play(manifest);
  });
  if (locked) el.disabled = true;
  if (manifest.description) el.title = manifest.description;
  return el;
}
