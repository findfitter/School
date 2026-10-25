// Экран для родителя (без защиты): статистика, модули, настройки, данные.

import { h, onTap, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { moduleIcon } from '../registry.js';

const P = STR.parent;

export function renderParent(app) {
  const screen = h('div', { class: 'screen parent-screen' });
  const status = h('p', { class: 'status', 'aria-live': 'polite' });

  const body = h('main', { class: 'scroll content parent-body' },
    statsCard(app),
    modulesCard(app),
    settingsCard(app),
    dataCard(app, screen, status));

  screen.append(
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => app.go.menu()),
      h('h1', { text: P.title }),
      h('div', { class: 'chip' }, format(P.totalStars, { stars: storage.stars(), supers: storage.supers() }))),
    body);
  return screen;
}

function card(title, ...children) {
  return h('section', { class: 'card' }, h('h2', { text: title }), children);
}

function statsCard(app) {
  const head = P.statsHead;
  const rows = app.manifests.map((m) => {
    const p = storage.moduleProgress(m.id);
    const accuracy = p.total ? `${Math.round((p.correct / p.total) * 100)}%` : P.statsNone;
    const hard = Object.values(p.hard)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((item) => item.label)
      .join(',  ');
    return h('tr', {},
      h('td', {}, h('span', { class: 'mini-icon' }, moduleIcon(m)), m.title),
      h('td', { text: p.series }),
      h('td', { text: accuracy }),
      h('td', { text: hard || P.statsNone }));
  });
  return card(P.statsTitle,
    h('table', { class: 'stats' },
      h('thead', {}, h('tr', {},
        h('th', { text: head.module }), h('th', { text: head.series }),
        h('th', { text: head.accuracy }), h('th', { text: head.hard }))),
      h('tbody', {}, rows)));
}

function modulesCard(app) {
  const disabled = new Set(storage.settings().disabledModules);
  const rows = app.manifests.map((m) => {
    const sw = h('button', { class: 'switch', type: 'button', role: 'switch' });
    const paint = () => {
      const on = !disabled.has(m.id);
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-checked', String(on));
      sw.textContent = on ? P.on : P.off;
    };
    onTap(sw, () => {
      if (disabled.has(m.id)) disabled.delete(m.id);
      else disabled.add(m.id);
      storage.setSettings({ disabledModules: [...disabled] });
      paint();
    });
    paint();
    return h('div', { class: 'row-between' },
      h('div', { class: 'module-name' }, h('span', { class: 'mini-icon' }, moduleIcon(m)), m.title),
      sw);
  });
  return card(P.modulesTitle, rows);
}

function settingsCard(app) {
  const s = storage.settings();

  const lengthValue = h('output', { class: 'value', text: s.seriesLength });
  const step = (delta) => () => {
    const next = Math.min(30, Math.max(3, storage.settings().seriesLength + delta));
    storage.setSettings({ seriesLength: next });
    lengthValue.textContent = next;
  };

  const volumeValue = h('output', { class: 'value', text: `${Math.round(s.volume * 100)}%` });
  const volume = h('input', {
    type: 'range', min: 0, max: 100, step: 5, value: Math.round(s.volume * 100),
    onInput: (e) => {
      storage.setSettings({ volume: e.target.value / 100 });
      volumeValue.textContent = `${e.target.value}%`;
    },
  });

  const rateValue = h('output', { class: 'value', text: `×${s.speechRate.toFixed(2)}` });
  const rate = h('input', {
    type: 'range', min: 0.5, max: 1.3, step: 0.05, value: s.speechRate,
    onInput: (e) => {
      const v = Number(e.target.value);
      storage.setSettings({ speechRate: v });
      rateValue.textContent = `×${v.toFixed(2)}`;
    },
  });

  return card(P.settingsTitle,
    h('div', { class: 'row-between' },
      h('span', { text: P.seriesLength }),
      h('div', { class: 'stepper' },
        button('btn round', '−', step(-1)), lengthValue, button('btn round', '+', step(1)))),
    h('div', { class: 'row-between' }, h('span', { text: P.volume }), volume, volumeValue),
    // Настройки голоса показываются только когда озвучка включена (core/config.js).
    app.services.voice && h('div', { class: 'row-between' }, h('span', { text: P.speechRate }), rate, rateValue),
    app.services.voice && voiceRow(app, 'ru', P.voiceRu, P.speechSampleRu),
    app.services.voice && voiceRow(app, 'de', P.voiceDe, P.speechSampleDe));
}

// Выбор голоса для языка: все голоса браузера, включая онлайн-голоса (Google и др.).
function voiceRow(app, lang, title, sample) {
  const select = h('select', { class: 'voice-select', disabled: true },
    h('option', { value: '', text: P.voiceAuto }));
  app.services.speech.listVoices(lang).then((voices) => {
    const current = storage.settings().voices[lang];
    for (const v of voices) {
      select.append(h('option', {
        value: v.name,
        selected: v.name === current,
        text: v.local ? v.name : `${v.name} ${P.voiceOnline}`,
      }));
    }
    if (!voices.length) select.firstChild.textContent = P.voiceNone;
    select.disabled = false;
  });
  select.addEventListener('change', () => {
    const voices = { ...storage.settings().voices, [lang]: select.value };
    storage.setSettings({ voices });
  });
  return h('div', { class: 'row-between' },
    h('span', { text: title }),
    select,
    button('btn', `🔊 ${P.speechTest}`, () => app.services.speech.speak(sample, lang)));
}

function dataCard(app, screen, status) {
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        storage.importJson(await file.text());
        app.go.parent();
      } catch (err) {
        console.warn(err);
        status.textContent = P.importFail;
      }
    },
  });

  const exportData = () => {
    const blob = new Blob([storage.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: `school-progress-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetData = async () => {
    if (!(await confirmDialog(screen, P.resetConfirm, P.resetYes))) return;
    storage.reset();
    app.go.parent();
  };

  return card(P.dataTitle,
    h('div', { class: 'row-wrap' },
      button('btn', `💾 ${P.export}`, exportData),
      button('btn', `📂 ${P.import}`, () => fileInput.click()),
      button('btn danger', `🗑 ${P.reset}`, resetData)),
    fileInput,
    status);
}

function confirmDialog(screen, text, yesLabel) {
  return new Promise((resolve) => {
    const close = (answer) => {
      overlay.remove();
      resolve(answer);
    };
    const overlay = h('div', { class: 'overlay' },
      h('div', { class: 'dialog' },
        h('p', { text }),
        h('div', { class: 'row' },
          button('btn', STR.common.cancel, () => close(false)),
          button('btn danger', yesLabel, () => close(true)))));
    screen.append(overlay);
  });
}
