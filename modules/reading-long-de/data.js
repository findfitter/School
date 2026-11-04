// Lange Sätze (5–6 Wörter). Werden im Code aus den Sätzen des Moduls «Sätze bauen»
// (../reading-sentences-de/data.js) gebaut, damit Tiere, Tätigkeiten und Orte nicht doppelt stehen:
//   two  — «Die Katze trinkt Milch und schläft»      (Tätigkeit mit Objekt + zweite Tätigkeit)
//   adj  — «Der große Hund läuft im Wald»            (Adjektiv beim Nomen)
//   pair — «Hund und Katze spielen im Garten»        (zwei Wesen, Tätigkeit und Ort)
//   free — «Anna und Max gehen zur Schule»           (5–6 Wörter, OHNE Bild)
//   have     — «Der Elefant hat einen langen Rüssel»       (Beschreibung: wer was hat; mit Bild)
//   ask      — «Wo schläft die kleine Katze?»               (Frage mit «?»)
//   because  — «Mia weint, denn sie ist traurig»            (Grund, Komma am Wort)
//   contrast — «Hunde bellen, aber Katzen miauen»           (Gegensatz)
//   compare  — «Elefanten sind größer als Mäuse»            (Vergleich)
//   order    — «Zuerst kommt der Winter, dann Frühling»     (Reihenfolge)
// Die Arten sind in index.js (LEVEL_KINDS) auf die Stufen verteilt, damit die Übung nicht nur «jemand tut etwas» ist.
// Zusätzliche Wörter für die höchste Stufe passen nicht (falsche Form, Zahl) oder widersprechen
// dem Bild, deshalb gibt es keine zweite richtige Lösung.
// Wer was kann steht in ../reading-sentences-de/data.js (HEROES): ein neues Tier, dort eingetragen, kommt auch hierher.

import { SENTENCES as BASE, HEROES } from '../reading-sentences-de/data.js';


// Nicht mehr als limit Mal dasselbe Wort: sonst stünden «frisst», «schläft», «Gras» fast in jedem Satz.
// Die Sätze werden gemischt (Schritt 7), damit die ersten Tiere der Liste das Limit nicht aufbrauchen.
const limiter = () => {
  const counts = new Map();
  return (key, limit) => {
    const n = counts.get(key) || 0;
    if (n >= limit) return false;
    counts.set(key, n + 1);
    return true;
  };
};
const scattered = (list) => list.map((item, i) => [(i * 7) % list.length, item]).sort((a, b) => a[0] - b[0] || 0).map(([, item]) => item);

const acts = BASE.filter((s) => s.kind === 'act'); // [Artikel, Nomen, Verb, Objekt], scene: [wer, was]
const places = BASE.filter((s) => s.kind === 'place'); // [Artikel, Nomen, Verb, Präposition, Ort], scene: [wer, wo]

// Adjektive nach bestimmtem Artikel (Nominativ) — in allen drei Geschlechtern gleich auf -e.
// Keine Farben, damit das Adjektiv dem Bild nicht widerspricht.
const ADJ = ['große', 'kleine', 'liebe', 'lustige', 'kluge', 'mutige'];
const ADULTS = ['Frau', 'Mann', 'Oma', 'Opa', 'Lehrer', 'Arzt', 'Koch', 'Bauer', 'Maler', 'Bauarbeiter', 'Pilot', 'Astronaut', 'Prinzessin', 'Prinz',
  'Clown', 'Zauberer'];

