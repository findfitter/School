// Сложные задания: за каждые 25 заработанных звёзд в случайном разделе появляется сложное задание
// (модуль modules/challenge: короткий текст и один вопрос). В разделе одновременно висит не больше одного.
// Пройденное задание исчезает, ребёнок получает косточку 🦴 (на неё покупают собаку, core/screens/dog.js).
// Первые три задания появляются сразу, чтобы ребёнок мог собрать косточки на первую собаку.
// Звёзды, заработанные до появления этой возможности, не учитываются.

import * as storage from './storage.js';

export const STARS_PER_CHALLENGE = 25;
export const INITIAL_CHALLENGES = 3;

// Разделы, где можно поставить задание: у модуля есть такой раздел, и родитель выключил не все его модули.
function availableSubjects(app) {
  const subjects = Object.keys(app.challenge?.challenge?.subjects || {});
  const off = new Set(storage.settings().disabledModules);
  return subjects.filter((subject) => app.manifests.some((m) => m.subject === subject && !off.has(m.id)));
}

// Выдаёт ждущие задания (первые три и новые за каждые 25 звёзд). Возвращает разделы, где появились новые.
// Если свободных разделов нет, задание ждёт (owed) и появится, когда раздел освободится.
export function syncChallenges(app) {
  if (!app.challenge) return [];
  const state = storage.challenges();
  const milestone = Math.floor(storage.stars() / STARS_PER_CHALLENGE);
  if (!state.ready) {
    state.ready = true;
    state.milestone = milestone; // старые звёзды не считаются
    state.owed = INITIAL_CHALLENGES;
  } else if (milestone > state.milestone) {
    state.owed += milestone - state.milestone;
    state.milestone = milestone;
  }
  const free = availableSubjects(app).filter((subject) => !state.pending[subject]);
  const granted = [];
  while (state.owed > 0 && free.length) {
    const subject = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    state.pending[subject] = { seed: Math.floor(Math.random() * 1e9) };
    state.owed -= 1;
    granted.push(subject);
  }
  storage.setChallenges(state);
  return granted;
}

export const isPending = (subject) => Boolean(storage.challenges().pending[subject]);

// Что передать модулю: раздел, зерно (чтобы после выхода из задания текст остался тем же) и уже пройденные тексты.
export function challengeInfo(app, subject) {
  const state = storage.challenges();
  const pending = state.pending[subject];
  const info = app.challenge?.challenge?.subjects?.[subject];
  if (!pending || !info) return null;
  return { subject, seed: pending.seed, used: state.used[subject] || [], voice: Boolean(info.voice) };
}

// Задание пройдено: убираем его, запоминаем текст, даём косточку и выдаём ждущие задания.
// Возвращает { bones, granted }.
export function completeChallenge(app, subject, challengeId) {
  const state = storage.challenges();
  if (!state.pending[subject]) return { bones: storage.bonesBalance(), granted: [] };
  delete state.pending[subject];
  if (challengeId) state.used[subject] = [...(state.used[subject] || []), challengeId].slice(-100);
  storage.setChallenges(state);
  storage.addBones(1);
  const granted = syncChallenges(app);
  return { bones: storage.bonesBalance(), granted };
}
