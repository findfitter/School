// Wörter für die Sätze. Alle Sätze werden im Code aus diesen Listen nach fünf Mustern gebaut:
//   short — «Die Katze schläft»        (3 Wörter: Artikel, Nomen, Verb)
//   act   — «Die Katze trinkt Milch»   (4 Wörter: Artikel, Nomen, Verb, Objekt ohne Artikel)
//   pair  — «Hund und Katze spielen»   (4 Wörter: Nomen und Nomen, Verb im Plural)
//   place — «Der Hund läuft im Wald»   (5 Wörter, nur die höchste Stufe)
//   free  — «Anna liest Bücher»        (3–5 Wörter, OHNE Bild: Namen, Wetter, Jahreszeiten, Regeln des Lebens)
// Für jedes Subjekt sind nur sinnvolle Tätigkeiten angegeben, deshalb sind alle Sätze richtig.
//
// So wird die Bank erweitert (und nicht schief — das prüfen tools/word-freq.mjs und tools/check.mjs):
//   • ein neues Wort oder Bild kommt einmal in SHORT_VERBS, OBJECTS oder PLACES, die Tiere/Menschen verweisen darauf;
//   • pro Wesen gehört zu einem Objekt-Bild und zu einem Orts-Bild genau eine Tätigkeit, sonst haben zwei Sätze
//     dasselbe Bild und die Aufgabe ist nicht eindeutig (check.mjs findet solche Wiederholungen);
//   • ein Wort darf nicht in zu vielen Sätzen stehen: lieber neue Tiere, Verben und Objekte als noch ein
//     «Der Junge isst Pizza»;
//   • Sätze ohne Bild (free) kommen dazu, wenn es kein passendes Bild gibt.

// Verben ohne Objekt: Verb → Bild
const SHORT_VERBS = new Map(`
  läuft 🏃|schläft 💤|spielt ⚽|schwimmt 🌊|fliegt ☁️|singt 🎵|lacht 😄|tanzt 💃|springt 🤸|weint 😢|winkt 👋|klatscht 👏|
  denkt 💭|wartet ⏳|klettert 🧗|badet 🛁|ruft 📣|kocht 🍳|geht 🚶|rennt 🏃|schleicht 🐾|gähnt 🥱|trabt 🏇|heult 🌙|watschelt 🚶|krabbelt 🐾|
`.split('|').map((t) => t.trim()).filter(Boolean).map((t) => t.split(/\s+/)));

// Objekte ohne Artikel (Plural oder Stoffname): Wort → Bild
const OBJECTS = new Map(`
  Fleisch 🥩|Wasser 💧|Milch 🥛|Fisch 🐟|Käse 🧀|Brot 🍞|Körner 🌾|Möhren 🥕|Äpfel 🍎|Gras 🌿|Honig 🍯|Mäuse 🐭|Bananen 🍌|
  Kuchen 🍰|Saft 🧃|Bücher 📖|Häuser 🏠|Pizza 🍕|Suppe 🍲|Bäume 🌲|Sterne ⭐|Zeitung 📰|Eis 🍦|Blumen 🌸|Nudeln 🍝|Tee ☕|
  Lieder 🎵|Fische 🐟|
  Birnen 🍐|Trauben 🍇|Erdbeeren 🍓|Zitronen 🍋|Kirschen 🍒|Tomaten 🍅|Gurken 🥒|Kartoffeln 🥔|Mais 🌽|Zwiebeln 🧅|Eier 🥚|
  Kekse 🍪|Bonbons 🍬|Schokolade 🍫|Reis 🍚|Salat 🥗|Pilze 🍄|Nüsse 🌰|Würstchen 🌭|Pfannkuchen 🥞|Popcorn 🍿|Müsli 🥣|
  Kohl 🥬|Heu 🌾|Blätter 🍃|Mücken 🦟|
  Bälle ⚽|Briefe ✉️|Bilder 🖼️|Kerzen 🕯️|Schuhe 👟|Socken 🧦|Mützen 🧢|Puzzles 🧩|Raketen 🚀|Autos 🚗|Züge 🚂|
  Flugzeuge ✈️|Fahrräder 🚲|Schneemänner ⛄|Schlösser 🏰|Brücken 🌉|Zelte ⛺|Pokale 🏆|Medaillen 🏅|Fenster 🪟|
  Hunde 🐶|Katzen 🐱|Hühner 🐔|Enten 🦆|Vögel 🐦|Kaninchen 🐰|Schach ♟️|Klavier 🎹|Gitarre 🎸|Geige 🎻|Schlagzeug 🥁|
  Limonade 🥤|Zähne 🦷|
`.split('|').map((t) => t.trim()).filter(Boolean).map((t) => t.split(/\s+/)));

