// Экран для родителя (вход через проверку для взрослых, см. gate.js). Разбит на вкладки, чтобы не показывать всё сразу:
// «Сегодня» (время и уборка на сегодня), «Успехи» (статистика и слова), «Время» (время в приложении, лимит), «Уборка»
// (настройки миссии и история), «Настройки», «Данные» (сохранение, отчёт, сброс) и «Тестировщик» (инструменты проверки).
// Выбранная вкладка помнится на время работы приложения (storage.uiState), поэтому перерисовка экрана после кнопок её не сбрасывает.

import { h, onTap, button, format } from '../dom.js';
import { STR } from '../strings.js';
import * as storage from '../storage.js';
import { moduleIcon } from '../registry.js';
import { buildReport, reportFileName, hasData } from '../report.js';
import { createSheet } from './book.js';
import { missionPending, confirmDone, skipToday, currentStreak } from '../mission.js';
import { birthdayDate } from '../birthday-data.js';

const P = STR.parent;

// Вкладки: id, что на ней лежит. Карточки собираются при открытии вкладки (тогда же читаются свежие данные).
const TABS = [
  { id: 'today', build: ({ app }) => [todayCard(app), missionTodayCard(app)] },
  { id: 'progress', build: ({ app }) => [statsCard(app), wordsCard()] },
  { id: 'time', build: () => [usageCard()] },
  { id: 'mission', build: ({ app }) => [missionSettingsCard(app)] },
  { id: 'settings', build: ({ app }) => [modulesCard(app), settingsCard(app), birthdayCard()] },
  { id: 'data', build: ({ app, screen, status }) => [dataCard(app, screen, status)] },
  { id: 'tester', build: ({ app }) => testerCards(app) },
];

export function renderParent(app) {
  // Для родителя — та же бумага, но строже и мельче: одна страница с прокруткой внутри (createSheet).
  const screen = createSheet({ className: 'parent-screen service-sheet' }).el;
  const status = h('p', { class: 'status', 'aria-live': 'polite' });
  const ctx = { app, screen, status };

  const saved = storage.uiState('parent-tab');
  let current = TABS.some((t) => t.id === saved) ? saved : TABS[0].id;

  const body = h('main', { class: 'scroll content parent-body', role: 'tabpanel' });
  const buttons = TABS.map((t) => {
    const b = h('button', { class: `parent-tab${t.id === 'tester' ? ' tester' : ''}`, type: 'button', role: 'tab' }, P.tabs[t.id]);
    onTap(b, () => select(t.id));
    return b;
  });

  function select(id) {
    current = id;
    storage.setUiState('parent-tab', id);
    status.textContent = '';
    TABS.forEach((t, i) => {
      buttons[i].classList.toggle('on', t.id === id);
      buttons[i].setAttribute('aria-selected', String(t.id === id));
    });
    body.replaceChildren(...TABS.find((t) => t.id === id).build(ctx).filter(Boolean));
    body.scrollTop = 0;
  }

  screen.append(
    h('header', { class: 'bar' },
      button('btn', `⬅ ${STR.common.back}`, () => app.go.menu()),
      h('h1', { text: P.title }),
      h('div', { class: 'chip' }, format(P.totalStars, { stars: storage.stars(), balance: storage.balance(), supers: storage.supers() }))),
    h('nav', { class: 'parent-tabs', role: 'tablist' }, buttons),
    body);
  select(current);
  return screen;
}

function card(title, ...children) {
  return h('section', { class: 'card' }, h('h2', { text: title }), children);
}

// Слова, которые ребёнок знает (учёт в ядре: storage.wordSummary).
function wordsCard() {
  const rows = Object.entries(P.vocabSets).map(([ns, name]) => {
    const s = storage.wordSummary(ns);
    if (!s.seen) return null;
    const fresh = s.total ? Math.max(0, s.total - s.seen) : P.statsNone;
    return h('p', {}, h('strong', { text: `${name}: ` }), format(P.vocabLine, { known: s.known, due: s.due, learning: s.learning, fresh }));
  }).filter(Boolean);
  return card(P.vocabTitle,
    h('p', { class: 'hint-line', text: P.vocabHint }),
    rows.length ? rows : h('p', { class: 'status', text: P.vocabNone }));
}

// ---------- Уборка комнаты (ежедневная миссия, core/mission.js) ----------
const MISSION_MIN = 3;
const MISSION_MAX = 15;
const zoneName = (id) => (STR.mission.zones[id] || '').toLowerCase();
const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

// Что с миссией сегодня: текст статуса и можно ли ещё её закрыть (пропустить / подтвердить).
function missionStatus() {
  const m = storage.mission();
  const pending = missionPending();
  const entry = m.history[storage.dayKey()];
  const key = pending ? m.phase
    : m.phase === 'done' ? (entry?.zone ? 'done' : 'doneNoZone')
      : m.phase === 'skipped' ? (entry?.paid ? 'skippedPaid' : 'skipped') : 'off';
  return { m, pending, text: format(P.missionStatus[key], { zone: zoneName(m.zone), time: clock(entry?.sec ?? 0), paid: entry?.paid ?? 0 }) };
}

