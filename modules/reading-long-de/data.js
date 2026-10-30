// Lange Sätze (6 Wörter). Werden im Code aus den Sätzen des Moduls «Sätze bauen»
// (../reading-sentences-de/data.js) gebaut, damit Tiere, Tätigkeiten und Orte nicht doppelt stehen:
//   two  — «Die Katze trinkt Milch und schläft»      (Tätigkeit mit Objekt + zweite Tätigkeit)
//   adj  — «Der große Hund läuft im Wald»            (Adjektiv beim Nomen)
//   pair — «Hund und Katze spielen im Garten»        (zwei Tiere, Tätigkeit und Ort)
// Zusätzliche Wörter für die höchste Stufe passen nicht (falsche Form, Zahl) oder widersprechen
// dem Bild, deshalb gibt es keine zweite richtige Lösung.

import { SENTENCES as BASE } from '../reading-sentences-de/data.js';

const acts = BASE.filter((s) => s.kind === 'act'); // [Artikel, Nomen, Verb, Objekt], scene: [wer, was]
const places = BASE.filter((s) => s.kind === 'place'); // [Artikel, Nomen, Verb, Präposition, Ort], scene: [wer, wo]

// Adjektive nach bestimmtem Artikel (Nominativ) — in allen drei Geschlechtern gleich auf -e.
// Keine Farben, damit das Adjektiv dem Bild nicht widerspricht.
const ADJ = ['große', 'kleine', 'liebe', 'lustige', 'kluge', 'mutige'];
const ADULTS = ['Frau', 'Mann', 'Oma', 'Opa'];

// Zweite Tätigkeit: Verb, Bild. Je nachdem, was das Wesen kann.
const SECOND = {
  land: [['schläft', '💤'], ['läuft', '🏃']],
  bird: [['fliegt', '☁️'], ['singt', '🎵']],
  owl: [['fliegt', '☁️'], ['schläft', '💤']],
  water: [['schwimmt', '🌊']],
  duck: [['schwimmt', '🌊'], ['fliegt', '☁️']],
  person: [['schläft', '💤'], ['singt', '🎵'], ['läuft', '🏃']],
};
const KIND_OF = {
  Hund: 'land', Katze: 'land', Maus: 'land', Hase: 'land', Kuh: 'land', Pferd: 'land', Bär: 'land', Fuchs: 'land',
  Elefant: 'land', Wolf: 'land', Löwe: 'land', Affe: 'land', Panda: 'land',
  Vogel: 'bird', Adler: 'bird', Schwan: 'duck', Ente: 'duck', Eule: 'owl', Pinguin: 'water', Delfin: 'water',
  Krokodil: 'water', Junge: 'person', Mädchen: 'person', Frau: 'person', Mann: 'person', Oma: 'person', Opa: 'person',
};
const ALL_SECOND = ['schläft', 'läuft', 'fliegt', 'singt', 'schwimmt'];

// Zwei Wesen und ein gemeinsamer Ort: [Verb Plural, Verb Singular (zusätzliches Wort), Präposition, Ort, Bild]
const PAIR_PLACES = [
  ['laufen', 'läuft', 'im', 'Wald', '🌲'],
  ['laufen', 'läuft', 'im', 'Gras', '🌿'],
  ['sitzen', 'sitzt', 'im', 'Gras', '🌿'],
  ['spielen', 'spielt', 'im', 'Garten', '🌳'],
  ['laufen', 'läuft', 'im', 'Schnee', '❄️'],
  ['schlafen', 'schläft', 'im', 'Haus', '🏠'],
  ['schlafen', 'schläft', 'im', 'Bett', '🛏️'],
];
const HOME_PLACES = ['Haus', 'Bett'];
const PAIR_HEROES = {
  Hund: '🐶', Katze: '🐱', Hase: '🐇', Fuchs: '🦊', Bär: '🐻', Pferd: '🐴', Wolf: '🐺', Löwe: '🦁', Panda: '🐼',
  Affe: '🐒', Anna: '👧', Max: '👦',
};
const HOME_HEROES = ['Hund', 'Katze', 'Anna', 'Max'];

function build() {
  const sentences = [];
  const add = (kind, words, scene, extras) => sentences.push({ key: words.join(' '), kind, words, scene, extras });

  // two: «Die Katze trinkt Milch und schläft»; zweites Verb wiederholt das erste nicht
  for (const s of acts) {
    const [art, noun, verb, object] = s.words;
    for (const [second, emoji] of SECOND[KIND_OF[noun]] || []) {
      if (second === verb) continue;
      add('two', [art, noun, verb, object, 'und', second], [...s.scene, emoji], ALL_SECOND.filter((w) => w !== second));
    }
  }

  // adj: «Der große Hund läuft im Wald»; zwei Adjektive je Satz, zusätzliches Wort — falsche Endung (-n)
  places.forEach((s, index) => {
    const [art, noun, verb, prep, place] = s.words;
    const options = ADJ.filter((a) => !(ADULTS.includes(noun) && a === 'kleine'));
    for (let k = 0; k < 2; k++) {
      const adj = options[(index + k * 3) % options.length];
      add('adj', [art, adj, noun, verb, prep, place], s.scene, [`${adj}n`]);
    }
  });

  // pair: «Hund und Katze spielen im Garten»
  const names = Object.keys(PAIR_HEROES);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const [first, second] = [names[i], names[j]];
      for (const [plural, single, prep, place, emoji] of PAIR_PLACES) {
        const home = HOME_PLACES.includes(place);
        if (home && !(HOME_HEROES.includes(first) && HOME_HEROES.includes(second))) continue;
        add('pair', [first, 'und', second, plural, prep, place], [PAIR_HEROES[first], PAIR_HEROES[second], emoji], [single]);
      }
    }
  }
  return sentences;
}

export const SENTENCES = build();
