// Wörter für die Sätze. Alle Sätze werden im Code aus diesen Listen nach vier Mustern gebaut:
//   short — «Die Katze schläft»        (3 Wörter: Artikel, Nomen, Verb)
//   act   — «Die Katze trinkt Milch»   (4 Wörter: Artikel, Nomen, Verb, Objekt ohne Artikel)
//   pair  — «Hund und Katze spielen»   (4 Wörter: Nomen und Nomen, Verb im Plural)
//   place — «Der Hund läuft im Wald»   (5 Wörter, nur die höchste Stufe)
// Für jedes Subjekt sind nur sinnvolle Tätigkeiten angegeben, deshalb sind alle Sätze richtig.

// art — Artikel, n — Nomen, e — Bild; short: [Verb, Bild]; act: [Verb, Objekt, Bild]; place: [Verb, Präposition, Ort, Bild]
const SUBJECTS = [
  { art: 'Der', n: 'Hund', e: '🐶', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Fleisch', '🍖']], place: [['läuft', 'im', 'Wald', '🌲'], ['schläft', 'im', 'Haus', '🏠']] },
  { art: 'Die', n: 'Katze', e: '🐱', short: [['schläft', '💤'], ['läuft', '🏃']], act: [['trinkt', 'Milch', '🥛'], ['frisst', 'Fisch', '🐟']], place: [['schläft', 'im', 'Bett', '🛏️'], ['schläft', 'im', 'Haus', '🏠']] },
  { art: 'Die', n: 'Maus', e: '🐭', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Käse', '🧀']], place: [['schläft', 'im', 'Haus', '🏠']] },
  { art: 'Der', n: 'Hase', e: '🐇', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Möhren', '🥕'], ['frisst', 'Äpfel', '🍎']], place: [['läuft', 'im', 'Wald', '🌲']] },
  { art: 'Die', n: 'Kuh', e: '🐄', short: [['schläft', '💤'], ['läuft', '🏃']], act: [['frisst', 'Gras', '🌿'], ['trinkt', 'Wasser', '💧']], place: [] },
  { art: 'Das', n: 'Pferd', e: '🐴', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Äpfel', '🍎'], ['frisst', 'Gras', '🌿']], place: [] },
  { art: 'Der', n: 'Bär', e: '🐻', short: [['schläft', '💤'], ['läuft', '🏃']], act: [['frisst', 'Honig', '🍯'], ['frisst', 'Fisch', '🐟']], place: [['schläft', 'im', 'Wald', '🌲'], ['läuft', 'im', 'Wald', '🌲']] },
  { art: 'Der', n: 'Fuchs', e: '🦊', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Fisch', '🐟']], place: [['läuft', 'im', 'Wald', '🌲']] },
  { art: 'Die', n: 'Ente', e: '🦆', short: [['schwimmt', '🌊'], ['fliegt', '☁️']], act: [['frisst', 'Brot', '🍞']], place: [['schwimmt', 'im', 'Wasser', '🌊'], ['fliegt', 'am', 'Himmel', '☁️']] },
  { art: 'Der', n: 'Vogel', e: '🐦', short: [['fliegt', '☁️'], ['singt', '🎵']], act: [['frisst', 'Körner', '🌾']], place: [['fliegt', 'am', 'Himmel', '☁️']] },
  { art: 'Die', n: 'Eule', e: '🦉', short: [['fliegt', '☁️'], ['schläft', '💤']], act: [['frisst', 'Mäuse', '🐭']], place: [['fliegt', 'am', 'Himmel', '☁️'], ['schläft', 'im', 'Wald', '🌲']] },
  { art: 'Der', n: 'Fisch', e: '🐟', short: [['schwimmt', '🌊']], act: [], place: [['schwimmt', 'im', 'Meer', '🌊'], ['schwimmt', 'im', 'Wasser', '🌊']] },
  { art: 'Der', n: 'Elefant', e: '🐘', short: [['läuft', '🏃']], act: [['trinkt', 'Wasser', '💧'], ['frisst', 'Gras', '🌿']], place: [] },
  { art: 'Der', n: 'Junge', e: '👦', short: [['läuft', '🏃'], ['singt', '🎵'], ['schläft', '💤']], act: [['isst', 'Kuchen', '🍰'], ['trinkt', 'Saft', '🧃'], ['liest', 'Bücher', '📖'], ['malt', 'Häuser', '🏠']], place: [['schläft', 'im', 'Bett', '🛏️'], ['läuft', 'im', 'Wald', '🌲']] },
  { art: 'Das', n: 'Mädchen', e: '👧', short: [['singt', '🎵'], ['läuft', '🏃'], ['schläft', '💤']], act: [['isst', 'Eis', '🍦'], ['trinkt', 'Milch', '🥛'], ['malt', 'Blumen', '🌸'], ['liest', 'Bücher', '📖']], place: [['schläft', 'im', 'Bett', '🛏️'], ['singt', 'im', 'Haus', '🏠']] },
  { art: 'Die', n: 'Frau', e: '👩', short: [['singt', '🎵'], ['läuft', '🏃']], act: [['trinkt', 'Tee', '☕'], ['liest', 'Bücher', '📖']], place: [['schläft', 'im', 'Bett', '🛏️']] },
  { art: 'Der', n: 'Mann', e: '👨', short: [['läuft', '🏃'], ['singt', '🎵']], act: [['trinkt', 'Tee', '☕'], ['isst', 'Brot', '🍞']], place: [['läuft', 'im', 'Wald', '🌲'], ['schläft', 'im', 'Bett', '🛏️']] },
];

// Wer kann im Satz «X und Y …» vorkommen (Namen und Tiere) und was tun sie zusammen.
const PAIR_SUBJECTS = [
  ['Hund', '🐶'], ['Katze', '🐱'], ['Maus', '🐭'], ['Hase', '🐇'], ['Pferd', '🐴'],
  ['Bär', '🐻'], ['Fuchs', '🦊'], ['Anna', '👧'], ['Max', '👦'],
];
const PAIR_VERBS = [['schlafen', '💤'], ['spielen', '⚽'], ['laufen', '🏃']];
const PAIR_EXTRA_VERBS = ['fliegen', 'schwimmen'];

function build() {
  const sentences = [];
  const add = (kind, words, scene, extras) => sentences.push({ key: words.join(' '), kind, words, scene, extras });

  // Zusätzliche Wörter für die höchste Stufe stammen nur aus dem, was das Bild zeigt
  // (wer, was, wo), deshalb passen sie sicher nicht und ergeben keinen zweiten richtigen Satz.
  const nouns = SUBJECTS.map((s) => s.n);
  const shortVerbs = [...new Set(SUBJECTS.flatMap((s) => s.short.map((v) => v[0])))];
  const objects = [...new Set(SUBJECTS.flatMap((s) => s.act.map((a) => a[1])))];
  const places = [...new Set(SUBJECTS.flatMap((s) => s.place.map((p) => p[2])))];

  for (const s of SUBJECTS) {
    for (const [verb, emoji] of s.short) {
      add('short', [s.art, s.n, verb], [s.e, emoji], [...nouns, ...shortVerbs]);
    }
    for (const [verb, obj, emoji] of s.act) {
      add('act', [s.art, s.n, verb, obj], [s.e, emoji], [...nouns, ...objects]);
    }
    for (const [verb, prep, place, emoji] of s.place) {
      add('place', [s.art, s.n, verb, prep, place], [s.e, emoji], [...nouns, ...places]);
    }
  }
  for (const [first, firstEmoji] of PAIR_SUBJECTS) {
    for (const [second, secondEmoji] of PAIR_SUBJECTS) {
      if (first === second) continue;
      for (const [verb, emoji] of PAIR_VERBS) {
        add('pair', [first, 'und', second, verb], [firstEmoji, secondEmoji, emoji],
          [...PAIR_VERBS.map((v) => v[0]), ...PAIR_EXTRA_VERBS]);
      }
    }
  }
  return sentences;
}

export const SENTENCES = build();