// Orte mit «im» / «am»: «Präposition Ort» → Bild
const PLACES = new Map(`
  im Wald 🌲|im Haus 🏠|im Garten 🌳|im Schnee ❄️|im Bett 🛏️|im Gras 🌿|im Wasser 🌊|am Himmel ☁️|im Meer 🌊|am Strand 🏖️|
  im Park 🏞️|am Berg ⛰️|im Baum 🌳|
  im Zimmer 🛋️|im Auto 🚗|im Bus 🚌|im Zug 🚂|im Boot ⛵|im Flugzeug ✈️|im Schloss 🏰|im Zelt ⛺|im Zirkus 🎪|im Dorf 🏘️|
  im Feld 🌾|im Fluss 🌊|am Fenster 🪟|am Herd 🍳|am Brunnen ⛲|im Weltall 🌌|im Laden 🏪|im Krankenhaus 🏥|im Dschungel 🌴|
  im Regen 🌧️|im Bad 🛁|im Sand 🏜️|am Tisch 🍽️|
`.split('|').map((t) => t.trim()).filter(Boolean).map((t) => { const [prep, place, emoji] = t.split(/\s+/); return [`${prep} ${place}`, emoji]; }));

const parseShort = (verb) => {
  const emoji = SHORT_VERBS.get(verb);
  if (!emoji) throw new Error(`reading-sentences-de: нет картинки глагола «${verb}» (SHORT_VERBS)`);
  return [verb, emoji];
};
const parseAct = (text) => {
  const [verb, object] = text.split(' ');
  const emoji = OBJECTS.get(object);
  if (!emoji) throw new Error(`reading-sentences-de: нет картинки предмета «${object}» (OBJECTS)`);
  return [verb, object, emoji];
};
const parsePlace = (text) => {
  const [verb, prep, place] = text.split(' ');
  const emoji = PLACES.get(`${prep} ${place}`);
  if (!emoji) throw new Error(`reading-sentences-de: нет места «${prep} ${place}» (PLACES)`);
  return [verb, prep, place, emoji];
};

// art — Artikel, n — Nomen, e — Bild, kind — wer was kann (land / bird / owl / duck / water / person / crawl / jump);
// shorts — «Verb», acts — «Verb Objekt», places — «Verb Präposition Ort»
const S = (art, n, e, kind, shorts, acts, places) => ({
  art, n, e, kind,
  short: shorts ? shorts.split('|').map(parseShort) : [],
  act: acts ? acts.split('|').map(parseAct) : [],
  place: places ? places.split('|').map(parsePlace) : [],
});

