// Экран для родителя (вход через проверку для взрослых, см. gate.js): статистика, время, модули, настройки, данные.

import { h, onTap, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { moduleIcon } from '../registry.js';

const P = STR.parent;

export function renderParent(app) {
  const screen = h('div', { class: 'screen parent-screen' });
  const status = h('p', { class: 'status', 'aria-live': 'polite' });

  const body = h('main', { class: 'scroll content parent-body' },
    todayCard(app),
    dogTestCard(app),
    statsCard(app),
    usageCard(),
    modulesCard(app),
    settingsCard(app),
    dataCard(app, screen, status));

  screen.append(
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => app.go.menu()),
      h('h1', { text: P.title }),
      h('div', { class: 'chip' }, format(P.totalStars, { stars: storage.stars(), balance: storage.balance(), supers: storage.supers() }))),
    body);
  return screen;
}

function card(title, ...children) {
  return h('section', { class: 'card' }, h('h2', { text: title }), children);
}

// Тестовый экран собаки: свои собаки и косточки, рабочие данные ребёнка не затрагиваются.
function dogTestCard(app) {
  return card(P.dogTestTitle,
    h('p', { class: 'hint-line', text: P.dogTestHint }),
    button('btn primary', `🧪 ${P.dogTestOpen}`, () => app.go.dogTest()));
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

// «Время на сегодня»: сколько осталось и быстрые действия, когда лимит исчерпан.
// Работает через дополнительные минуты на сегодня, поэтому статистика времени остаётся точной.
function todayCard(app) {
  const limit = storage.settings().dailyLimit;
  if (!limit) return null;
  const used = storage.usageOn();
  const bonus = storage.bonusOn();
  const total = (limit + bonus) * 60;
  const left = Math.max(0, total - used);

  const act = (minutes) => () => {
    storage.setBonus(minutes);
    app.go.parent(); // перерисовать экран с новыми цифрами
  };
  const unlimited = bonus >= 1440;
  const status = unlimited
    ? format(P.todayUnlimitedStatus, { used: formatTime(used) })
    : format(P.todayStatus, { used: formatTime(used), limit: formatTime(limit * 60) })
      + (bonus ? format(P.todayBonus, { bonus: formatTime(bonus * 60) }) : '');

  return card(P.todayTitle,
    h('p', { class: left ? 'status' : 'status warn', text: unlimited ? status : left ? `${status}. ${format(P.todayLeft, { left: formatTime(left) })}` : `${status}. ${P.todayOver}` }),
    h('div', { class: 'row-wrap' },
      button('btn primary', `⏱ ${P.todayMore}`, act(bonus + 15)),
      button('btn', `↻ ${P.todayRestart}`, act(Math.round(used / 60))),
      button('btn', `∞ ${P.todayUnlimited}`, act(1440))),
    h('p', { class: 'status', text: P.todayNote }));
}

// Сколько времени проведено в приложении: сегодня, неделя, месяц, по дням; дневной лимит.
const LIMIT_OPTIONS = [0, 15, 20, 30, 45, 60, 90, 120, 180]; // минуты, 0 — без ограничения

function formatTime(seconds) {
  const minutes = Math.round(seconds / 60);
  if (seconds > 0 && minutes === 0) return P.usageLessMinute;
  if (minutes === 0) return P.usageNone;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} ${P.usageHour} ${m ? `${m} ${P.usageMinute}` : ''}`.trim() : `${m} ${P.usageMinute}`;
}

function usageCard() {
  const days = storage.usageDays(30);
  const total = (count) => days.slice(0, count).reduce((sum, d) => sum + d.seconds, 0);

  const stat = (title, seconds, note) =>
    h('div', { class: 'usage-stat' },
      h('div', { class: 'usage-stat-title', text: title }),
      h('div', { class: 'usage-stat-value', text: formatTime(seconds) }),
      note ? h('div', { class: 'usage-stat-note', text: note }) : null);
  const average = (seconds, count) => format(P.usageAverage, { time: formatTime(seconds / count) });

  const limitValue = h('output', { class: 'value wide' });
  const paintLimit = () => {
    const minutes = storage.settings().dailyLimit;
    limitValue.textContent = minutes ? formatTime(minutes * 60) : P.usageLimitOff;
  };
  const stepLimit = (direction) => () => {
    const current = storage.settings().dailyLimit;
    // Ближайший пункт списка, затем шаг в нужную сторону.
    let index = LIMIT_OPTIONS.reduce((best, v, i) => (Math.abs(v - current) < Math.abs(LIMIT_OPTIONS[best] - current) ? i : best), 0);
    index = Math.min(LIMIT_OPTIONS.length - 1, Math.max(0, index + direction));
    storage.setSettings({ dailyLimit: LIMIT_OPTIONS[index] });
    paintLimit();
  };
  paintLimit();

  const max = Math.max(1, ...days.map((d) => d.seconds));
  const rows = days.map((d, i) => {
    const date = d.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    const label = i === 0 ? `${date} · ${P.usageDayToday}` : i === 1 ? `${date} · ${P.usageDayYesterday}` : date;
    const fill = h('div', { class: 'usage-bar-fill' });
    fill.style.width = `${(d.seconds / max) * 100}%`;
    return h('div', { class: 'usage-row' },
      h('span', { class: 'usage-date', text: label }),
      h('div', { class: 'usage-bar' }, fill),
      h('span', { class: 'usage-time', text: formatTime(d.seconds) }));
  });

  return card(P.usageTitle,
    h('div', { class: 'usage-stats' },
      stat(P.usageToday, total(1)),
      stat(P.usageWeek, total(7), average(total(7), 7)),
      stat(P.usageMonth, total(30), average(total(30), 30))),
    h('div', { class: 'row-between' },
      h('span', { text: P.usageLimit }),
      h('div', { class: 'stepper' }, button('btn round', '−', stepLimit(-1)), limitValue, button('btn round', '+', stepLimit(1)))),
    h('p', { class: 'status', text: P.usageLimitNote }),
    h('h3', { class: 'usage-days-title', text: P.usageDays }),
    h('div', { class: 'usage-days' }, rows));
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

  const translation = h('button', { class: 'switch', type: 'button', role: 'switch' });
  const paintTranslation = () => {
    const on = storage.settings().translation;
    translation.classList.toggle('on', on);
    translation.setAttribute('aria-checked', String(on));
    translation.textContent = on ? P.on : P.off;
  };
  onTap(translation, () => {
    storage.setSettings({ translation: !storage.settings().translation });
    paintTranslation();
  });
  paintTranslation();

  return card(P.settingsTitle,
    h('div', { class: 'row-between' },
      h('span', { text: P.seriesLength }),
      h('div', { class: 'stepper' },
        button('btn round', '−', step(-1)), lengthValue, button('btn round', '+', step(1)))),
    h('div', { class: 'row-between' }, h('span', { text: P.volume }), volume, volumeValue),
    h('div', { class: 'row-between' }, h('span', { text: P.translation }), translation),
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
    const link = h('a', { href: url, download: `school-progress-${storage.dayKey()}.json` });
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
