// «Stimmt oder nicht?»: deutsches Wörterbuch. Das Wissen steht in ../reading-truefalse/knowledge.js (gemeinsam mit dem
// russischen Modul), hier nur Wörter und Formen: Artikel, Fälle, Verben. Die Bank baut bank.js; fehlt ein Wort, bricht der Bau sofort ab.
// Nomen als «Artikel Nomen» (klein geschrieben; am Satzanfang macht cap() den Anfang groß).

import { buildBank, P, N, cap, need } from '../reading-truefalse/bank.js';

const sent = (s) => `${cap(s)}.`;

const NOUN = Object.fromEntries(
  `
cat die_Katze
dog der_Hund
cow die_Kuh
horse das_Pferd
pig das_Schwein
sheep das_Schaf
goat die_Ziege
hen das_Huhn
rooster der_Hahn
duck die_Ente
rabbit das_Kaninchen
mouse die_Maus
elephant der_Elefant
giraffe die_Giraffe
lion der_Löwe
tiger der_Tiger
bear der_Bär
wolf der_Wolf
fox der_Fuchs
frog der_Frosch
fish der_Fisch
bird der_Vogel
snake die_Schlange
turtle die_Schildkröte
penguin der_Pinguin
dolphin der_Delfin
whale der_Wal
shark der_Hai
bee die_Biene
ant die_Ameise
butterfly der_Schmetterling
spider die_Spinne
owl die_Eule
eagle der_Adler
monkey der_Affe
kangaroo das_Känguru
crocodile das_Krokodil
hedgehog der_Igel
squirrel das_Eichhörnchen
zebra das_Zebra
hippo das_Nilpferd
snail die_Schnecke
ladybug der_Marienkäfer
bat die_Fledermaus
panda der_Panda
camel das_Kamel
parrot der_Papagei
swan der_Schwan
caterpillar die_Raupe
cheetah der_Gepard
apple der_Apfel
egg das_Ei
ball der_Ball
chair der_Stuhl
car das_Auto
house das_Haus
mountain der_Berg
person der_Mensch
plane das_Flugzeug
rocket die_Rakete
flower die_Blume
mushroom der_Pilz
tree der_Baum
tower der_Turm
ice der_Eiswürfel
snow der_Schnee
icecream das_Eis
tea der_Tee
soup die_Suppe
fire das_Feuer
sun die_Sonne
winter der_Winter
spring der_Frühling
summer der_Sommer
autumn der_Herbst
grass das_Gras
sky der_Himmel
tomato die_Tomate
lemon die_Zitrone
carrot die_Karotte
cucumber die_Gurke
milk die_Milch
banana die_Banane
cherry die_Kirsche
strawberry die_Erdbeere
orange die_Orange
honey der_Honig
candy das_Bonbon
cake der_Kuchen
salt das_Salz
knife das_Messer
brick der_Ziegelstein
teddy der_Teddybär
`
    .trim()
    .split('\n')
    .map((line) => {
      const [id, form] = line.split(' ');
      return [id, form.replace('_', ' ')];
    })
);
const noun = (id) => need(NOUN, id, 'Nomen');

// Verb: [3. Person, mit nicht, nach «kann», nach «kann» mit nicht]
const VERB = {
  fly: ['fliegt', 'fliegt nicht', 'fliegen', 'nicht fliegen'],
  swim: ['schwimmt', 'schwimmt nicht', 'schwimmen', 'nicht schwimmen'],
  run: ['läuft', 'läuft nicht', 'laufen', 'nicht laufen'],
  jump: ['springt', 'springt nicht', 'springen', 'nicht springen'],
  crawl: ['kriecht', 'kriecht nicht', 'kriechen', 'nicht kriechen'],
  climb: ['klettert auf Bäume', 'klettert nicht auf Bäume', 'auf Bäume klettern', 'nicht auf Bäume klettern'],
  dig: ['gräbt Löcher', 'gräbt keine Löcher', 'Löcher graben', 'keine Löcher graben'],
};

const SOUND = {
  cat: 'miaut', dog: 'bellt', cow: 'muht', horse: 'wiehert', pig: 'grunzt', sheep: 'blökt', hen: 'gackert', rooster: 'kräht',
  duck: 'quakt', lion: 'brüllt', wolf: 'heult', bee: 'summt', snake: 'zischt', bird: 'zwitschert', elephant: 'trompetet',
  frog: 'quakt', mouse: 'piepst',
};

