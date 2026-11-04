// Выбор следующего предложения с контролем повторов слов. Общий для четырёх модулей: «Собери предложение» и
// «Длинные предложения», русский и немецкий (исключение из правила «модуль самодостаточен», как у english-quiz;
// файл перечислен в `files` манифестов).
//
// Зачем: ребёнок быстро выучивает слова, которые стоят почти в каждом предложении («мальчик», «девочка», «trinken»,
// «laufen»), и собирает предложения по привычке, а не читая. Поэтому предложение выбирается не наугад:
//   1. из нескольких случайных кандидатов берём тот, у которого меньше всего «затёртых» слов;
//   2. штраф за слово растёт, если оно уже было в этой серии (SERIES_PENALTY), если ребёнок уже не раз собирал
//      с ним предложения без ошибок (STATUS_PENALTY: «выучено» — реже) и если слово стоит во многих предложениях банка
//      (SHARE_PENALTY: частые слова реже, редкие чаще);
//   3. после предложения, собранного без ошибок, каждое слово отмечается в учёте слов ядра (ключ `<ns>:<слово>`).
// Служебные слова (предлоги, «и», артикли) не считаются: они есть почти везде, и штрафовать за них нечего.

const SAMPLE = 28; // сколько случайных кандидатов сравниваем
const SERIES_PENALTY = 4; // за слово, которое в этой серии уже было (за каждый раз)
const STATUS_PENALTY = { new: 0, learning: 0, due: 0.5, known: 1.5 };
const SHARE_PENALTY = 6; // умножается на долю предложений банка, в которых слово встречается

export const FREE_FROM_LEVEL = 1; // с этого уровня иногда попадаются предложения без картинки
export const FREE_SHARE = 0.2; // какая доля заданий — предложения без картинки (если они есть)

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function sample(list, count) {
  const copy = [...list];
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const j = rnd(i, copy.length - 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// sentences — банк (data.js); ignore — служебные слова; ns — префикс ключей учёта слов («rsw», «dsw»);
// status(ключ) — ctx.words.status; mark(ключ) — ctx.words.mark
export function createPicker({ sentences, ignore, ns, status, mark }) {
  const skip = new Set(ignore.map((w) => w.toLowerCase()));
  const wordsOf = new Map(sentences.map((s) => [s.key, [...new Set(s.words.map((w) => w.toLowerCase()).filter((w) => !skip.has(w)))]]));
  const share = new Map();
  for (const words of wordsOf.values()) for (const w of words) share.set(w, (share.get(w) || 0) + 1);
  for (const [w, n] of share) share.set(w, n / sentences.length);
  const inSeries = new Map(); // слово → сколько раз уже было в серии
  const hasFree = sentences.some((s) => s.kind === 'free');

  const cost = (word) =>
    SERIES_PENALTY * (inSeries.get(word) || 0) + (STATUS_PENALTY[status(`${ns}:${word}`)] || 0) + SHARE_PENALTY * (share.get(word) || 0);

  return {
    // сколько разных слов в банке (для блока «Слова» у родителя)
    vocabSize: share.size,

    // Какие виды предложений брать на этом уровне: иногда — без картинки (для тех, у кого уровень не самый первый)
    kindsFor(levelKinds, level) {
      if (hasFree && level >= FREE_FROM_LEVEL && Math.random() < FREE_SHARE) return ['free'];
      return levelKinds;
    },

    // Следующее предложение: из случайных кандидатов с самой низкой «затёртостью» слов; уже бывшие в серии не берём,
    // пока есть другие.
    pick(kinds, used) {
      const pool = sentences.filter((s) => kinds.includes(s.kind));
      const fresh = pool.filter((s) => !used.has(s.key));
      const candidates = sample(fresh.length ? fresh : pool, SAMPLE);
      let best = null;
      let bestScore = Infinity;
      for (const s of candidates) {
        const score = wordsOf.get(s.key).reduce((sum, w) => sum + cost(w), 0) + Math.random();
        if (score < bestScore) {
          best = s;
          bestScore = score;
        }
      }
      return best;
    },

    // Предложение показано: его слова теперь «были в серии».
    shown(task) {
      for (const w of wordsOf.get(task.key) || []) inSeries.set(w, (inSeries.get(w) || 0) + 1);
    },

    // Предложение собрано без ошибок: слова отмечаются в учёте слов (чем чаще получается, тем реже слово выпадает)
    learned(task) {
      for (const w of wordsOf.get(task.key) || []) mark(`${ns}:${w}`);
    },
  };
}
