import { h, button } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { moduleIcon } from '../registry.js';
import { isLocked } from '../cycles.js';

export function renderMenu(app) {
  const disabled = new Set(storage.settings().disabledModules);
  const groups = new Map();
  for (const m of app.manifests) {
    if (disabled.has(m.id)) continue;
    const subject = STR.subjects[m.subject] ? m.subject : 'other';
    if (!groups.has(subject)) groups.set(subject, []);
    groups.get(subject).push(m);
  }

  const sections = [...STR.subjectOrder, 'other']
    .filter((subject) => groups.has(subject))
    .map((subject) =>
      h('section', { class: 'subject' },
        h('h2', {},
          h('span', { class: 'subject-icon', text: STR.subjects[subject].icon }),
          STR.subjects[subject].title),
        h('div', { class: 'tiles' }, [challengeTile(app, subject), ...groups.get(subject).map((m) => tile(app, m))]))
    );

  return h('div', { class: 'screen menu-screen' },
    h('header', { class: 'bar' },
      h('h1', { text: STR.appTitle }),
      h('div', { class: 'bar-actions' },
        h('div', { class: 'chip' }, `⭐ ${storage.balance()}`),
        button('btn', `🎁 ${STR.menu.stickers}`, () => app.go.stickers()),
        button('btn quiet', `⚙️ ${STR.menu.parent}`, () => app.go.parent()),
        dogButton(app))),
    h('main', { class: 'scroll content' },
      sections.length ? sections : h('p', { class: 'empty', text: STR.menu.empty }))
  );
}

// Значок собаки справа вверху: открывает раздел собаки, рядом — сколько косточек на счету.
function dogButton(app) {
  const el = button('btn dog-btn', [h('span', { text: '🐶' }), h('small', { text: `🦴 ${storage.bonesBalance()}` })], () => {
    app.services.sounds('tap');
    app.go.dog();
  });
  el.setAttribute('aria-label', STR.menu.dog);
  el.title = STR.menu.dog;
  return el;
}

// Сложное задание раздела: особая плитка с косточкой, пока задание не пройдено (core/challenges.js).
function challengeTile(app, subject) {
  const info = app.challenge?.challenge?.subjects?.[subject];
  if (!info || !storage.challenges().pending[subject]) return null;
  const el = button('tile challenge', [
    h('span', { class: 'tile-icon' }, h('span', { class: 'icon-emoji', text: info.icon })),
    h('span', { class: 'tile-title', text: info.title }),
    h('span', { class: 'tile-bone', text: '🦴' }),
  ], () => {
    app.services.sounds('tap');
    app.go.play(app.challenge, { subject });
  });
  if (app.challenge.description) el.title = app.challenge.description;
  return el;
}

function tile(app, manifest) {
  const locked = isLocked(manifest); // пройдено в текущем круге — закрыто до конца круга
  const el = button(locked ? 'tile done' : 'tile', [
    h('span', { class: 'tile-icon' }, moduleIcon(manifest)),
    h('span', { class: 'tile-title', text: manifest.title }),
    locked ? h('span', { class: 'tile-check', text: '✓', title: STR.menu.done }) : null,
  ], locked ? null : () => {
    app.services.sounds('tap');
    app.go.play(manifest);
  });
  if (locked) el.disabled = true;
  if (manifest.description) el.title = manifest.description;
  return el;
}
