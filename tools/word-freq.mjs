// Частота слов в банках предложений («Собери предложение», «Длинные предложения»; русский и немецкий).
// Запуск: node tools/word-freq.mjs [сколько слов показать]
// Считает, в какой доле предложений встречается каждое слово. Служебные слова (предлоги, «и», артикли)
// отдельно: они есть почти везде и ребёнок их всё равно знает. Если какое-то «настоящее» слово
// стоит больше чем в MAX_SHARE предложений — банк перекошен, и ребёнок будет узнавать это слово по привычке.
// Те же пороги проверяет tools/check.mjs.

import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const BANKS = [
  { id: 'reading-sentences', lang: 'ru', function: ['и', 'на', 'в', 'во', 'по', 'под', 'за', 'у', 'из', 'к', 'с', 'для', 'до', 'над', 'а', 'но', 'потому', 'что', 'чем', 'очень', 'где', 'кто', 'куда', 'почему', 'сколько', 'когда', 'какая', 'какой', 'какого', 'сначала', 'потом', 'перед', 'после'] },
  { id: 'reading-long', lang: 'ru', function: ['и', 'на', 'в', 'во', 'по', 'под', 'за', 'у', 'из', 'к', 'с', 'для', 'до', 'над', 'а', 'но', 'потому', 'что', 'чем', 'очень', 'где', 'кто', 'куда', 'почему', 'сколько', 'когда', 'какая', 'какой', 'какого', 'сначала', 'потом', 'перед', 'после'] },
  { id: 'reading-sentences-de', lang: 'de', function: ['und', 'im', 'am', 'in', 'auf', 'an', 'unter', 'mit', 'der', 'die', 'das', 'dem', 'den', 'ein', 'eine', 'einen', 'zur', 'zum', 'ist', 'sind', 'hat', 'aber', 'denn', 'weil', 'als', 'wo', 'wer', 'was', 'wie', 'wann', 'warum', 'wohin', 'dann', 'zuerst', 'vor', 'nach'] },
  { id: 'reading-long-de', lang: 'de', function: ['und', 'im', 'am', 'in', 'auf', 'an', 'unter', 'mit', 'der', 'die', 'das', 'dem', 'den', 'ein', 'eine', 'einen', 'zur', 'zum', 'ist', 'sind', 'hat', 'aber', 'denn', 'weil', 'als', 'wo', 'wer', 'was', 'wie', 'wann', 'warum', 'wohin', 'dann', 'zuerst', 'vor', 'nach'] },
];

export const MAX_SHARE = 0.10; // самое частое «настоящее» слово — не больше 10% предложений банка (ориентир — до 8%; check.mjs ругается выше 10%)

export async function loadBank(bank) {
  const mod = await import(pathToFileURL(`${ROOT}/modules/${bank.id}/data.js`).href);
  return mod.SENTENCES;
}

export function frequency(sentences, functionWords) {
  const skip = new Set(functionWords);
  const counts = new Map();
  for (const s of sentences) {
    const seen = new Set(s.words.map((w) => w.toLowerCase().replace(/[,.!?;:]+$/, '')));
    for (const w of seen) counts.set(w, (counts.get(w) || 0) + 1);
  }
  const rows = [...counts].map(([word, n]) => ({ word, n, share: n / sentences.length, function: skip.has(word) }));
  rows.sort((a, b) => b.n - a.n);
  return rows;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const top = Number(process.argv[2]) || 14;
  for (const bank of BANKS) {
    const sentences = await loadBank(bank);
    const rows = frequency(sentences, bank.function);
    const kinds = {};
    for (const s of sentences) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    const content = rows.filter((r) => !r.function);
    console.log(`\n== ${bank.id} (${bank.lang}): предложений ${sentences.length}, разных слов ${rows.length} ==`);
    console.log('по видам:', Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '));
    console.log('служебные:', rows.filter((r) => r.function).slice(0, 6).map((r) => `${r.word} ${(r.share * 100).toFixed(0)}%`).join(', '));
    console.log('самые частые слова:');
    for (const r of content.slice(0, top)) console.log(`  ${r.word.padEnd(14)} ${String(r.n).padStart(4)}  ${(r.share * 100).toFixed(1)}%`);
    const rare = content.filter((r) => r.n <= 2).length;
    console.log(`слов, которые встречаются не больше 2 раз: ${rare} из ${content.length}`);
  }
}