// Zweite Tätigkeit: Verb, Bild. Je nachdem, was das Wesen kann.
const SECOND = {
  land: [['schläft', '💤'], ['läuft', '🏃'], ['spielt', '⚽'], ['springt', '🤸']],
  bird: [['fliegt', '☁️'], ['singt', '🎵'], ['schläft', '💤']],
  owl: [['fliegt', '☁️'], ['schläft', '💤']],
  water: [['schwimmt', '🌊'], ['schläft', '💤']],
  duck: [['schwimmt', '🌊'], ['fliegt', '☁️'], ['schläft', '💤']],
  person: [['schläft', '💤'], ['singt', '🎵'], ['läuft', '🏃'], ['spielt', '⚽'], ['tanzt', '💃'], ['lacht', '😄'], ['winkt', '👋'], ['klatscht', '👏']],
  crawl: [['kriecht', '🌿']],
  jump: [['springt', '🤸'], ['schläft', '💤']],
};
const ALL_SECOND = ['schläft', 'läuft', 'fliegt', 'singt', 'schwimmt', 'spielt', 'springt', 'tanzt', 'lacht', 'winkt', 'klatscht', 'kriecht'];

// Zwei Wesen und ein gemeinsamer Ort: [Verb Plural, Verb Singular (zusätzliches Wort), Präposition, Ort, Bild, wer]
const RUN = ['Hund', 'Katze', 'Hase', 'Fuchs', 'Bär', 'Pferd', 'Wolf', 'Löwe', 'Tiger', 'Hirsch', 'Eichhörnchen', 'Kaninchen', 'Zebra', 'Junge', 'Mädchen',
  'Panda', 'Affe', 'Elefant', 'Schaf', 'Schwein', 'Anna', 'Max'];
const HOME = ['Hund', 'Katze', 'Junge', 'Mädchen', 'Baby', 'Frau', 'Mann', 'Anna', 'Max'];
const FOREST = ['Bär', 'Fuchs', 'Wolf', 'Hase', 'Hirsch', 'Eichhörnchen', 'Waschbär', 'Tiger', 'Löwe'];
const BIRDS = ['Vogel', 'Ente', 'Eule', 'Adler', 'Schwan', 'Papagei', 'Flamingo', 'Fee'];
const WATER = ['Fisch', 'Wal', 'Delfin', 'Hai', 'Robbe', 'Pinguin', 'Krokodil', 'Ente', 'Schwan', 'Frosch'];
const PEOPLE = ['Junge', 'Mädchen', 'Frau', 'Mann', 'Oma', 'Opa', 'Baby', 'Prinzessin', 'Prinz', 'Clown', 'Lehrer', 'Arzt', 'Koch', 'Maler', 'Anna', 'Max'];
const FIELD = ['Kuh', 'Pferd', 'Schaf', 'Ziege', 'Schwein', 'Hase', 'Kaninchen', 'Hirsch', 'Zebra', 'Giraffe'];