const SUBJECTS = [
  S('Der', 'Hund', '🐶', 'land',
    'rennt|schläft|spielt|springt',
    'frisst Fleisch|trinkt Wasser',
    'läuft im Wald|schläft im Haus|spielt im Garten|rennt im Schnee|schwimmt im Fluss|fährt im Auto'),
  S('Die', 'Katze', '🐱', 'land',
    'schläft|schleicht|spielt|springt',
    'trinkt Milch|frisst Fisch|trinkt Wasser|fängt Mäuse',
    'schläft im Bett|schläft im Haus|sitzt im Garten|schleicht im Gras|sitzt am Fenster'),
  S('Die', 'Maus', '🐭', 'land',
    'rennt|schläft',
    'frisst Käse|frisst Brot|frisst Körner|knabbert Nüsse',
    'schläft im Haus|rennt im Gras'),
  S('Der', 'Hase', '🐇', 'land',
    'rennt|schläft|springt',
    'frisst Möhren|frisst Äpfel|trinkt Wasser|knabbert Kohl',
    'rennt im Wald|sitzt im Gras|rennt im Schnee|springt im Feld'),
  S('Die', 'Kuh', '🐄', 'land',
    'schläft|geht',
    'frisst Gras|trinkt Wasser|frisst Heu',
    'steht im Gras'),
  S('Das', 'Pferd', '🐴', 'land',
    'trabt|schläft',
    'frisst Äpfel|frisst Gras|frisst Möhren|trinkt Wasser|frisst Heu',
    'läuft im Gras|trabt im Wald|galoppiert im Feld'),
  S('Der', 'Bär', '🐻', 'land',
    'schläft|geht|gähnt',
    'frisst Honig|frisst Fisch|trinkt Wasser',
    'schläft im Wald|wandert im Schnee'),
  S('Der', 'Fuchs', '🦊', 'land',
    'schleicht|schläft',
    'frisst Fisch|frisst Mäuse',
    'schleicht im Wald|sitzt im Gras|läuft im Schnee'),
  S('Die', 'Ente', '🦆', 'duck',
    'schwimmt|fliegt',
    'frisst Brot|frisst Körner',
    'schwimmt im Wasser|fliegt am Himmel|läuft im Gras'),
  S('Der', 'Vogel', '🐦', 'bird',
    'fliegt|singt',
    'frisst Körner|frisst Brot|frisst Kirschen',
    'fliegt am Himmel|sitzt im Garten|sitzt am Berg'),
  S('Die', 'Eule', '🦉', 'owl',
    'fliegt|schläft',
    'frisst Mäuse',
    'fliegt am Himmel|schläft im Wald'),
  S('Der', 'Fisch', '🐟', 'water',
    'schwimmt',
    '',
    'schwimmt im Meer'),
  S('Der', 'Elefant', '🐘', 'land',
    'geht',
    'trinkt Wasser|frisst Gras|frisst Äpfel|frisst Bananen',
    'steht im Wasser|geht im Gras|geht im Dschungel'),
  S('Der', 'Junge', '👦', 'person',
    'läuft|singt|schläft|spielt|lacht',
    'isst Kuchen|trinkt Saft|liest Bücher|malt Häuser|isst Pizza|isst Suppe|isst Bananen|trinkt Wasser|malt Bäume|malt Sterne|liest Zeitung',
    'schläft im Bett|spielt im Garten|rennt im Schnee|sitzt am Strand|schwimmt im Meer|spaziert im Park|steht am Berg'),
  S('Das', 'Mädchen', '👧', 'person',
    'singt|läuft|schläft|spielt|tanzt|lacht',
    'isst Eis|trinkt Milch|malt Blumen|liest Bücher|isst Pizza|isst Bananen|isst Nudeln|trinkt Saft|trinkt Tee|malt Sterne|malt Bäume|backt Kuchen|singt Lieder',
    'schläft im Bett|singt im Haus|spielt im Garten|rennt im Schnee|sitzt am Strand|schwimmt im Meer|spaziert im Park|sitzt im Gras'),
  S('Die', 'Frau', '👩', 'person',
    'singt|läuft|tanzt|lacht',
    'trinkt Tee|liest Bücher|backt Kuchen|isst Suppe|liest Zeitung|singt Lieder|malt Blumen',
    'schläft im Bett|sitzt im Garten|spaziert im Park|wandert im Wald|steht am Herd'),
  S('Der', 'Mann', '👨', 'person',
    'läuft|singt|lacht',
    'trinkt Tee|isst Brot|liest Zeitung|isst Suppe|isst Pizza|trinkt Wasser',
    'wandert im Wald|schläft im Bett|sitzt im Garten|spaziert im Park|steht am Berg|fährt im Auto'),
  S('Die', 'Oma', '👵', 'person',
    'singt|läuft',
    'backt Kuchen|trinkt Tee|liest Bücher|isst Suppe',
    'sitzt im Garten'),
  S('Der', 'Opa', '👴', 'person',
    'läuft|lacht',
    'liest Zeitung|trinkt Tee|isst Suppe',
    'sitzt im Garten|spaziert im Park'),
  S('Der', 'Wolf', '🐺', 'land',
    'heult|schläft',
    'frisst Fleisch|trinkt Wasser',
    'läuft im Wald|heult im Schnee'),
  S('Der', 'Löwe', '🦁', 'land',
    'geht|schläft',
    'frisst Fleisch|trinkt Wasser',
    'schläft im Gras|steht am Berg|lebt im Dschungel'),
  S('Der', 'Affe', '🐒', 'land',
    'klettert|schläft',
    'frisst Bananen|knabbert Nüsse',
    'sitzt im Baum|lebt im Dschungel'),
  S('Der', 'Panda', '🐼', 'land',
    'schläft|klettert',
    'frisst Äpfel|trinkt Wasser',
    'schläft im Gras|sitzt im Baum'),
  S('Der', 'Pinguin', '🐧', 'water',
    'watschelt|schwimmt',
    'fängt Fische',
    'watschelt im Schnee|schwimmt im Wasser'),
  S('Der', 'Wal', '🐳', 'water',
    'schwimmt',
    '',
    'schwimmt im Meer'),
  S('Der', 'Delfin', '🐬', 'water',
    'schwimmt|springt',
    'fängt Fisch',
    'schwimmt im Meer'),
  S('Der', 'Schwan', '🦢', 'duck',
    'schwimmt|fliegt',
    'frisst Brot',
    'schwimmt im Wasser|fliegt am Himmel'),
  S('Der', 'Adler', '🦅', 'bird',
    'fliegt',
    'frisst Mäuse|fängt Fische',
    'fliegt am Himmel|sitzt am Berg'),
  S('Die', 'Biene', '🐝', 'insect',
    'fliegt',
    '',
    'fliegt am Himmel|sitzt im Gras'),
  S('Das', 'Krokodil', '🐊', 'water',
    'schwimmt|schläft',
    'frisst Fisch',
    'schwimmt im Wasser|schläft im Gras'),

  // ---- neue Tiere ----
  S('Der', 'Tiger', '🐯', 'land',
    'schleicht|schläft|springt',
    'frisst Fleisch|trinkt Wasser|fängt Fische',
    'schläft im Gras|schleicht im Wald|lebt im Dschungel|steht am Berg'),
  S('Die', 'Giraffe', '🦒', 'land',
    'geht',
    'frisst Blätter|trinkt Wasser',
    'geht im Gras|steht im Feld'),
  S('Das', 'Zebra', '🦓', 'land',
    'rennt|schläft',
    'frisst Gras|trinkt Wasser',
    'rennt im Gras|steht im Feld'),
  S('Das', 'Nilpferd', '🦛', 'land',
    'schläft|schwimmt',
    'frisst Gras|trinkt Wasser',
    'steht im Wasser|schläft im Gras'),
  S('Das', 'Nashorn', '🦏', 'land',
    'geht|schläft',
    'frisst Gras|trinkt Wasser',
    'geht im Gras|steht im Feld'),
  S('Das', 'Känguru', '🦘', 'land',
    'springt|schläft',
    'frisst Gras|knabbert Möhren',
    'springt im Gras|springt im Feld'),
  S('Der', 'Koala', '🐨', 'land',
    'schläft|klettert',
    'frisst Blätter',
    'schläft im Baum'),
  S('Der', 'Hirsch', '🦌', 'land',
    'rennt|schläft',
    'frisst Gras|trinkt Wasser',
    'rennt im Wald|steht im Feld|trabt im Schnee'),
  S('Das', 'Eichhörnchen', '🐿️', 'land',
    'springt|klettert',
    'knabbert Nüsse|frisst Pilze',
    'sitzt im Baum|rennt im Gras|lebt im Wald'),
  S('Das', 'Schwein', '🐖', 'land',
    'schläft|geht',
    'frisst Äpfel|trinkt Wasser|frisst Mais',
    'wühlt im Gras|steht im Feld'),
  S('Das', 'Schaf', '🐑', 'land',
    'schläft|geht',
    'frisst Gras|trinkt Wasser',
    'grast im Feld|steht am Berg'),
  S('Die', 'Ziege', '🐐', 'land',
    'springt|klettert',
    'frisst Gras|knabbert Kohl|knabbert Möhren',
    'steht am Berg|springt im Gras'),
  S('Das', 'Kaninchen', '🐰', 'land',
    'springt|schläft',
    'knabbert Möhren|knabbert Kohl|frisst Gras',
    'sitzt im Gras|springt im Feld|springt im Schnee'),
  S('Der', 'Waschbär', '🦝', 'land',
    'schleicht|schläft',
    'fängt Fische|frisst Äpfel',
    'sitzt im Baum|schleicht im Wald'),
  S('Das', 'Kamel', '🐪', 'land',
    'geht|schläft',
    'trinkt Wasser|frisst Gras',
    'geht im Sand'),
  S('Der', 'Dinosaurier', '🦖', 'land',
    'geht',
    'frisst Gras|frisst Blätter',
    'geht im Wald|steht am Berg'),
  S('Das', 'Einhorn', '🦄', 'land',
    'rennt|tanzt',
    'frisst Äpfel|knabbert Möhren|trinkt Wasser',
    'läuft im Gras|fliegt am Himmel'),
  S('Das', 'Huhn', '🐔', 'bird',
    'schläft|geht',
    'pickt Körner|pickt Mais',
    'scharrt im Gras|geht im Feld'),
  S('Der', 'Hahn', '🐓', 'bird',
    'geht|ruft',
    'pickt Körner',
    'steht im Gras'),
  S('Das', 'Küken', '🐥', 'bird',
    'geht|schläft',
    'pickt Körner',
    'piept im Gras'),
  S('Der', 'Papagei', '🦜', 'bird',
    'fliegt|singt',
    'frisst Bananen|frisst Äpfel',
    'sitzt im Baum|fliegt am Himmel|lebt im Dschungel'),
  S('Der', 'Pfau', '🦚', 'bird',
    'geht',
    'pickt Körner',
    'geht im Gras|sitzt im Baum'),
  S('Der', 'Flamingo', '🦩', 'bird',
    'schläft|fliegt',
    'fängt Fische',
    'steht im Wasser'),
  S('Der', 'Frosch', '🐸', 'jump',
    'springt|schwimmt',
    'fängt Mücken',
    'sitzt im Gras|schwimmt im Wasser'),
  S('Die', 'Schildkröte', '🐢', 'crawl',
    'schläft|schwimmt',
    'frisst Gras|knabbert Kohl',
    'kriecht im Gras|schwimmt im Meer'),
  S('Die', 'Schlange', '🐍', 'crawl',
    'schläft',
    'frisst Mäuse',
    'kriecht im Gras'),
  S('Der', 'Krebs', '🦀', 'water',
    'krabbelt',
    'frisst Fisch',
    'krabbelt am Strand'),
  S('Der', 'Hai', '🦈', 'water',
    'schwimmt',
    'fängt Fische',
    'schwimmt im Meer'),
  S('Die', 'Robbe', '🦭', 'water',
    'schwimmt|schläft',
    'fängt Fische',
    'schwimmt im Wasser|liegt im Schnee'),
  S('Die', 'Ameise', '🐜', 'crawl',
    'krabbelt',
    'trägt Blätter',
    'krabbelt im Gras|krabbelt im Wald'),
  S('Die', 'Spinne', '🕷️', 'crawl',
    'wartet',
    'fängt Mücken',
    'sitzt im Gras'),
  S('Die', 'Schnecke', '🐌', 'crawl',
    'schläft',
    'frisst Blätter',
    'kriecht im Gras|sitzt im Regen'),
  S('Der', 'Marienkäfer', '🐞', 'insect',
    'fliegt',
    '',
    'kriecht im Gras|sitzt im Baum|fliegt am Himmel'),
  S('Der', 'Drache', '🐉', 'bird',
    'fliegt|schläft',
    'frisst Fleisch',
    'fliegt am Himmel|wohnt im Schloss|sitzt am Berg'),

  // ---- neue Menschen und Märchenfiguren ----
  S('Das', 'Baby', '👶', 'person',
    'schläft|lacht|weint|klatscht',
    'trinkt Milch|isst Bananen|isst Müsli',
    'schläft im Bett|sitzt im Gras|sitzt im Zimmer'),
  S('Der', 'Lehrer', '🧑‍🏫', 'person',
    'singt|lacht|winkt',
    'liest Bücher|schreibt Briefe|trinkt Tee',
    'steht im Zimmer|spaziert im Park|fährt im Bus'),
  S('Der', 'Arzt', '🧑‍⚕️', 'person',
    'läuft|lacht',
    'liest Bücher|trinkt Tee|isst Suppe',
    'steht im Krankenhaus|spaziert im Park|fährt im Auto'),
  S('Der', 'Koch', '🧑‍🍳', 'person',
    'kocht|lacht',
    'kocht Suppe|kocht Nudeln|kocht Reis|backt Pfannkuchen|schneidet Tomaten|schneidet Zwiebeln',
    'steht am Herd|spaziert im Park'),
  S('Der', 'Bauer', '🧑‍🌾', 'person',
    'läuft|lacht',
    'erntet Äpfel|erntet Möhren|erntet Mais|füttert Hühner|trinkt Milch',
    'läuft im Feld|sitzt im Gras|steht im Dorf'),
  S('Der', 'Maler', '🧑‍🎨', 'person',
    'singt|lacht',
    'malt Bilder|malt Blumen|malt Sterne|trinkt Tee',
    'sitzt im Park|steht am Fenster'),
  S('Der', 'Bauarbeiter', '👷', 'person',
    'läuft|lacht',
    'baut Häuser|baut Brücken|baut Schlösser|trinkt Wasser',
    'steht am Berg|spaziert im Park'),
  S('Der', 'Pilot', '🧑‍✈️', 'person',
    'winkt|lacht',
    'liest Briefe|trinkt Tee',
    'fliegt am Himmel|sitzt im Flugzeug'),
  S('Der', 'Astronaut', '🧑‍🚀', 'person',
    'winkt|schwimmt',
    'trinkt Wasser|liest Bücher',
    'fliegt im Weltall|steht am Fenster'),
  S('Die', 'Prinzessin', '👸', 'person',
    'singt|tanzt|lacht',
    'liest Bücher|trinkt Tee|isst Kuchen',
    'spaziert im Park|wohnt im Schloss|steht am Berg'),
  S('Der', 'Prinz', '🤴', 'person',
    'läuft|lacht',
    'liest Bücher|isst Kuchen|trinkt Tee',
    'wohnt im Schloss|läuft im Wald'),
  S('Der', 'Clown', '🤡', 'person',
    'tanzt|lacht|springt',
    'isst Eis|isst Popcorn|malt Sterne',
    'steht im Zirkus|spaziert im Park|fährt im Zug'),
  S('Der', 'Zauberer', '🧙', 'person',
    'winkt|lacht',
    'liest Bücher|malt Sterne|trinkt Tee',
    'läuft im Wald|wohnt im Schloss|steht am Berg'),
  S('Die', 'Fee', '🧚', 'bird',
    'fliegt|singt|tanzt',
    'malt Blumen|singt Lieder',
    'fliegt am Himmel|sitzt im Gras|läuft im Garten'),
  S('Der', 'Roboter', '🤖', 'person',
    'läuft|winkt|tanzt',
    'baut Häuser|baut Autos|trägt Schuhe',
    'spaziert im Park|steht im Laden|fährt im Bus'),
];

