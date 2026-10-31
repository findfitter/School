// Nomen mit Artikel und Bild (Emoji). Das Bild muss eindeutig zum Wort passen.
// Der erste Teil (EASY) sind sehr häufige Wörter für den Anfang.

const GROUPS = {
  der: `Hund 🐶|Baum 🌳|Ball ⚽|Fisch 🐟|Bär 🐻|Bus 🚌|Hut 🎩|Mond 🌙|Fuß 🦶|Apfel 🍎|Käse 🧀|Saft 🧃|Löwe 🦁|Affe 🐵|Hai 🦈|Igel 🦔|Zahn 🦷|Pilz 🍄|Schuh 👟|Hase 🐇|Fuchs 🦊|Tiger 🐯|Elefant 🐘|Pinguin 🐧|Papagei 🦜
Traktor 🚜|Kuchen 🍰|Zug 🚆|Regen 🌧️|Mund 👄|Mantel 🧥|Rucksack 🎒|Schal 🧣|Hammer 🔨|Pfau 🦚|Schwan 🦢|Adler 🦅|Hirsch 🦌|Stier 🐂|Kaktus 🌵|Berg ⛰️|Strand 🏖️|Schlüssel 🔑|Computer 💻|Stuhl 🪑|Koffer 🧳|Besen 🧹|Eimer 🪣
Spiegel 🪞|Roboter 🤖|Clown 🤡|Drache 🐉|Würfel 🎲|Turm 🗼|Salat 🥗|Reis 🍚|Honig 🍯|Tee ☕|Schnee ❄️|Blitz ⚡|Vulkan 🌋|Stein 🪨|Brief ✉️|Kalender 📅|Fernseher 📺|Ski 🎿|Schlitten 🛷|Roller 🛴|Käfer 🪲|Dachs 🦡|Biber 🦫|Otter 🦦|Pudel 🐩
Ring 💍|Pokal 🏆|Anker ⚓|Kompass 🧭|Magnet 🧲|Wal 🐳|Frosch 🐸|Pinsel 🖌️|Faden 🧵|Korb 🧺|Zirkus 🎪|Zauberer 🧙|Prinz 🤴|Brunnen ⛲|Pfirsich 🍑|Ballon 🎈|Wecker ⏰|Keks 🍪|Lutscher 🍭|Speck 🥓|Regenbogen 🌈|Schneemann ⛄|Kohl 🥬`,
  die: `Katze 🐱|Kuh 🐄|Nase 👃|Blume 🌸|Birne 🍐|Milch 🥛|Maus 🐭|Ente 🦆|Eule 🦉|Hose 👖|Tür 🚪|Kerze 🕯️|Wolke ☁️|Krone 👑|Banane 🍌|Torte 🎂|Tomate 🍅|Gurke 🥒|Möhre 🥕|Zitrone 🍋|Kirsche 🍒|Ananas 🍍|Zwiebel 🧅|Zebra 🦓
Biene 🐝|Spinne 🕷️|Schlange 🐍|Krabbe 🦀|Giraffe 🦒|Schnecke 🐌|Rakete 🚀|Brille 👓|Gitarre 🎸|Trommel 🥁|Erdbeere 🍓|Kartoffel 🥔|Taube 🕊️|Ameise 🐜|Raupe 🐛|Pizza 🍕|Suppe 🍲|Aubergine 🍆|Orange 🍊|Kiwi 🥝|Tasche 👜|Geige 🎻
Trompete 🎺|Kamera 📷|Fahne 🚩|Medaille 🏅|Welle 🌊|Insel 🏝️|Tulpe 🌷|Palme 🌴|Karte 🗺️|Lupe 🔍|Waage ⚖️|Muschel 🐚|Zunge 👅|Brücke 🌉|Schule 🏫|Uhr ⌚|Sonne ☀️|Schere ✂️|Lampe 💡|Dusche 🚿|Badewanne 🛁|Seife 🧼|Nadel 🪡
Fliege 🪰|Mücke 🦟|Garnele 🦐|Gans 🪿|Brezel 🥨|Waffel 🧇|Olive 🫒|Blaubeere 🫐|Butter 🧈|Wüste 🏜️|Fee 🧚|Meerjungfrau 🧜|Prinzessin 👸|Kirche ⛪|Fabrik 🏭|Ampel 🚦|Glocke 🔔|Kiste 📦|Batterie 🔋|Tablette 💊|Schleife 🎀|Leiter 🪜
Axt 🪓|Säge 🪚|Klingel 🛎️|Lokomotive 🚂|Ziege 🐐|Eidechse 🦎|Schildkröte 🐢|Mütze 🧢`,
  das: `Haus 🏠|Ei 🥚|Auto 🚗|Buch 📖|Bett 🛏️|Eis 🍦|Boot ⛵|Schaf 🐑|Pferd 🐴|Huhn 🐔|Schwein 🐖|Kleid 👗|Herz 💖|Feuer 🔥|Brot 🍞|Ohr 👂|Auge 👁️|Wasser 💧|Salz 🧂|Sofa 🛋️|Zelt ⛺|Telefon 📱|Flugzeug ✈️
Fahrrad 🚲|Krokodil 🐊|Känguru 🦘|Nilpferd 🦛|Nashorn 🦏|Küken 🐥|Kaninchen 🐰|Lama 🦙|Koala 🐨|Gras 🌿|Blatt 🍃|Kleeblatt 🍀|Gehirn 🧠|Fenster 🪟|Taxi 🚕|Schiff 🚢|Hemd 👕|Geschenk 🎁|Schloss 🏰
Lineal 📏|Heft 📓|Mikrofon 🎤|Klavier 🎹|Saxophon 🎷|Radio 📻|Thermometer 🌡️|Pflaster 🩹|Teleskop 🔭|Mikroskop 🔬|Puzzle 🧩|Moped 🛵|Motorrad 🏍️|Kanu 🛶|Skateboard 🛹|Karussell 🎠|Basketball 🏀
Volleyball 🏐|Bowling 🎳|Tor 🥅|Faultier 🦥|Stinktier 🦨|Einhorn 🦄|Spiegelei 🍳|Sushi 🍣|Steak 🥩|Würstchen 🌭|Popcorn 🍿|Pudding 🍮|Baby 👶|Gespenst 👻`,
};

// Sehr häufige Wörter für Stufe 0 (der Hund, die Katze, das Haus …).
const EASY = new Set(['Hund', 'Baum', 'Ball', 'Fisch', 'Bär', 'Apfel', 'Mond', 'Katze', 'Kuh', 'Nase', 'Blume', 'Maus', 'Ente', 'Tür', 'Sonne', 'Banane',
  'Haus', 'Auto', 'Buch', 'Bett', 'Ei', 'Eis', 'Boot', 'Schaf', 'Pferd', 'Brot', 'Ohr', 'Wasser', 'Käse', 'Zug', 'Löwe', 'Milch', 'Uhr', 'Torte', 'Kleid', 'Herz']);

const seen = new Set();

export const NOUNS = Object.entries(GROUPS).flatMap(([art, list]) =>
  list.split(/[\n|]/).map((item) => item.trim()).filter(Boolean).map((item) => {
    const [word, emoji] = item.split(' ');
    return { art, word, emoji, easy: EASY.has(word) };
  })).filter((item) => {
  if (seen.has(item.emoji) || seen.has(item.word)) return false;
  seen.add(item.emoji);
  seen.add(item.word);
  return true;
});

export const ARTICLES = ['der', 'die', 'das'];