const PAIR_PLACES = [
  ['laufen', 'läuft', 'im', 'Wald', '🌲', [...FOREST, 'Junge', 'Mädchen', 'Mann']],
  ['schlafen', 'schläft', 'im', 'Wald', '🌲', FOREST],
  ['sitzen', 'sitzt', 'im', 'Gras', '🌿', RUN],
  ['laufen', 'läuft', 'im', 'Gras', '🌿', RUN],
  ['spielen', 'spielt', 'im', 'Garten', '🌳', ['Junge', 'Mädchen', 'Katze', 'Hund', 'Baby', 'Kaninchen', 'Anna', 'Max']],
  ['laufen', 'läuft', 'im', 'Schnee', '❄️', [...RUN, ...FOREST]],
  ['schlafen', 'schläft', 'im', 'Haus', '🏠', HOME],
  ['schlafen', 'schläft', 'im', 'Bett', '🛏️', HOME],
  ['sitzen', 'sitzt', 'im', 'Zimmer', '🛋️', [...HOME, 'Oma', 'Opa']],
  ['springen', 'springt', 'im', 'Feld', '🌾', ['Pferd', 'Hase', 'Kaninchen', 'Hirsch', 'Känguru', 'Ziege']],
  ['fliegen', 'fliegt', 'am', 'Himmel', '☁️', BIRDS],
  ['sitzen', 'sitzt', 'im', 'Baum', '🌳', [...BIRDS, 'Eichhörnchen', 'Affe', 'Waschbär', 'Katze']],
  ['schwimmen', 'schwimmt', 'im', 'Wasser', '🌊', WATER],
  ['schwimmen', 'schwimmt', 'im', 'Meer', '🌊', ['Fisch', 'Wal', 'Delfin', 'Hai', 'Robbe', 'Pinguin', 'Schildkröte']],
  ['spazieren', 'spaziert', 'im', 'Park', '🏞️', [...PEOPLE, 'Hund']],
  ['fahren', 'fährt', 'im', 'Auto', '🚗', PEOPLE],
  ['fahren', 'fährt', 'im', 'Bus', '🚌', PEOPLE],
  ['fahren', 'fährt', 'im', 'Zug', '🚂', PEOPLE],
  ['stehen', 'steht', 'am', 'Berg', '⛰️', ['Löwe', 'Tiger', 'Ziege', 'Schaf', 'Adler', 'Junge', 'Mann', 'Mädchen', 'Frau']],
  ['wohnen', 'wohnt', 'im', 'Schloss', '🏰', ['Prinzessin', 'Prinz', 'Zauberer', 'Fee', 'Drache']],
  ['arbeiten', 'arbeitet', 'am', 'Herd', '🍳', ['Koch', 'Frau', 'Mann', 'Oma', 'Opa', 'Roboter']],
];
const PAIRS_PER_PLACE = 11;

// Ohne Bild
const FREE = `
  Anna und Max gehen zur Schule|Mama liest Anna ein Märchen|Papa und Tom waschen das Auto|Oma backt leckere Kekse für alle|
  Opa liest Zeitung und trinkt Tee|Im Winter fahren Kinder Schlitten|Im Sommer schwimmen wir am See|
  Im Frühling blühen die ersten Blumen|Im Herbst fliegen die Vögel weg|Nachts scheinen viele helle Sterne|
  Morgens weckt Mama die kleine Lena|Wir lesen zusammen ein spannendes Buch|Die Kinder malen bunte Bilder|
  Die Lehrerin erklärt eine neue Aufgabe|Anna und Lisa spielen im Hof|In unserem Garten wachsen Äpfel|
  Max hat einen alten Hund|Lena hat ein kleines Kätzchen|Papa bringt Paul zur Schule|Der Regen klopft aufs Dach|
  Die Sonne wärmt das Land|Der Wind bewegt die Äste|Der Fluss fließt durch die Wiese|Die Kinder bauen eine Schneeburg|
  Ich helfe Mama in der Küche|Fische schwimmen im klaren Wasser|Vögel singen im hohen Baum|
  Das Eichhörnchen versteckt Nüsse im Baum|Der Fuchs läuft durch den Wald|Der Bär schläft im Winter lange|
  Das Pferd steht auf der Wiese|Die Kinder sammeln Pilze im Wald|Mama kocht eine leckere Suppe|
  Opa erzählt den Kindern Geschichten|Wir fahren zu Oma und Opa|Das Flugzeug fliegt hoch am Himmel|
  Der Zug fährt schnell los|Ein Schiff fährt über das Meer|Der Mond scheint hell am Himmel|
  Abends isst die ganze Familie zusammen|
`.split('|').map((t) => t.trim()).filter(Boolean);

// ---------- verschiedene Satzarten: damit es nicht immer «Jemand tut etwas und etwas» ist ----------
// Satzzeichen stehen am Ende des Wortes («schläft,», «Katze?») — auf dem Kärtchen sind sie zu sehen, das Kind übt Komma und Fragezeichen.
// Ein Bild gibt es nur dort, wo es hilft (have, ask); alles andere ist ohne Bild. Zusätzliche Wörter gibt es bei diesen Arten nicht.