// Вкладка «Сегодня»: статус уборки и кнопки, пока она не закрыта.
function missionTodayCard(app) {
  const { pending, text } = missionStatus();
  const streak = currentStreak();
  return card(P.missionTodayTitle,
    h('p', { class: 'status' }, h('strong', { text: P.missionToday }), text),
    pending ? h('div', { class: 'row-wrap' },
      button('btn primary', `✓ ${P.missionConfirm}`, () => { confirmDone(); app.go.parent(); }),
      button('btn', P.missionSkip, () => { skipToday(); app.go.parent(); })) : null,
    streak ? h('p', { class: 'status', text: format(P.missionStreak, { n: streak }) }) : null);
}

// Вкладка «Уборка»: включение, длительность, дни недели, история.
function missionSettingsCard() {
  const cfg = () => storage.settings().mission;

  const sw = h('button', { class: 'switch', type: 'button', role: 'switch' });
  const paintSwitch = () => {
    const on = cfg().enabled;
    sw.classList.toggle('on', on);
    sw.setAttribute('aria-checked', String(on));
    sw.textContent = on ? P.on : P.off;
  };
  onTap(sw, () => {
    storage.setSettings({ mission: { enabled: !cfg().enabled } });
    paintSwitch();
  });
  paintSwitch();

  const minutes = h('output', { class: 'value wide', text: `${cfg().minutes} ${P.missionMinutesUnit}` });
  const stepMinutes = (delta) => () => {
    const next = Math.min(MISSION_MAX, Math.max(MISSION_MIN, cfg().minutes + delta));
    storage.setSettings({ mission: { minutes: next } });
    minutes.textContent = `${next} ${P.missionMinutesUnit}`;
  };

  const chips = P.dayShort.map((name, i) => {
    const day = i + 1;
    const chip = h('button', { class: 'chip-day', type: 'button', role: 'switch' }, name);
    const paint = () => {
      const on = cfg().days.includes(day);
      chip.classList.toggle('on', on);
      chip.setAttribute('aria-checked', String(on));
    };
    onTap(chip, () => {
      const days = new Set(cfg().days);
      if (days.has(day)) days.delete(day);
      else days.add(day);
      storage.setSettings({ mission: { days: [...days] } });
      paint();
    });
    paint();
    return chip;
  });

  const m = storage.mission();
  const history = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const e = m.history[storage.dayKey(date)];
    const label = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    const text = !e ? P.usageNone
      : e.result === 'skipped' ? (e.paid ? format(P.missionHistoryPaid, { paid: e.paid }) : P.missionHistorySkipped)
        : `${P.missionHistoryDone}${e.zone ? `, ${zoneName(e.zone)}` : ''}, ${clock(e.sec)}${e.extra ? format(P.missionHistoryExtra, { n: e.extra }) : ''}`;
    return h('div', { class: `mission-day${e ? ` ${e.result}` : ''}` }, h('span', { class: 'usage-date', text: label }), h('span', { text }));
  });

  return card(P.missionTitle,
    h('p', { class: 'hint-line', text: P.missionHint }),
    h('div', { class: 'row-between' }, h('span', { text: P.missionOn }), sw),
    h('div', { class: 'row-between' },
      h('span', { text: P.missionMinutes }),
      h('div', { class: 'stepper' }, button('btn round', '−', stepMinutes(-1)), minutes, button('btn round', '+', stepMinutes(1)))),
    h('div', { class: 'row-between' }, h('span', { text: P.missionDays }), h('div', { class: 'chips-days' }, chips)),
    h('h3', { class: 'usage-days-title', text: P.missionHistory }),
    h('div', { class: 'mission-days' }, history));
}

