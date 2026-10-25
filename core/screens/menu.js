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
        h('div', { class: 'tiles' }, groups.get(subject).map((m) => tile(app, m))))
    );

  return h('div', { class: 'screen menu-screen' },
    h('header', { class: 'bar' },
      h('h1', { text: STR.appTitle }),
      h('div', { class: 'bar-actions' },
        h('div', { class: 'chip' }, `⭐ ${storage.stars()}`),
        button('btn', `🎁 ${STR.menu.stickers}`, () => app.go.stickers()),
        button('btn quiet', `⚙️ ${STR.menu.parent}`, () => app.go.parent()))),
    h('main', { class: 'scroll content' },
      sections.length ? sections : h('p', { class: 'empty', text: STR.menu.empty }))
  );
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