// ---------- Paare «X und Y …» ----------
// Wesen sind nach Fähigkeiten gruppiert: Paare entstehen nur innerhalb einer Gruppe (und «Kind und Haustier»), deshalb gibt es
// kein «Kuh und Hund schwimmen». Jedes Wesen steht nur in einigen Paaren, nicht «jeder mit jedem» — sonst kämen dieselben Wörter
// in Hunderten Sätzen vor. verbs — Verb im Plural und Bild; extras — Verben, die nicht passen (zusätzliches Wort).
const PAIR_GROUPS = [
  {
    heroes: ['Hund', 'Katze', 'Maus', 'Hase', 'Pferd', 'Bär', 'Fuchs', 'Wolf', 'Löwe', 'Tiger', 'Elefant', 'Giraffe', 'Zebra', 'Hirsch', 'Eichhörnchen',
      'Kuh', 'Schaf', 'Ziege', 'Kaninchen', 'Schwein', 'Waschbär', 'Panda', 'Affe'],
    verbs: [['schlafen', '💤'], ['spielen', '⚽'], ['laufen', '🏃'], ['springen', '🤸'], ['trinken', '💧'], ['fressen', '🍽️']],
    extras: ['fliegen', 'schwimmen', 'singen'],
    per: 3,
  },
  {
    heroes: ['Vogel', 'Ente', 'Eule', 'Adler', 'Schwan', 'Papagei', 'Pfau', 'Flamingo'],
    verbs: [['fliegen', '☁️'], ['schlafen', '💤'], ['singen', '🎵']],
    extras: ['laufen', 'spielen', 'springen'],
    per: 3,
  },
  {
    heroes: ['Fisch', 'Wal', 'Delfin', 'Hai', 'Robbe', 'Krebs', 'Schildkröte', 'Pinguin', 'Krokodil'],
    verbs: [['schwimmen', '🌊'], ['schlafen', '💤']],
    extras: ['fliegen', 'laufen', 'singen'],
    per: 2,
  },
  {
    heroes: ['Junge', 'Mädchen', 'Frau', 'Mann', 'Oma', 'Opa', 'Baby', 'Prinzessin', 'Prinz', 'Clown', 'Fee', 'Zauberer', 'Lehrer', 'Arzt', 'Koch', 'Maler'],
    verbs: [['spielen', '⚽'], ['laufen', '🏃'], ['singen', '🎵'], ['tanzen', '💃'], ['lesen', '📖'], ['lachen', '😄'], ['winken', '👋'], ['schlafen', '💤']],
    extras: ['fliegen', 'schwimmen', 'wachsen'],
    per: 3,
  },
];