// ---------- День рождения ребёнка (core/birthday.js) ----------
// Включение, имя, день, месяц и год рождения (по году считается возраст на торте); ближайшее поздравление.
function birthdayCard() {
  const cfg = () => storage.settings().birthday;
  const set = (patch) => { storage.setSettings({ birthday: patch }); paint(); };

  const sw = h('button', { class: 'switch', type: 'button', role: 'switch' });
  const name = h('input', {
    type: 'text', maxLength: 20, value: cfg().name, class: 'text-input', 'aria-label': P.birthdayName,
    onInput: (e) => { storage.setSettings({ birthday: { name: e.target.value } }); }, // имя пишем сразу, без перерисовки (курсор не прыгает)
  });
  const dayOut = h('output', { class: 'value' });
  const monthOut = h('output', { class: 'value wide' });
  const yearOut = h('output', { class: 'value wide' });
  const next = h('p', { class: 'status' });

  const stepper = (out, onStep) => h('div', { class: 'stepper' }, button('btn round', '−', () => onStep(-1)), out, button('btn round', '+', () => onStep(1)));
  const wrap = (value, min, max) => (value < min ? max : value > max ? min : value);

  function paint() {
    const c = cfg();
    sw.classList.toggle('on', c.enabled);
    sw.setAttribute('aria-checked', String(c.enabled));
    sw.textContent = c.enabled ? P.on : P.off;
    dayOut.textContent = c.day;
    monthOut.textContent = P.months[c.month - 1];
    yearOut.textContent = c.year;
    const now = new Date();
    let date = birthdayDate(now.getFullYear(), c);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date < today) date = birthdayDate(now.getFullYear() + 1, c);
    const done = storage.birthdayDoneYear() === date.getFullYear();
    next.textContent = !c.enabled ? P.birthdayOff
      : `${format(P.birthdayNext, { date: `${date.getDate()} ${P.months[date.getMonth()]} ${date.getFullYear()}`, age: Math.max(1, date.getFullYear() - c.year) })}${done ? ` ${P.birthdayDone}` : ''}`;
  }
  onTap(sw, () => set({ enabled: !cfg().enabled }));
  paint();

  return card(P.birthdayTitle,
    h('p', { class: 'hint-line', text: P.birthdayHint }),
    h('div', { class: 'row-between' }, h('span', { text: P.birthdayOn }), sw),
    h('div', { class: 'row-between' }, h('span', { text: P.birthdayName }), name),
    h('div', { class: 'row-between' }, h('span', { text: P.birthdayDay }), stepper(dayOut, (d) => set({ day: wrap(cfg().day + d, 1, 31) }))),
    h('div', { class: 'row-between' }, h('span', { text: P.birthdayMonth }), stepper(monthOut, (d) => set({ month: wrap(cfg().month + d, 1, 12) }))),
    h('div', { class: 'row-between' }, h('span', { text: P.birthdayYear }), stepper(yearOut, (d) => set({ year: Math.min(new Date().getFullYear(), Math.max(1990, cfg().year + d)) }))),
    next);
}

// ---------- Вкладка «Тестировщик» ----------
// Всё, что нужно для проверки новых возможностей, в одном месте. Блок «Рабочие данные» меняет данные ребёнка по-настоящему.
function testerCards(app) {
  const refresh = () => app.go.parent();
  const { text } = missionStatus();
  const bones = storage.bonesBalance();
  return [
    card(P.testerMissionTitle,
      h('p', { class: 'status' }, h('strong', { text: P.missionToday }), text),
      h('div', { class: 'row-wrap' }, button('btn primary', `🧪 ${P.missionTest}`, () => app.go.missionTest())),
      h('p', { class: 'hint-line', text: P.missionTestHint }),
      h('div', { class: 'row-wrap' }, button('btn', `↺ ${P.testerReopen}`, () => { storage.reopenMission(); refresh(); })),
      h('p', { class: 'hint-line', text: P.testerReopenHint })),
    card(P.testerBirthdayTitle,
      h('div', { class: 'row-wrap' }, button('btn primary', `🎂 ${P.birthdayTest}`, () => app.go.birthdayTest())),
      h('p', { class: 'hint-line', text: P.birthdayTestHint }),
      h('div', { class: 'row-wrap' }, button('btn', `↺ ${P.birthdayReopen}`, () => { storage.reopenBirthday(); refresh(); })),
      h('p', { class: 'hint-line', text: P.birthdayReopenHint })),
    card(P.testerWorkTitle,
      h('p', { class: 'hint-line', text: P.testerWorkHint }),
      h('p', { class: 'status', text: format(P.testerWorkNow, { stars: storage.balance(), bones }) }),
      h('div', { class: 'row-wrap' },
        button('btn', `+100 ⭐`, () => { storage.addStars(100); refresh(); }),
        button('btn', `+1 🦴`, () => { storage.addBones(1); refresh(); }))),
    card(P.dogTestTitle,
      h('p', { class: 'hint-line', text: P.dogTestHint }),
      button('btn primary', `🧪 ${P.dogTestOpen}`, () => app.go.dogTest())),
  ];
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
  if (!limit) {
    return card(P.todayTitle, h('p', { class: 'status', text: format(P.todayNoLimit, { used: formatTime(storage.usageOn()), mission: formatTime(storage.missionUsageOn()) }) }));
  }
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

  // Время на экранах миссии «Уборка комнаты» считается отдельно и в дневной лимит не входит.
  const missionDays = storage.missionUsageDays(30);
  const missionTotal = (count) => missionDays.slice(0, count).reduce((sum, d) => sum + d.seconds, 0);

  return card(P.usageTitle,
    h('div', { class: 'usage-stats' },
      stat(P.usageToday, total(1)),
      stat(P.usageWeek, total(7), average(total(7), 7)),
      stat(P.usageMonth, total(30), average(total(30), 30))),
    h('p', { class: 'status', text: format(P.missionUsage, { today: formatTime(missionTotal(1)), week: formatTime(missionTotal(7)), month: formatTime(missionTotal(30)) }) }),
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

  // Отчёт для анализа (core/report.js): markdown-файл, который можно отдать Claude Code.
  const saveReport = () => {
    if (!hasData()) {
      status.textContent = P.reportEmpty;
      return;
    }
    const blob = new Blob([buildReport(app)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: reportFileName() });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = P.reportSaved;
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
      button('btn', `📋 ${P.reportButton}`, saveReport),
      button('btn danger', `🗑 ${P.reset}`, resetData)),
    h('p', { class: 'hint-line', text: P.reportHint }),
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
