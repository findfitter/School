// Собирает ctx — единственное, что видит модуль.

import * as storage from './storage.js';
import { VOICE_ENABLED } from './config.js';

function cleanResult(result = {}) {
  const total = Math.max(0, Math.round(Number(result.total) || 0));
  const correct = Math.min(total, Math.max(0, Math.round(Number(result.correct) || 0)));
  const mistakes = (Array.isArray(result.mistakes) ? result.mistakes : [])
    .map((m) => (typeof m === 'object' && m ? m : { key: String(m), label: String(m) }))
    .filter((m) => m.key != null)
    .map((m) => ({ key: String(m.key), label: String(m.label ?? m.key) }));
  const level = Number.isFinite(Number(result.level)) ? Math.max(0, Math.round(Number(result.level))) : null;
  return { correct, total, mistakes, level };
}

// Выбор слова с учётом того, что ребёнок уже знает: выученные (и ещё не пора повторять) слова не выпадают,
// новые и непрочные идут чаще. Если все кандидаты выучены — выбирается любой (повторение).
function pickWord(items, keyOf) {
  if (!items.length) return undefined;
  const weights = items.map((item) => storage.wordWeight(keyOf(item)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

export function createContext({ container, manifest, services, onFinish, onTask = () => {}, challenge = null }) {
  const s = storage.settings();
  // озвучка: везде, только в этом модуле или только в сложном задании этого раздела (английский)
  const voice = VOICE_ENABLED || Boolean(manifest.voice) || Boolean(challenge?.voice);
  const hard = storage.hardToPractice(manifest.id);
  // Уровень, на котором закончилась прошлая серия, минус один (разогрев); null — серий ещё не было.
  const savedLevel = storage.moduleProgress(manifest.id).level;
  const startLevel = Number.isFinite(savedLevel) ? Math.max(0, savedLevel - 1) : null;
  let finished = false;
  return Object.freeze({
    container,
    voice,
    speak: (text, lang, key) => services.speech.speak(text, lang, key, voice),
    sound: (name) => services.sounds(name),
    settings: Object.freeze({
      seriesLength: s.seriesLength,
      speechRate: s.speechRate,
      volume: s.volume,
      translation: s.translation,
    }),
    hard: Object.freeze(hard),
    level: startLevel,
    // Учёт слов: pick(items, keyOf) — выбрать слово с учётом выученных; size(ns, n) — сколько слов в банке языка.
    words: Object.freeze({
      pick: pickWord,
      size: (ns, n) => storage.setVocabSize(ns, n),
      status: (key) => storage.wordInfo(key).status,
      // Знакомство со словами: отметить слово прослушанным (ключ вида «enh:cat») и узнать, слушали ли его.
      mark: (key) => storage.recordWord(key, true),
      seen: (key) => storage.wordInfo(key).n > 0,
    }),
    challenge: challenge ? Object.freeze({ ...challenge, used: Object.freeze([...(challenge.used || [])]) }) : null,
    // Задание закончено (первый заход, не повтор в конце серии): { ok — верно с первой попытки, level — уровень сложности }.
    // Нужно только для журнала серий (core/journal.js → отчёт для родителя); время на задание считает ядро.
    task(info) {
      if (finished) return;
      onTask({ ok: Boolean(info?.ok), level: Number.isFinite(info?.level) ? info.level : null });
      if (typeof info?.key === 'string') storage.recordWord(info.key, Boolean(info.ok)); // учёт слова: верно с первой попытки или нет
    },
    finish(result) {
      if (finished) return;
      finished = true;
      onFinish({ ...cleanResult(result), offered: hard, challengeId: typeof result?.challengeId === 'string' ? result.challengeId : null });
    },
  });
}
