// День рождения ребёнка: данные и расчёт дат. Модуль без импортов (его читает storage.js, цикла быть не должно).
// Поздравление приходит от собаки: торт со свечками и три подарка (core/screens/birthday.js).

// Настройки по умолчанию (родитель меняет их на вкладке «Настройки»): имя, день и месяц, год рождения (по нему считается возраст).
export const DEFAULT_BIRTHDAY = { enabled: true, name: 'Алиса', month: 11, day: 12, year: 2019 };

// Если ребёнок не открыла приложение в сам день рождения, поздравление ждёт её ещё столько дней.
export const LATE_DAYS = 2;

// Подарки: все три выдаются сразу (ребёнок открывает коробки по очереди). Колпак — id вещи из core/dog-items.js;
// наклейка — первая ещё не собранная из списка (id из каталога core/rewards.js: sweets-5 — торт 🎂, party-* — праздничные);
// если все уже есть — вместо неё звёзды.
export const GIFT = {
  bones: 5,
  hat: 'party',
  stickers: ['sweets-5', 'party-0', 'party-1', 'party-2', 'party-3'],
  fallbackStars: 3,
};

export const MAX_CANDLES = 10; // больше свечек на торт не помещается (две строки по пять)

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (year, month) => [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

// День рождения в году year (29 февраля в невисокосный год — 28-го). Возвращает местную дату без времени.
export function birthdayDate(year, cfg) {
  return new Date(year, cfg.month - 1, Math.min(cfg.day, daysIn(year, cfg.month)));
}

// Сколько целых дней прошло с дня рождения: 0 — сегодня, 1 — вчера… Года смотрим два (день рождения 31 декабря
// может «догонять» уже в январе). null — дня рождения в ближайшие дни не было.
export function birthdayAge(today, cfg) {
  const day0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (const year of [day0.getFullYear(), day0.getFullYear() - 1]) {
    const days = Math.round((day0 - birthdayDate(year, cfg)) / 86400000);
    if (days >= 0 && days <= LATE_DAYS) return { year, daysAfter: days, age: Math.max(1, year - cfg.year) };
  }
  return null;
}

// «7 лет», «1 год», «3 года».
export function yearsLabel(n) {
  const last = n % 10;
  const two = n % 100;
  if (two >= 11 && two <= 14) return `${n} лет`;
  if (last === 1) return `${n} год`;
  if (last >= 2 && last <= 4) return `${n} года`;
  return `${n} лет`;
}