// have — Beschreibung: wer was hat («Der Elefant hat einen langen Rüssel»): Akkusativ, Endungen der Adjektive. Wesen → Satz.
const HAVE = [
  ['Elefant', 'Der Elefant hat einen langen Rüssel'], ['Giraffe', 'Die Giraffe hat einen langen Hals'], ['Hase', 'Der Hase hat lange Ohren'],
  ['Fuchs', 'Der Fuchs hat einen buschigen Schwanz'], ['Eule', 'Die Eule hat große runde Augen'], ['Känguru', 'Das Känguru hat einen Beutel'],
  ['Krokodil', 'Das Krokodil hat scharfe Zähne'], ['Pfau', 'Der Pfau hat bunte Federn'], ['Kamel', 'Das Kamel hat zwei Höcker'],
  ['Nashorn', 'Das Nashorn hat ein Horn'], ['Zebra', 'Das Zebra hat schwarze Streifen'], ['Tiger', 'Der Tiger hat scharfe Krallen'],
  ['Löwe', 'Der Löwe hat eine große Mähne'], ['Hirsch', 'Der Hirsch hat ein großes Geweih'], ['Pinguin', 'Der Pinguin hat kurze Beine'],
  ['Schwan', 'Der Schwan hat einen langen Hals'], ['Hund', 'Der Hund hat eine kalte Nase'], ['Katze', 'Die Katze hat weiche Pfoten'],
  ['Biene', 'Die Biene hat vier kleine Flügel'], ['Spinne', 'Die Spinne hat acht Beine'], ['Krebs', 'Der Krebs hat zwei Scheren'],
  ['Schnecke', 'Die Schnecke hat ein Haus'], ['Maus', 'Die Maus hat einen langen Schwanz'],
  ['Eichhörnchen', 'Das Eichhörnchen hat einen buschigen Schwanz'], ['Wal', 'Der Wal hat eine große Flosse'], ['Wolf', 'Der Wolf hat scharfe Zähne'],
  ['Bär', 'Der Bär hat dicke Pfoten'], ['Pferd', 'Das Pferd hat eine lange Mähne'], ['Schildkröte', 'Die Schildkröte hat einen harten Panzer'],
  ['Hahn', 'Der Hahn hat einen roten Kamm'], ['Schwein', 'Das Schwein hat einen Ringelschwanz'], ['Affe', 'Der Affe hat lange Arme'],
  ['Panda', 'Der Panda hat schwarze Ohren'], ['Delfin', 'Der Delfin hat eine glatte Haut'], ['Papagei', 'Der Papagei hat bunte Federn'],
  ['Ente', 'Die Ente hat einen flachen Schnabel'], ['Kuh', 'Die Kuh hat zwei Hörner'], ['Schaf', 'Das Schaf hat weiche Wolle'],
  ['Ziege', 'Die Ziege hat einen kleinen Bart'],
];

// ask — Fragen (Fragewort «Wo», «Wer», «Was» …, am Ende «?»); das Bild zeigt, worum es geht
const ASK = [
  ['Wo schläft die kleine Katze?', ['🐱', '💤']], ['Was frisst der Hase gern?', ['🐇', '🥕']], ['Wer wohnt im dunklen Wald?', ['🌲']],
  ['Wo wohnt der große Bär?', ['🐻']], ['Was machen die Kinder im Winter?', ['⛄']], ['Wie ist das Wetter heute?', ['🌤️']],
  ['Wohin fliegen die Vögel im Herbst?', ['🐦']], ['Wann geht die Sonne auf?', ['🌅']], ['Warum weint das kleine Baby?', ['👶', '😢']],
  ['Wer ist schneller, Hase oder Schildkröte?', ['🐇', '🐢']], ['Wie viele Beine hat eine Spinne?', ['🕷️']],
  ['Was trinkt die Katze am liebsten?', ['🐱', '🥛']], ['Wer baut ein Haus für Menschen?', ['👷', '🏠']],
  ['Wo wachsen süße Beeren im Wald?', ['🍓']], ['Was macht man vor dem Essen?', ['🍽️']], ['Wer bewacht nachts unser Haus?', ['🐶', '🏠']],
  ['Was malt der Maler auf Papier?', ['🧑‍🎨', '🖼️']], ['Wer backt leckere Kuchen für uns?', ['👵', '🍰']], ['Wo leben Fische und Wale?', ['🐟', '🌊']],
  ['Wer sammelt Honig aus Blumen?', ['🐝', '🍯']], ['Was scheint tagsüber am Himmel?', ['☀️']], ['Was wächst am hohen Baum?', ['🌳']],
  ['Wie viele Beine hat ein Hund?', ['🐶', '🐾']], ['Wann scheint der Mond am Himmel?', ['🌙']],
];

