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
Stier 🐂|Hirsch 🦌|Küken 🐥|Taube 🕊️|Adler 🦅|Dino 🦖|Nilpferd 🦛|Nashorn 🦏|Waschbär 🦝|Schwan 🦢|Flamingo 🦩|Pfau 🦚|Ameise 🐜|Raupe 🐛
Skorpion 🦂|Panda 🐼|Koala 🐨|Lama 🦙|Kaninchen 🐰|Frosch 🐸|Burger 🍔|Pommes 🍟|Torte 🎂|Croissant 🥐|Honig 🍯|Tee ☕|Suppe 🍲|Reis 🍚
Nudeln 🍝|Mais 🌽|Chili 🌶️|Aubergine 🍆|Brokkoli 🥦|Knoblauch 🧄|Erdnuss 🥜|Kastanie 🌰|Melone 🍈|Kiwi 🥝|Mango 🥭|Kokosnuss 🥥|Avocado 🥑|Orange 🍊
Salz 🧂|Wasser 💧|Stuhl 🪑|Sofa 🛋️|Lampe 💡|Computer 💻|Bleistift ✏️|Stift 🖊️|Lineal 📏|Schere ✂️|Rucksack 🎒|Schal 🧣|Handschuh 🧤|Hemd 👕
Mantel 🧥|Ring 💍|Tasche 👜|Schiff 🚢|Taxi 🚕|Hammer 🔨|Magnet 🧲|Geige 🎻|Klavier 🎹|Trompete 🎺|Mikrofon 🎤|Kamera 📷|Fahne 🚩|Pokal 🏆
Medaille 🏅|Schnee ❄️|Berg ⛰️|Welle 🌊|Insel 🏝️|Strand 🏖️|Tulpe 🌷|Kaktus 🌵|Palme 🌴|Blatt 🍃|Gras 🌿|Kleeblatt 🍀|Auge 👁️|Zunge 👅
Gehirn 🧠|Knochen 🦴|Hand ✋|Schule 🏫|Brücke 🌉|Zelt ⛺|Brunnen ⛲|Karte 🗺️|Kompass 🧭|Lupe 🔍|Waage ⚖️|Anker ⚓|Muschel 🐚
Hummer 🦞|Garnele 🦐|Kugelfisch 🐡|Seehund 🦭|Otter 🦦|Faultier 🦥|Stinktier 🦨|Dachs 🦡|Biber 🦫|Eidechse 🦎|Bison 🦬|Büffel 🐃|Leopard 🐆|Pudel 🐩
Einhorn 🦄|Drache 🐉|Mücke 🦟|Fliege 🪰|Käfer 🪲|Truthahn 🦃|Gans 🪿|Baguette 🥖|Brezel 🥨|Waffel 🧇|Speck 🥓|Steak 🥩|Würstchen 🌭|Sandwich 🥪
Taco 🌮|Salat 🥗|Popcorn 🍿|Butter 🧈|Donut 🍩|Keks 🍪|Lutscher 🍭|Pudding 🍮|Blaubeere 🫐|Olive 🫒|Kohl 🥬|Spiegelei 🍳|Sushi 🍣|Drachen 🪁
Würfel 🎲|Puzzle 🧩|Pinsel 🖌️|Faden 🧵|Nadel 🪡|Besen 🧹|Korb 🧺|Eimer 🪣|Seife 🧼|Dusche 🚿|Badewanne 🛁|Spiegel 🪞|Fenster 🪟|Glocke 🔔
Kiste 📦|Brief ✉️|Kalender 📅|Batterie 🔋|Pflaster 🩹|Tablette 💊|Teleskop 🔭|Mikroskop 🔬|Satellit 🛰️|Basketball 🏀|Volleyball 🏐|Ski 🎿|Schlitten 🛷|Bowling 🎳
Lokomotive 🚂|Lastwagen 🚛|Moped 🛵|Motorrad 🏍️|Kanu 🛶|Roller 🛴|Skateboard 🛹|Karussell 🎠|Achterbahn 🎢|Schneemann ⛄|Tornado 🌪️|Blitz ⚡|Vulkan 🌋|Wüste 🏜️
Planet 🪐|Stein 🪨|Ähre 🌾|Spuren 👣|Baby 👶|Zauberer 🧙|Fee 🧚|Clown 🤡|Prinzessin 👸|Prinz 🤴|Roboter 🤖|Alien 👽|Gespenst 👻|Bikini 👙
Stiefel 👢|Shorts 🩳|Schleife 🎀|Saxophon 🎷|Turm 🗼|Kirche ⛪|Fabrik 🏭|Ampel 🚦|Zirkus 🎪|Joystick 🎮|Fernseher 📺|Radio 📻|Eiswürfel 🧊|Axt 🪓
Säge 🪚|Klingel 🛎️|Wasserhahn 🚰|Ziegel 🧱|Leiter 🪜|Tor 🥅|Akkordeon 🪗|Koffer 🧳|Abakus 🧮|Heft 📓|Ordner 🗂️
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
