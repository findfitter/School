// Данные ежедневной миссии «Уборка комнаты»: зоны, фазы, подарок. Файл ничего не импортирует —
// его читают и хранилище (storage.js), и логика миссии (mission.js), поэтому цикла между ними нет.

// Фазы дня: выбор зоны → таймер → ждём взрослого → готово; skipped — пропущено взрослым.
export const PHASES = ['choose', 'timer', 'wait', 'done', 'skipped'];
export const OPEN_PHASES = ['choose', 'timer', 'wait']; // миссия ещё не закрыта

export const DEFAULT_MINUTES = 5;
export const MIN_MINUTES = 3;
export const MAX_MINUTES = 15;
export const MISSION_TEST_MS = 30000; // пробный запуск из раздела для родителя идёт 30 секунд (на 15 собаке не хватило бы времени что-то показать)
export const HISTORY_DAYS = 60; // сколько дней истории хранить
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]; // дни недели: 1 — понедельник … 7 — воскресенье

// Семь зон комнаты (раздел 8.4 ТЗ). view — вид, в котором комната показывается при выборе зоны (A — от двери к окну,
// B — от окна к двери), views — в каких видах зона вообще видна (пол, кровать и диван видны в обоих; ребёнок может
// повернуть комнату вручную). Названия — STR.mission.zones[id].
// Для собаки в таймере (этап 5), в единицах кадра комнаты 380×250, по видам: stand — где стоят её лапы у этой зоны,
// spot — центр зоны (вокруг него вспыхивают искорки «чисто»); gesture — чем она «убирает» (одно из GESTURES, анимации — mission.css).
export const GESTURES = ['wipe', 'sweep', 'tidy', 'nudge'];
export const VIEWS = ['A', 'B'];
export const DOG_START = [190, 246]; // откуда собака приходит в комнату (от двери, нижний край кадра)
export const ZONES = [
  { id: 'desk', icon: '🖍️', view: 'A', views: ['A'], stand: { A: [140, 222] }, spot: { A: [190, 172] }, gesture: 'wipe' }, // протирает столешницу лапой
  { id: 'floor', icon: '🧸', view: 'A', views: ['A', 'B'], stand: { A: [186, 238], B: [195, 238] }, spot: { A: [186, 228], B: [195, 228] }, gesture: 'sweep' }, // «подметает» носом и хвостом
  { id: 'bed', icon: '🛏️', view: 'A', views: ['A', 'B'], stand: { A: [260, 240], B: [150, 240] }, spot: { A: [300, 176], B: [95, 200] }, gesture: 'wipe' }, // разглаживает одеяло лапой
  { id: 'sofa', icon: '🛋️', view: 'A', views: ['A', 'B'], stand: { A: [118, 238], B: [270, 240] }, spot: { A: [62, 172], B: [325, 190] }, gesture: 'tidy' }, // поправляет игрушки
  { id: 'doll', icon: '🍳', view: 'A', views: ['A'], stand: { A: [132, 214] }, spot: { A: [107, 160] }, gesture: 'tidy' }, // перекладывает посуду
  { id: 'kallax', icon: '🗄️', view: 'B', views: ['B'], stand: { B: [262, 228] }, spot: { B: [292, 150] }, gesture: 'nudge' }, // подталкивает ящик
  { id: 'shelf', icon: '📚', view: 'A', views: ['A'], stand: { A: [244, 214] }, spot: { A: [276, 150] }, gesture: 'tidy' }, // выравнивает книги носом
];
export const ZONE_IDS = ZONES.map((z) => z.id);

// Подарок за подтверждённую уборку — данные, а не код (ТЗ, раздел 7). Выдаёт storage.completeMission вместе с закрытием дня.
// type: bones — косточки (валюта собаки); food — банки корма; stars — звёзды; none — без подарка; sticker — наклейка (пока не выдаётся).
export const REWARD_TYPES = ['none', 'food', 'bones', 'stars', 'sticker'];
export const REWARD = { type: 'bones', amount: 1 }; // за подтверждённую уборку — косточка для собаки (решение владельца)
export const SKIP_COST = 100; // ребёнок может пропустить уборку сам за столько звёзд (тратятся с баланса, заработанные не уменьшаются)

// ---------- Дни ----------

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Ключ дня 'ГГГГ-ММ-ДД' -> Date в полдень (полдень, чтобы переход на летнее время не сдвигал дату).
function dateOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

// День недели ключа: 1 — понедельник … 7 — воскресенье.
export function isoWeekday(key) {
  return dateOf(key).getDay() || 7;
}

// Ключ дня со сдвигом на n дней.
export function shiftDay(key, n) {
  const date = dateOf(key);
  date.setDate(date.getDate() + n);
  return keyOf(date);
}

// Продолжается ли серия дней: прошлая уборка была вчера, либо все дни между ней и сегодня — не «миссионные»
// (например, выходные при будничной миссии). Пропущенный день миссии обнуляет серию тихо.
export function continuesStreak(lastDay, today, days) {
  if (!lastDay || lastDay >= today) return false;
  for (let key = shiftDay(lastDay, 1); key < today; key = shiftDay(key, 1)) {
    if (days.includes(isoWeekday(key))) return false;
  }
  return true;
}
