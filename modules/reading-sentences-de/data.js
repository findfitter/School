// Wörter für die Sätze. Alle Sätze werden im Code aus diesen Listen nach vier Mustern gebaut:
//   short — «Die Katze schläft»        (3 Wörter: Artikel, Nomen, Verb)
//   act   — «Die Katze trinkt Milch»   (4 Wörter: Artikel, Nomen, Verb, Objekt ohne Artikel)
//   pair  — «Hund und Katze spielen»   (4 Wörter: Nomen und Nomen, Verb im Plural)
//   place — «Der Hund läuft im Wald»   (5 Wörter, nur die höchste Stufe)
// Für jedes Subjekt sind nur sinnvolle Tätigkeiten angegeben, deshalb sind alle Sätze richtig.

// art — Artikel, n — Nomen, e — Bild; short: [Verb, Bild]; act: [Verb, Objekt, Bild]; place: [Verb, Präposition, Ort, Bild]
const SUBJECTS = [
  { art: 'Der', n: 'Hund', e: '🐶', short: [['läuft', '🏃'], ['schläft', '💤'], ['spielt', '⚽']], act: [['frisst', 'Fleisch', '🍖'], ['trinkt', 'Wasser', '💧']], place: [['läuft', 'im', 'Wald', '🌲'], ['schläft', 'im', 'Haus', '🏠'], ['spielt', 'im', 'Garten', '🌳'], ['läuft', 'im', 'Schnee', '❄️']] },
  { art: 'Die', n: 'Katze', e: '🐱', short: [['schläft', '💤'], ['läuft', '🏃'], ['spielt', '⚽']], act: [['trinkt', 'Milch', '🥛'], ['frisst', 'Fisch', '🐟'], ['trinkt', 'Wasser', '💧']], place: [['schläft', 'im', 'Bett', '🛏️'], ['schläft', 'im', 'Haus', '🏠'], ['sitzt', 'im', 'Garten', '🌳'], ['läuft', 'im', 'Gras', '🌿']] },
  { art: 'Die', n: 'Maus', e: '🐭', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Käse', '🧀'], ['frisst', 'Brot', '🍞'], ['frisst', 'Körner', '🌾']], place: [['schläft', 'im', 'Haus', '🏠'], ['läuft', 'im', 'Gras', '🌿']] },
  { art: 'Der', n: 'Hase', e: '🐇', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Möhren', '🥕'], ['frisst', 'Äpfel', '🍎'], ['trinkt', 'Wasser', '💧']], place: [['läuft', 'im', 'Wald', '🌲'], ['sitzt', 'im', 'Gras', '🌿'], ['läuft', 'im', 'Schnee', '❄️']] },
  { art: 'Die', n: 'Kuh', e: '🐄', short: [['schläft', '💤'], ['läuft', '🏃']], act: [['frisst', 'Gras', '🌿'], ['trinkt', 'Wasser', '💧']], place: [['steht', 'im', 'Gras', '🌿']] },
  { art: 'Das', n: 'Pferd', e: '🐴', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Äpfel', '🍎'], ['frisst', 'Gras', '🌿'], ['frisst', 'Möhren', '🥕'], ['trinkt', 'Wasser', '💧']], place: [['läuft', 'im', 'Gras', '🌿'], ['läuft', 'im', 'Wald', '🌲']] },
  { art: 'Der', n: 'Bär', e: '🐻', short: [['schläft', '💤'], ['läuft', '🏃']], act: [['frisst', 'Honig', '🍯'], ['frisst', 'Fisch', '🐟'], ['trinkt', 'Wasser', '💧']], place: [['schläft', 'im', 'Wald', '🌲'], ['läuft', 'im', 'Schnee', '❄️']] },
  { art: 'Der', n: 'Fuchs', e: '🦊', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Fisch', '🐟'], ['frisst', 'Mäuse', '🐭']], place: [['läuft', 'im', 'Wald', '🌲'], ['sitzt', 'im', 'Gras', '🌿']] },
  { art: 'Die', n: 'Ente', e: '🦆', short: [['schwimmt', '🌊'], ['fliegt', '☁️']], act: [['frisst', 'Brot', '🍞'], ['frisst', 'Körner', '🌾']], place: [['schwimmt', 'im', 'Wasser', '🌊'], ['fliegt', 'am', 'Himmel', '☁️']] },
  { art: 'Der', n: 'Vogel', e: '🐦', short: [['fliegt', '☁️'], ['singt', '🎵']], act: [['frisst', 'Körner', '🌾'], ['frisst', 'Brot', '🍞']], place: [['fliegt', 'am', 'Himmel', '☁️'], ['sitzt', 'im', 'Garten', '🌳']] },
  { art: 'Die', n: 'Eule', e: '🦉', short: [['fliegt', '☁️'], ['schläft', '💤']], act: [['frisst', 'Mäuse', '🐭']], place: [['fliegt', 'am', 'Himmel', '☁️'], ['schläft', 'im', 'Wald', '🌲']] },
  { art: 'Der', n: 'Fisch', e: '🐟', short: [['schwimmt', '🌊']], act: [], place: [['schwimmt', 'im', 'Meer', '🌊'], ['schwimmt', 'im', 'Wasser', '🌊']] },
  { art: 'Der', n: 'Elefant', e: '🐘', short: [['läuft', '🏃']], act: [['trinkt', 'Wasser', '💧'], ['frisst', 'Gras', '🌿'], ['frisst', 'Äpfel', '🍎'], ['frisst', 'Bananen', '🍌']], place: [['steht', 'im', 'Wasser', '🌊'], ['läuft', 'im', 'Gras', '🌿']] },
  { art: 'Der', n: 'Junge', e: '👦', short: [['läuft', '🏃'], ['singt', '🎵'], ['schläft', '💤'], ['spielt', '⚽'], ['lacht', '😄']], act: [['isst', 'Kuchen', '🍰'], ['trinkt', 'Saft', '🧃'], ['liest', 'Bücher', '📖'], ['malt', 'Häuser', '🏠'], ['isst', 'Pizza', '🍕'], ['isst', 'Suppe', '🍲'], ['isst', 'Bananen', '🍌'], ['trinkt', 'Wasser', '💧'], ['malt', 'Bäume', '🌲'], ['malt', 'Sterne', '⭐'], ['liest', 'Zeitung', '📰']], place: [['schläft', 'im', 'Bett', '🛏️'], ['läuft', 'im', 'Wald', '🌲'], ['spielt', 'im', 'Garten', '🌳'], ['läuft', 'im', 'Schnee', '❄️'], ['sitzt', 'am', 'Strand', '🏖️'], ['schwimmt', 'im', 'Meer', '🌊'], ['läuft', 'im', 'Park', '🏞️'], ['steht', 'am', 'Berg', '⛰️']] },
  { art: 'Das', n: 'Mädchen', e: '👧', short: [['singt', '🎵'], ['läuft', '🏃'], ['schläft', '💤'], ['spielt', '⚽'], ['tanzt', '💃'], ['lacht', '😄']], act: [['isst', 'Eis', '🍦'], ['trinkt', 'Milch', '🥛'], ['malt', 'Blumen', '🌸'], ['liest', 'Bücher', '📖'], ['isst', 'Pizza', '🍕'], ['isst', 'Bananen', '🍌'], ['isst', 'Nudeln', '🍝'], ['trinkt', 'Saft', '🧃'], ['trinkt', 'Tee', '☕'], ['malt', 'Sterne', '⭐'], ['malt', 'Bäume', '🌲'], ['backt', 'Kuchen', '🍰'], ['singt', 'Lieder', '🎵']], place: [['schläft', 'im', 'Bett', '🛏️'], ['singt', 'im', 'Haus', '🏠'], ['spielt', 'im', 'Garten', '🌳'], ['läuft', 'im', 'Schnee', '❄️'], ['sitzt', 'am', 'Strand', '🏖️'], ['schwimmt', 'im', 'Meer', '🌊'], ['läuft', 'im', 'Park', '🏞️'], ['sitzt', 'im', 'Gras', '🌿']] },
  { art: 'Die', n: 'Frau', e: '👩', short: [['singt', '🎵'], ['läuft', '🏃'], ['tanzt', '💃'], ['lacht', '😄']], act: [['trinkt', 'Tee', '☕'], ['liest', 'Bücher', '📖'], ['backt', 'Kuchen', '🍰'], ['isst', 'Suppe', '🍲'], ['liest', 'Zeitung', '📰'], ['singt', 'Lieder', '🎵'], ['malt', 'Blumen', '🌸']], place: [['schläft', 'im', 'Bett', '🛏️'], ['sitzt', 'im', 'Garten', '🌳'], ['läuft', 'im', 'Park', '🏞️'], ['läuft', 'im', 'Wald', '🌲']] },
  { art: 'Der', n: 'Mann', e: '👨', short: [['läuft', '🏃'], ['singt', '🎵'], ['lacht', '😄']], act: [['trinkt', 'Tee', '☕'], ['isst', 'Brot', '🍞'], ['liest', 'Zeitung', '📰'], ['isst', 'Suppe', '🍲'], ['isst', 'Pizza', '🍕'], ['trinkt', 'Wasser', '💧']], place: [['läuft', 'im', 'Wald', '🌲'], ['schläft', 'im', 'Bett', '🛏️'], ['sitzt', 'im', 'Garten', '🌳'], ['läuft', 'im', 'Park', '🏞️'], ['steht', 'am', 'Berg', '⛰️']] },
  { art: 'Die', n: 'Oma', e: '👵', short: [['singt', '🎵'], ['läuft', '🏃']], act: [['backt', 'Kuchen', '🍰'], ['trinkt', 'Tee', '☕'], ['liest', 'Bücher', '📖'], ['isst', 'Suppe', '🍲']], place: [['sitzt', 'im', 'Garten', '🌳']] },
  { art: 'Der', n: 'Opa', e: '👴', short: [['läuft', '🏃'], ['lacht', '😄']], act: [['liest', 'Zeitung', '📰'], ['trinkt', 'Tee', '☕'], ['isst', 'Suppe', '🍲']], place: [['sitzt', 'im', 'Garten', '🌳'], ['läuft', 'im', 'Park', '🏞️']] },
  { art: 'Der', n: 'Wolf', e: '🐺', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Fleisch', '🥩'], ['trinkt', 'Wasser', '💧']], place: [['läuft', 'im', 'Wald', '🌲'], ['läuft', 'im', 'Schnee', '❄️']] },
  { art: 'Der', n: 'Löwe', e: '🦁', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Fleisch', '🥩'], ['trinkt', 'Wasser', '💧']], place: [['schläft', 'im', 'Gras', '🌿'], ['steht', 'am', 'Berg', '⛰️']] },
  { art: 'Der', n: 'Affe', e: '🐒', short: [['läuft', '🏃'], ['schläft', '💤']], act: [['frisst', 'Bananen', '🍌'], ['frisst', 'Äpfel', '🍎']], place: [['sitzt', 'im', 'Baum', '🌳']] },
  { art: 'Der', n: 'Panda', e: '🐼', short: [['schläft', '💤'], ['läuft', '🏃']], act: [['frisst', 'Äpfel', '🍎'], ['trinkt', 'Wasser', '💧']], place: [['schläft', 'im', 'Gras', '🌿'], ['sitzt', 'im', 'Baum', '🌳']] },
  { art: 'Der', n: 'Pinguin', e: '🐧', short: [['läuft', '🏃'], ['schwimmt', '🌊']], act: [['frisst', 'Fisch', '🐟']], place: [['läuft', 'im', 'Schnee', '❄️'], ['schwimmt', 'im', 'Wasser', '🌊']] },
  { art: 'Der', n: 'Wal', e: '🐳', short: [['schwimmt', '🌊']], act: [], place: [['schwimmt', 'im', 'Meer', '🌊']] },
  { art: 'Der', n: 'Delfin', e: '🐬', short: [['schwimmt', '🌊']], act: [['frisst', 'Fisch', '🐟']], place: [['schwimmt', 'im', 'Meer', '🌊']] },
  { art: 'Der', n: 'Schwan', e: '🦢', short: [['schwimmt', '🌊'], ['fliegt', '☁️']], act: [['frisst', 'Brot', '🍞']], place: [['schwimmt', 'im', 'Wasser', '🌊'], ['fliegt', 'am', 'Himmel', '☁️']] },
  { art: 'Der', n: 'Adler', e: '🦅', short: [['fliegt', '☁️']], act: [['frisst', 'Fische', '🐟'], ['frisst', 'Mäuse', '🐭']], place: [['fliegt', 'am', 'Himmel', '☁️']] },
  { art: 'Die', n: 'Biene', e: '🐝', short: [['fliegt', '☁️']], act: [], place: [['fliegt', 'am', 'Himmel', '☁️'], ['sitzt', 'im', 'Gras', '🌿']] },
  { art: 'Das', n: 'Krokodil', e: '🐊', short: [['schwimmt', '🌊'], ['schläft', '💤']], act: [['frisst', 'Fisch', '🐟']], place: [['schwimmt', 'im', 'Wasser', '🌊'], ['schläft', 'im', 'Gras', '🌿']] },
];

// Wer kann im Satz «X und Y …» vorkommen (Namen und Tiere) und was tun sie zusammen.
const PAIR_SUBJECTS = [
  ['Hund', '🐶'], ['Katze', '🐱'], ['Maus', '🐭'], ['Hase', '🐇'], ['Pferd', '🐴'],
  ['Bär', '🐻'], ['Fuchs', '🦊'], ['Anna', '👧'], ['Max', '👦'],
  ['Wolf', '🐺'], ['Löwe', '🦁'], ['Affe', '🐒'], ['Panda', '🐼'],
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
