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
  return { correct, total, mistakes };
}

export function createContext({ container, manifest, services, onFinish, challenge = null }) {
  const s = storage.settings();
  // озвучка: везде, только в этом модуле или только в сложном задании этого раздела (английский)
  const voice = VOICE_ENABLED || Boolean(manifest.voice) || Boolean(challenge?.voice);
  const hard = storage.hardToPractice(manifest.id);
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
    challenge: challenge ? Object.freeze({ ...challenge, used: Object.freeze([...(challenge.used || [])]) }) : null,
    finish(result) {
      if (finished) return;
      finished = true;
      onFinish({ ...cleanResult(result), offered: hard, challengeId: typeof result?.challengeId === 'string' ? result.challengeId : null });
    },
  });
}
