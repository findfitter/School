// День рождения ребёнка: нужно ли показать поздравление и что за него выдаётся.
// Данные и даты — core/birthday-data.js, экран — core/screens/birthday.js, выдача подарка — storage.claimBirthday.

import * as storage from './storage.js';
import { birthdayAge, GIFT } from './birthday-data.js';

export { GIFT };

// Про день рождения сейчас: { year, daysAfter, age, name } или null (выключено или день рождения давно прошёл).
// Если поздравление за этот год уже получено, тоже null — экран показывается один раз.
export function birthdayInfo(date = new Date()) {
  const cfg = storage.settings().birthday;
  if (!cfg.enabled) return null;
  const hit = birthdayAge(date, cfg);
  if (!hit || storage.birthdayDoneYear() >= hit.year) return null;
  return { ...hit, name: cfg.name };
}

export const birthdayPending = () => birthdayInfo() !== null;

// Для пробного показа из раздела для родителя: как будто сегодня день рождения (даже если поздравления выключены или уже были).
export function previewInfo(date = new Date()) {
  const cfg = storage.settings().birthday;
  return { year: date.getFullYear(), daysAfter: 0, age: Math.max(1, date.getFullYear() - cfg.year), name: cfg.name };
}

// Сегодня сам день рождения (поздравление получено или нет): уборку комнаты в этот день не требуем.
export function birthdayToday(date = new Date()) {
  const cfg = storage.settings().birthday;
  if (!cfg.enabled) return false;
  const hit = birthdayAge(date, cfg);
  return Boolean(hit && hit.daysAfter === 0);
}

// Ребёнок открыла первую коробку: все подарки выдаются один раз (storage.claimBirthday).
export const claimBirthday = (info) => storage.claimBirthday(info.year, GIFT, info.daysAfter);