// because — Grund («…, denn …», «…, weil …»)
const BECAUSE = `
  Mia weint, denn sie ist traurig|Max lacht, denn es ist lustig|Ben trinkt, denn er hat Durst|Tom friert, denn es ist kalt|
  Lena schläft, denn sie ist müde|Anna lacht, denn sie ist froh|Tim trinkt, weil er Durst hat|Eva isst, weil sie Hunger hat|
  Ich friere, weil es kalt ist|Ich lache, weil es lustig ist|Paul schläft, weil er müde ist|Hasen rennen, denn sie haben Angst|
  Vögel fliegen, weil es Winter wird|Bären schlafen, weil es Winter ist|Kinder tragen Mäntel, denn es regnet|
  Lisa trinkt Tee, denn sie friert|Schnee schmilzt, denn die Sonne scheint|Blumen wachsen, denn die Sonne scheint
`.split('|').map((t) => t.trim()).filter(Boolean);

// contrast — Gegensatz («…, aber …»)
const CONTRAST = `
  Elefanten sind groß, Mäuse klein|Hasen sind schnell, Schnecken langsam|Hunde bellen, aber Katzen miauen|
  Vögel fliegen, aber Fische schwimmen|Zitronen sind sauer, Zucker ist süß|Eis ist kalt, aber Tee heiß|
  Papa trinkt Kaffee, Mama Tee|Max malt, aber Lena liest|Tage sind hell, Nächte dunkel|
  Kinder spielen, aber Erwachsene arbeiten|Sommer ist warm, Winter kalt|Hasen sind klein, Bären groß|
  Katzen mögen Milch, Hunde Knochen|Eulen schlafen tags, fliegen nachts|Winter ist kalt, aber Sommer heiß
`.split('|').map((t) => t.trim()).filter(Boolean);

// compare — Vergleich («… größer als …»)
const COMPARE = `
  Elefanten sind größer als Mäuse|Hasen sind schneller als Schnecken|Berge sind höher als Häuser|
  Giraffen sind größer als Pferde|Wale sind größer als Fische|Zucker ist süßer als Zitronen|
  Eis ist kälter als Tee|Mäuse sind kleiner als Katzen|Pferde laufen schneller als Menschen|
  Bäume sind höher als Blumen|Steine sind schwerer als Federn|Tage sind heller als Nächte|
  Winter ist kälter als Sommer|Adler fliegen höher als Spatzen
`.split('|').map((t) => t.trim()).filter(Boolean);

// order — Reihenfolge («Zuerst …, dann …», «Vor dem … …»)
const ORDER = `
  Zuerst kommt der Winter, dann Frühling|Vor dem Essen Hände waschen|Morgens putze ich die Zähne|
  Abends lesen wir ein Buch|Nach der Schule gehen wir spielen|Nach dem Regen kommt die Sonne|
  Zuerst Regen, dann kommt der Regenbogen|Zuerst frühstücken wir, dann spielen|Zuerst die Raupe, dann der Schmetterling|
  Zuerst ein Ei, dann das Küken|Zuerst Wolken, dann kommt der Regen|Vor dem Schlafen Zähne putzen|
  Nach dem Essen spielen wir wieder|Zuerst wird es Herbst, dann Winter
`.split('|').map((t) => t.trim()).filter(Boolean);