// Körperteil: [«hat …», «hat …» verneint]
const PART = {
  trunk: ['einen Rüssel', 'keinen Rüssel'], wings: ['Flügel', 'keine Flügel'], tail: ['einen Schwanz', 'keinen Schwanz'],
  horns: ['Hörner', 'keine Hörner'], feathers: ['Federn', 'keine Federn'], fins: ['Flossen', 'keine Flossen'],
  shell: ['einen Panzer', 'keinen Panzer'], spikes: ['Stacheln', 'keine Stacheln'], mane: ['eine Mähne', 'keine Mähne'],
  beak: ['einen Schnabel', 'keinen Schnabel'], fur: ['Fell', 'kein Fell'], scales: ['Schuppen', 'keine Schuppen'],
  gills: ['Kiemen', 'keine Kiemen'], stripes: ['Streifen', 'keine Streifen'], pouch: ['einen Beutel', 'keinen Beutel'],
  legs: ['Beine', 'keine Beine'], spots: ['Flecken', 'keine Flecken'],
  eyes: ['Augen', 'keine Augen'], ears: ['Ohren', 'keine Ohren'], nose: ['eine Nase', 'keine Nase'], whiskers: ['Schnurrhaare', 'keine Schnurrhaare'],
};
const PART_OVERRIDE = { 'snail:shell': ['ein Schneckenhaus', 'kein Schneckenhaus'] };

const PLACE = {
  water: 'im Wasser', sea: 'im Meer', pond: 'im Teich', forest: 'im Wald', nest: 'im Nest', tree: 'auf dem Baum', hive: 'im Bienenstock',
  anthill: 'im Ameisenhaufen', kennel: 'in der Hundehütte', house: 'im Haus', farm: 'auf dem Bauernhof', barn: 'im Stall', burrow: 'im Bau',
  cave: 'in der Höhle', africa: 'in Afrika', australia: 'in Australien', desert: 'in der Wüste', moon: 'auf dem Mond',
  fridge: 'im Kühlschrank', pocket: 'in der Tasche', cloud: 'auf einer Wolke',
};

// Futter: [frisst …, «von …» (Dativ), «kein …» (Akkusativ)]
const FOOD = {
  grass: ['Gras', 'Gras', 'kein Gras'], hay: ['Heu', 'Heu', 'kein Heu'], meat: ['Fleisch', 'Fleisch', 'kein Fleisch'],
  fish: ['Fisch', 'Fisch', 'keinen Fisch'], carrot: ['Möhren', 'Möhren', 'keine Möhren'], honey: ['Honig', 'Honig', 'keinen Honig'],
  seeds: ['Körner', 'Körnern', 'keine Körner'], bamboo: ['Bambus', 'Bambus', 'keinen Bambus'], bananas: ['Bananen', 'Bananen', 'keine Bananen'],
  leaves: ['Blätter', 'Blättern', 'keine Blätter'], insects: ['Insekten', 'Insekten', 'keine Insekten'], nuts: ['Nüsse', 'Nüssen', 'keine Nüsse'],
};

const ADJ = {
  green: 'grün', red: 'rot', blue: 'blau', lightblue: 'hellblau', yellow: 'gelb', white: 'weiß', black: 'schwarz', orange: 'orange',
  cold: 'kalt', hot: 'heiß', sweet: 'süß', sour: 'sauer', salty: 'salzig', hard: 'hart', soft: 'weich', sharp: 'scharf', round: 'rund',
  square: 'quadratisch', triangular: 'dreieckig', wet: 'nass',
};

