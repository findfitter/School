// Wörter zum Lesen: Wort + Bild (Emoji). Die Schwierigkeit richtet sich nach der Wortlänge.
// Das Bild muss eindeutig zum Wort passen.

const PAIRS = `
Hund 🐶|Katze 🐱|Haus 🏠|Ball ⚽|Fisch 🐟|Baum 🌳|Bär 🐻|Bus 🚌|Eis 🍦|Ei 🥚|Uhr ⌚|Hut 🎩|Käse 🧀|Mond 🌙|Kuh 🐄|Fuß 🦶
Ohr 👂|Nase 👃|Mund 👄|Auto 🚗|Buch 📖|Bett 🛏️|Stern ⭐|Sonne ☀️|Blume 🌸|Apfel 🍎|Birne 🍐|Brot 🍞|Milch 🥛|Zug 🚆
Schaf 🐑|Pferd 🐴|Huhn 🐔|Ente 🦆|Eule 🦉|Fuchs 🦊|Hase 🐇|Maus 🐭|Löwe 🦁|Affe 🐵|Wal 🐳|Hai 🦈|Igel 🦔|Zahn 🦷
Pilz 🍄|Saft 🧃|Schuh 👟|Hose 👖|Kleid 👗|Boot ⛵|Tür 🚪|Herz 💖|Kerze 🕯️|Feuer 🔥|Regen 🌧️|Wolke ☁️|Krone 👑
Banane 🍌|Kuchen 🍰|Pizza 🍕|Tomate 🍅|Gurke 🥒|Möhre 🥕|Zitrone 🍋|Kirsche 🍒|Trauben 🍇|Ananas 🍍|Zwiebel 🧅
Zebra 🦓|Tiger 🐯|Biene 🐝|Spinne 🕷️|Schlange 🐍|Krabbe 🦀|Delfin 🐬|Giraffe 🦒|Pinguin 🐧|Papagei 🦜|Elefant 🐘
Känguru 🦘|Schwein 🐖|Schnecke 🐌|Rakete 🚀|Ballon 🎈|Brille 👓|Schloss 🏰|Geschenk 🎁|Gitarre 🎸|Trommel 🥁
Telefon 📱|Flugzeug ✈️|Fahrrad 🚲|Traktor 🚜|Krokodil 🐊|Erdbeere 🍓|Kartoffel 🥔|Schlüssel 🔑|Regenbogen 🌈
`;

const seen = new Set();

export const WORDS = PAIRS.split(/[\n|]/)
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => {
    const [word, emoji] = item.split(/\s+/);
    return { word, emoji };
  })
  // Gleiche Wörter oder Bilder sind nicht erlaubt — sonst ist die Antwort nicht eindeutig.
  .filter(({ word, emoji }) => {
    if (seen.has(word) || seen.has(emoji)) return false;
    seen.add(word);
    seen.add(emoji);
    return true;
  });
