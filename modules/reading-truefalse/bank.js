// Сборка банка «Правда или нет» из знаний (knowledge.js) и словаря языка.
//
// Словарь языка (L) умеет одно: render(claim) → { pos: [..], neg: [..] }. `pos` — предложения, которые УТВЕРЖДАЮТ мысль
// («Кошка летает»), `neg` — предложения, которые её ОТРИЦАЮТ («Кошка не летает»; для сравнений — обратное «Мышь больше слона»).
// Каждое предложение — { t: текст, n: есть ли в нём слово «не» / «nicht» / «kein» }.
// Если мысль верна — верны `pos`, неверны `neg`; если неверна — наоборот. Так у каждого факта есть и верные, и
// неверные формулировки, и ответ нельзя угадать по теме: «правда» или «неправда» решается при выборе задания.
//
// Факт банка: { id, cat, subj, pic, t: [формы верного утверждения], f: [формы неверного], fix: [«как правильно»] }.

import { claims } from './knowledge.js';

export function buildBank(L) {
  const out = [];
  for (const c of claims()) {
    const r = L.render(c);
    const [t, f] = c.value ? [r.pos, r.neg] : [r.neg, r.pos];
    const fix = c.fix ? L.render(c.fix).pos.map((x) => x.t) : [];
    out.push({ id: c.id, cat: c.cat, subj: c.subj, pic: c.pic, t, f, fix });
  }
  return out;
}

// Помощники для словарей: форма без отрицания и с ним.
export const P = (t) => ({ t, n: false });
export const N = (t) => ({ t, n: true });
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Слово, которого нет в словаре, — ошибка сразу (а не пустое предложение в задании).
export function need(map, key, what) {
  if (!Object.prototype.hasOwnProperty.call(map, key)) throw new Error(`Нет в словаре (${what}): ${key}`);
  return map[key];
}