// «Mit …» (Dativ)
const TOOL = {
  spoon: 'dem Löffel', fork: 'der Gabel', knife: 'dem Messer', scissors: 'der Schere', hammer: 'dem Hammer', broom: 'dem Besen',
  brush: 'dem Pinsel', pencil: 'dem Bleistift', key: 'dem Schlüssel', camera: 'der Kamera', rod: 'der Angel',
  thermometer: 'dem Thermometer', ruler: 'dem Lineal',
};
const ACT = {
  eat_soup: ['isst man Suppe', 'isst man keine Suppe'], eat_pasta: ['isst man Nudeln', 'isst man keine Nudeln'],
  cut_bread: ['schneidet man Brot', 'schneidet man kein Brot'], cut_paper: ['schneidet man Papier', 'schneidet man kein Papier'],
  nails: ['schlägt man Nägel ein', 'schlägt man keine Nägel ein'], sweep: ['fegt man den Boden', 'fegt man den Boden nicht'],
  paint: ['malt man Bilder', 'malt man keine Bilder'], write: ['schreibt man Buchstaben', 'schreibt man keine Buchstaben'],
  door: ['öffnet man die Tür', 'öffnet man die Tür nicht'], photo: ['macht man Fotos', 'macht man keine Fotos'],
  fish: ['fängt man Fische', 'fängt man keine Fische'], temp: ['misst man die Temperatur', 'misst man die Temperatur nicht'],
  length: ['misst man die Länge', 'misst man die Länge nicht'],
};

const DEED = {
  milk: ['gibt Milch', 'gibt keine Milch'], eggs: ['legt Eier', 'legt keine Eier'], honey: ['macht Honig', 'macht keinen Honig'],
  wool: ['gibt Wolle', 'gibt keine Wolle'], guard: ['bewacht das Haus', 'bewacht das Haus nicht'], mice: ['fängt Mäuse', 'fängt keine Mäuse'],
  web: ['spinnt ein Netz', 'spinnt kein Netz'], nest: ['baut ein Nest', 'baut kein Nest'], cart: ['zieht einen Wagen', 'zieht keinen Wagen'],
  night: ['jagt nachts', 'jagt nicht nachts'], upside: ['schläft kopfüber', 'schläft nicht kopfüber'],
  flies: ['fängt Fliegen', 'fängt keine Fliegen'], anthill: ['baut einen Ameisenhaufen', 'baut keinen Ameisenhaufen'],
  house: ['trägt ein Haus auf dem Rücken', 'trägt kein Haus auf dem Rücken'], purr: ['schnurrt', 'schnurrt nicht'],
  fetch: ['bringt den Stock zurück', 'bringt den Stock nicht zurück'], peck: ['pickt Körner', 'pickt keine Körner'],
  gnaw: ['knabbert Nüsse', 'knabbert keine Nüsse'], winter: ['hält Winterschlaf', 'hält keinen Winterschlaf'],
  pouch: ['trägt ein Junges im Beutel', 'trägt kein Junges im Beutel'],
  newspaper: ['liest Zeitung', 'liest keine Zeitung'], bus: ['fährt einen Bus', 'fährt keinen Bus'], pies: ['backt Kuchen', 'backt keinen Kuchen'],
  coffee: ['trinkt Kaffee', 'trinkt keinen Kaffee'], violin: ['spielt Geige', 'spielt keine Geige'],
  school: ['geht zur Schule', 'geht nicht zur Schule'], glasses: ['trägt eine Brille', 'trägt keine Brille'],
};

// Vergleiche: [«mehr», «weniger»] — «… ist größer als …»
const CMP = {
  size: ['größer', 'kleiner'], weight: ['schwerer', 'leichter'], speed: ['schneller', 'langsamer'], height: ['höher', 'kleiner'],
  hot: ['heißer', 'kälter'], temp: ['wärmer', 'kälter'],
};

const NUM = 'null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig'.split(' ');

// Zählen: [Wer, Mehrzahl]
const COUNT = {
  dog_legs: ['der Hund', 'Beine'], cow_legs: ['die Kuh', 'Beine'], bird_legs: ['der Vogel', 'Beine'], spider_legs: ['die Spinne', 'Beine'],
  ladybug_legs: ['der Marienkäfer', 'Beine'], human_eyes: ['der Mensch', 'Augen'], human_ears: ['der Mensch', 'Ohren'],
  human_hands: ['der Mensch', 'Hände'], hand_fingers: ['eine Hand', 'Finger'], week_days: ['die Woche', 'Tage'],
  year_months: ['das Jahr', 'Monate'], day_hours: ['der Tag', 'Stunden'], hour_minutes: ['die Stunde', 'Minuten'],
  rainbow_colors: ['der Regenbogen', 'Farben'], traffic_colors: ['die Ampel', 'Farben'], triangle_sides: ['das Dreieck', 'Seiten'],
  square_sides: ['das Quadrat', 'Seiten'], bike_wheels: ['das Fahrrad', 'Räder'], car_wheels: ['das Auto', 'Räder'],
};
const COUNT_WORD = {
  2: 'zwei', 3: 'drei', 4: 'vier', 5: 'fünf', 6: 'sechs', 7: 'sieben', 8: 'acht', 9: 'neun', 10: 'zehn', 11: 'elf', 12: 'zwölf',
  20: 'zwanzig', 24: 'vierundzwanzig', 30: 'dreißig', 40: 'vierzig', 50: 'fünfzig', 60: 'sechzig', 90: 'neunzig', 100: 'hundert',
};