function build() {
  const sentences = [];
  const seenScene = new Set();
  // Ein Bild pro Satz: gibt es das Bild schon, kommt der zweite Satz nicht dazu (sonst ist die Aufgabe nicht eindeutig)
  const add = (kind, words, scene, extras) => {
    const sceneKey = `${kind}|${scene.join('')}`;
    if (seenScene.has(sceneKey)) return;
    seenScene.add(sceneKey);
    sentences.push({ key: words.join(' '), kind, words, scene, extras });
  };

  // two: «Die Katze trinkt Milch und schläft»; das zweite Verb wiederholt das erste nicht.
  // Pro Satz eine zweite Tätigkeit (der Reihe nach), damit «schläft» und «läuft» nicht in jedem stehen.
  const twoLimit = limiter();
  scattered(acts).forEach((s, index) => {
    const [art, noun, verb, object] = s.words;
    const options = (SECOND[HEROES[noun]?.kind] || []).filter(([second]) => second !== verb);
    if (!options.length) return;
    const [second, emoji] = options[index % options.length];
    if (!twoLimit(`v:${verb}`, 24) || !twoLimit(`o:${object}`, 12) || !twoLimit(`w:${noun}`, 8)) return;
    add('two', [art, noun, verb, object, 'und', second], [...s.scene, emoji], ALL_SECOND.filter((w) => w !== second));
  });

  // adj: «Der große Hund läuft im Wald»; das Adjektiv wechselt der Reihe nach, zusätzliches Wort — falsche Endung (-n)
  const adjLimit = limiter();
  scattered(places).forEach((s, index) => {
    const [art, noun, verb, prep, place] = s.words;
    if (!adjLimit(`v:${verb}`, 22) || !adjLimit(`p:${place}`, 12) || !adjLimit(`w:${noun}`, 7)) return;
    const options = ADJ.filter((a) => !(ADULTS.includes(noun) && a === 'kleine'));
    const adj = options[index % options.length];
    add('adj', [art, adj, noun, verb, prep, place], s.scene, [`${adj}n`]);
  });

  // pair: «Hund und Katze spielen im Garten»; Wesen aus der passenden Liste, Paare verstreut, nicht «jeder mit jedem»
  for (const [plural, single, prep, place, emoji, pool] of PAIR_PLACES) {
    const n = pool.length;
    for (let t = 0; t < Math.min(PAIRS_PER_PLACE, n * 2); t++) {
      const first = pool[(t * 3) % n];
      const second = pool[(t * 3 + 1 + (t % 2)) % n];
      if (first === second || !HEROES[first] || !HEROES[second]) continue;
      add('pair', [first, 'und', second, plural, prep, place], [HEROES[first].e, HEROES[second].e, emoji], [single]);
    }
  }

  // have / ask: mit Bild; because / contrast / compare / order: ohne Bild (nopic) und ohne zusätzliche Wörter
  for (const [hero, text] of HAVE) {
    if (HEROES[hero]) add('have', text.split(' '), [HEROES[hero].e], []);
  }
  for (const [text, scene] of ASK) add('ask', text.split(' '), scene, []);
  const plain = (kind, list) => {
    for (const text of list) sentences.push({ key: text, kind, words: text.split(' '), scene: [], extras: [], nopic: true });
  };
  plain('because', BECAUSE);
  plain('contrast', CONTRAST);
  plain('compare', COMPARE);
  plain('order', ORDER);

  // free: ohne Bild und ohne zusätzliche Wörter
  for (const text of FREE) {
    sentences.push({ key: text, kind: 'free', words: text.split(' '), scene: [], extras: [], nopic: true });
  }
  return sentences;
}

export const SENTENCES = build();
