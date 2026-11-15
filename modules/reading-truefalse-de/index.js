// Stimmt oder nicht? (Deutsch): Aussage lesen und «Stimmt» / «Stimmt nicht» antworten.
// Die Aussagen entstehen im Code aus dem Wissen (../reading-truefalse/knowledge.js) und dem deutschen Wörterbuch (data.js);
// Auswahl und Spiel — chooser.js und game.js im Ordner des russischen Moduls (gemeinsam genutzt).

import { TEXT } from './texts.js';
import { BANK } from './data.js';
import { runGame } from '../reading-truefalse/game.js';

export function start(ctx) {
  const stop = runGame(ctx, { TEXT, bank: BANK, lang: 'de', ns: 'dtf' });
  return () => {
    stop();
  };
}