const ORDER = {
  day: { mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag', fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag' },
  mon: {
    jan: 'Januar', feb: 'Februar', mar: 'März', apr: 'April', may: 'Mai', jun: 'Juni', jul: 'Juli', aug: 'August',
    sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Dezember',
  },
  sea: { winter: 'Winter', spring: 'Frühling', summer: 'Sommer', autumn: 'Herbst' },
};

const SEASON_IN = { winter: 'Im Winter', spring: 'Im Frühling', summer: 'Im Sommer', autumn: 'Im Herbst' };
const SFEAT = {
  snowman: ['baut man einen Schneemann', 'baut man keinen Schneemann'], sled: ['fährt man Schlitten', 'fährt man nicht Schlitten'],
  snowlies: ['liegt Schnee', 'liegt kein Schnee'], melt: ['schmilzt der Schnee', 'schmilzt der Schnee nicht'],
  birdsback: ['kommen die Zugvögel zurück', 'kommen die Zugvögel nicht zurück'],
  snowdrops: ['blühen die Schneeglöckchen', 'blühen die Schneeglöckchen nicht'],
  swim: ['geht man im Fluss baden', 'geht man nicht im Fluss baden'], strawberries: ['reifen die Erdbeeren', 'reifen die Erdbeeren nicht'],
  hotdays: ['gibt es heiße Tage', 'gibt es keine heißen Tage'], leaves: ['fallen die Blätter', 'fallen die Blätter nicht'],
  harvest: ['erntet man Äpfel', 'erntet man keine Äpfel'], birdsleave: ['fliegen die Zugvögel nach Süden', 'fliegen die Zugvögel nicht nach Süden'],
};
const PART_IN = { morning: 'Am Morgen', day: 'Am Tag', evening: 'Am Abend', night: 'In der Nacht' };
const DFEAT = {
  sunrise: ['geht die Sonne auf', 'geht die Sonne nicht auf'], breakfast: ['frühstückt man', 'frühstückt man nicht'],
  sunshines: ['scheint die Sonne', 'scheint die Sonne nicht'], lunch: ['isst man zu Mittag', 'isst man nicht zu Mittag'],
  sunset: ['geht die Sonne unter', 'geht die Sonne nicht unter'], dinner: ['isst man zu Abend', 'isst man nicht zu Abend'],
  stars: ['scheinen die Sterne', 'scheinen die Sterne nicht'], sleep: ['schlafen die Menschen', 'schlafen die Menschen nicht'],
};