// Namen und Kind mit Haustier: genaue Paare
const FRIEND_PAIRS = [
  ['Junge', 'Hund'], ['Mädchen', 'Katze'], ['Junge', 'Katze'], ['Mädchen', 'Hund'], ['Mann', 'Hund'], ['Frau', 'Katze'],
  ['Mädchen', 'Kaninchen'], ['Junge', 'Pferd'], ['Mädchen', 'Pferd'], ['Opa', 'Hund'], ['Oma', 'Katze'], ['Baby', 'Katze'],
  ['Baby', 'Hund'], ['Junge', 'Elefant'],
];
const FRIEND_VERBS = [['spielen', '⚽'], ['laufen', '🏃'], ['schlafen', '💤'], ['springen', '🤸']];

// Zwei Namen: Anna und Max haben ein Bild (👧 und 👦), aber nur hier — sonst wären «Mädchen» und «Anna» nicht zu unterscheiden
const NAME_PAIRS = [['Anna', '👧'], ['Max', '👦']];
const NAME_VERBS = [['spielen', '⚽'], ['laufen', '🏃'], ['singen', '🎵'], ['tanzen', '💃'], ['lesen', '📖'], ['lachen', '😄'], ['schlafen', '💤']];

// ---------- Sätze ohne Bild ----------
const FREE = `
  Anna liest Bücher|Anna malt Blumen|Anna singt Lieder|Anna backt Kuchen|Anna trinkt Tee|Anna isst Suppe|Anna spielt Klavier|
  Max baut ein Schloss|Max liest ein Buch|Max spielt Fußball|Max trinkt Wasser|Max isst Pizza|Max fährt Fahrrad|
  Lena singt ein Lied|Lena tanzt gern|Lena isst Eis|Lena malt ein Bild|Lena spielt Gitarre|
  Paul spielt Schach|Paul isst Brot|Paul schreibt einen Brief|Paul liest Zeitung|Paul wäscht die Hände|
  Mia füttert die Katze|Mia gießt die Blumen|Mia trinkt Milch|Mia putzt die Zähne|
  Tom baut eine Brücke|Tom sammelt Pilze|Tom trägt einen Rucksack|Tom wäscht das Auto|
  Emma spielt Geige|Emma isst Erdbeeren|Emma liest ein Märchen|
  Ben ruft laut|Ben spielt Schlagzeug|Ben isst Kekse|
  Lisa geht zur Schule|Lisa kocht Suppe|Lisa pflanzt Blumen|Jan fährt mit dem Bus|Jan trinkt Saft|
  Mama liebt Papa|Papa liebt Mama|Mama kocht das Essen|Papa liest die Zeitung|Oma backt Kuchen|Opa trinkt Tee|
  Oma strickt einen Schal|Opa repariert das Fahrrad|
  Im Winter schneit es|Im Winter ist es kalt|Im Sommer scheint die Sonne|Im Frühling blühen Blumen|Im Herbst fallen Blätter|
  Nachts scheint der Mond|Morgens geht die Sonne auf|Heute ist es warm|Es regnet den ganzen Tag|Der Wind weht stark|
  Die Wolken ziehen vorbei|
  Die Kuh gibt Milch|Das Huhn legt Eier|Bienen machen Honig|Fische leben im Wasser|Vögel bauen Nester|Der Wolf lebt im Wald|
  Der Bär schläft im Winter|Das Eichhörnchen sammelt Nüsse|Die Katze mag Milch|Der Hund bewacht das Haus|Der Hase mag Möhren|
  Der Junge ist froh|Das Mädchen ist froh|Die Mama ist lieb|Papa ist stark|Das Baby lacht laut|
  Wir lesen gern|Ich male gern|Du singst schön|Kinder spielen gern|Alle lieben den Sommer|Wir gehen nach Hause|
  Die Kinder gehen zur Schule|Die Lehrerin liest ein Märchen|Wir schreiben Buchstaben|Wir zählen bis zehn|Die Kinder hören zu|
`.split('|').map((t) => t.trim()).filter(Boolean);

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

  const emojiOf = new Map(SUBJECTS.map((s) => [s.n, s.e]));
  for (const [name, emoji] of NAME_PAIRS) emojiOf.set(name, emoji);
  const seenPair = new Set();
  const addPair = (first, second, verb, emoji, extras) => {
    const key = `${first}|${second}|${verb}`;
    if (seenPair.has(key) || first === second) return;
    seenPair.add(key);
    add('pair', [first, 'und', second, verb], [emojiOf.get(first), emojiOf.get(second), emoji], extras);
  };
  for (const group of PAIR_GROUPS) {
    const n = group.heroes.length;
    group.heroes.forEach((first, i) => {
      for (let k = 0; k < group.per; k++) {
        const second = group.heroes[(i + 1 + k * 4) % n]; // Schritt 4: Nachbarn werden nicht immer wieder Paare
        const [verb, emoji] = group.verbs[(i + k * 3) % group.verbs.length];
        addPair(first, second, verb, emoji, group.extras);
      }
    });
  }
  FRIEND_PAIRS.forEach(([first, second], i) => {
    for (let k = 0; k < 2; k++) {
      const [verb, emoji] = FRIEND_VERBS[(i + k * 2) % FRIEND_VERBS.length];
      addPair(first, second, verb, emoji, ['fliegen', 'schwimmen', 'singen']);
    }
  });
  NAME_VERBS.forEach(([verb, emoji]) => addPair('Anna', 'Max', verb, emoji, ['fliegen', 'schwimmen', 'wachsen']));

  // free: ohne Bild (scene leer, nopic: true) und ohne zusätzliche Wörter
  for (const text of FREE) {
    sentences.push({ key: text, kind: 'free', words: text.split(' '), scene: [], extras: [], nopic: true });
  }
  return sentences;
}

export const SENTENCES = build();

// Für «Lange Sätze» (../reading-long-de/data.js): wer was kann und welches Bild er hat
export const HEROES = Object.fromEntries(SUBJECTS.map((s) => [s.n, { e: s.e, art: s.art, kind: s.kind }]));
HEROES.Anna = { e: '👧', art: '', kind: 'person' };
HEROES.Max = { e: '👦', art: '', kind: 'person' };
