// Правда или нет (русский): читаем утверждение и отвечаем «Правда» / «Неправда».
// Банк строится кодом из знаний (knowledge.js) и русского словаря (data.js); задания выбирает chooser.js так,
// чтобы одно и то же утверждение почти не повторялось. Весь движок — game.js (общий с немецким модулем).

import { TEXT } from './texts.js';
import { BANK } from './data.js';
import { runGame } from './game.js';

export function start(ctx) {
  const stop = runGame(ctx, { TEXT, bank: BANK, lang: 'ru', ns: 'rtf' });
  return () => {
    stop();
  };
}