function render(c) {
  switch (c.cat) {
    case 'ab': {
      const S = noun(c.animal);
      const [v, vNot, inf, infNot] = need(VERB, c.verb, 'Fähigkeit');
      return {
        pos: [P(sent(`${S} ${v}`)), P(sent(`${S} kann ${inf}`))],
        neg: [N(sent(`${S} ${vNot}`)), N(sent(`${S} kann ${infNot}`))],
      };
    }
    case 'sd': {
      const S = noun(c.animal);
      const sound = need(SOUND, c.sound, 'Laut');
      return { pos: [P(sent(`${S} ${sound}`))], neg: [N(sent(`${S} ${sound} nicht`))] };
    }
    case 'has': {
      const S = noun(c.animal);
      const [has, no] = PART_OVERRIDE[`${c.animal}:${c.part}`] || need(PART, c.part, 'Körperteil');
      return { pos: [P(sent(`${S} hat ${has}`))], neg: [N(sent(`${S} hat ${no}`))] };
    }
    case 'home': {
      const S = noun(c.animal);
      const place = need(PLACE, c.place, 'Ort');
      return {
        pos: [P(sent(`${S} lebt ${place}`)), P(sent(`${place} lebt ${S}`))],
        neg: [N(sent(`${S} lebt nicht ${place}`)), N(sent(`${place} lebt ${S} nicht`))],
      };
    }
    case 'eat': {
      const S = noun(c.animal);
      const [acc, dat, kein] = need(FOOD, c.food, 'Futter');
      return {
        pos: [P(sent(`${S} frisst ${acc}`)), P(sent(`${S} ernährt sich von ${dat}`))],
        neg: [N(sent(`${S} frisst ${kein}`)), N(sent(`${S} ernährt sich nicht von ${dat}`))],
      };
    }
    case 'prop': {
      const S = noun(c.item);
      const adj = need(ADJ, c.prop, 'Eigenschaft');
      return { pos: [P(sent(`${S} ist ${adj}`))], neg: [N(sent(`${S} ist nicht ${adj}`))] };
    }
    case 'use': {
      const tool = need(TOOL, c.tool, 'Werkzeug');
      const [pos, neg] = need(ACT, c.act, 'Tätigkeit');
      return { pos: [P(sent(`Mit ${tool} ${pos}`))], neg: [N(sent(`Mit ${tool} ${neg}`))] };
    }
    case 'job': {
      const S = noun(c.animal);
      const [pos, neg] = need(DEED, c.deed, 'Tätigkeit');
      return { pos: [P(sent(`${S} ${pos}`))], neg: [N(sent(`${S} ${neg}`))] };
    }
    case 'cmp': {
      const [more, less] = need(CMP, c.dim, 'Vergleich');
      const A = noun(c.hi);
      const B = noun(c.lo);
      return {
        pos: [P(sent(`${A} ist ${more} als ${B}`)), P(sent(`${B} ist ${less} als ${A}`))],
        neg: [P(sent(`${B} ist ${more} als ${A}`)), P(sent(`${A} ist ${less} als ${B}`))],
      };
    }
    case 'num': {
      if (c.kind === 'cmp') {
        return {
          pos: [P(sent(`${NUM[c.a]} ist größer als ${NUM[c.b]}`)), P(sent(`${NUM[c.b]} ist kleiner als ${NUM[c.a]}`))],
          neg: [P(sent(`${NUM[c.b]} ist größer als ${NUM[c.a]}`)), P(sent(`${NUM[c.a]} ist kleiner als ${NUM[c.b]}`))],
        };
      }
      const op = c.kind === 'sum' ? 'plus' : 'minus';
      const line = (x) => [P(sent(`${NUM[c.a]} ${op} ${NUM[c.b]} ist ${NUM[x]}`)), P(sent(`${NUM[c.a]} ${op} ${NUM[c.b]} macht ${NUM[x]}`))];
      return { pos: line(c.c), neg: c.alts.flatMap(line) };
    }
    case 'cnt': {
      const [who, plural] = need(COUNT, c.what, 'Zählen');
      const line = (n) => P(sent(`${who} hat ${need(COUNT_WORD, n, 'Zahlwort')} ${plural}`));
      return { pos: [line(c.n)], neg: c.alts.map(line) };
    }
    case 'time': {
      if (c.kind === 'order') {
        const set = ORDER[c.set];
        const x = need(set, c.x, 'Reihenfolge');
        const y = need(set, c.y, 'Reihenfolge');
        const pos = [P(sent(`Nach ${x} kommt ${y}`)), P(sent(`Vor ${y} kommt ${x}`))];
        const neg = c.alts.flatMap((z) => {
          const Z = need(set, z, 'Reihenfolge');
          return [P(sent(`Nach ${x} kommt ${Z}`)), P(sent(`Vor ${Z} kommt ${x}`))];
        });
        return { pos, neg };
      }
      if (c.kind === 'sfeat') {
        const [pos, neg] = need(SFEAT, c.feat, 'Jahreszeit');
        const prefix = need(SEASON_IN, c.season, 'Jahreszeit');
        return { pos: [P(sent(`${prefix} ${pos}`))], neg: [N(sent(`${prefix} ${neg}`))] };
      }
      const [pos, neg] = need(DFEAT, c.feat, 'Tageszeit');
      const prefix = need(PART_IN, c.part, 'Tageszeit');
      return { pos: [P(sent(`${prefix} ${pos}`))], neg: [N(sent(`${prefix} ${neg}`))] };
    }
    default:
      throw new Error(`Unbekannte Art der Aussage: ${c.cat}`);
  }
}

export const BANK = buildBank({ render });
