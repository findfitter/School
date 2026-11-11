// Ежедневная миссия «Уборка комнаты»: когда она нужна и как она переходит из фазы в фазу.
// Фазы дня: choose (ребёнок выбирает зону) → timer (идёт таймер) → wait (ждём взрослого) → done;
// skipped — пропущено взрослым. Состояние лежит в storage.mission() и переживает перезагрузку.
// Таймер хранится как момент окончания (endsAt), а не как счётчик: время считается по Date.now().
// Экраны (core/screens/mission.js) только показывают то, что здесь решено.

import * as storage from './storage.js';
import { birthdayToday } from './birthday.js';
import { OPEN_PHASES, ZONES, ZONE_IDS, REWARD, SKIP_COST, DOG_START, MISSION_TEST_MS, isoWeekday, continuesStreak } from './mission-data.js';

export { ZONES, REWARD, SKIP_COST, OPEN_PHASES, DOG_START };
export const zoneById = new Map(ZONES.map((z) => [z.id, z]));

// Нужно ли сейчас показать миссию вместо меню: включена родителем, сегодня «миссионный» день недели
// и она ещё не выполнена и не пропущена (новый день всегда начинает миссию заново).
export function missionPending() {
  const cfg = storage.settings().mission;
  if (!storage.missionTestOn() && birthdayToday()) return false; // в день рождения ребёнка уборки нет
  if (!cfg.enabled || !cfg.days.includes(isoWeekday(storage.dayKey()))) return false;
  return OPEN_PHASES.includes(storage.mission().phase);
}

export const missionState = () => storage.mission();

// Длительность таймера в миллисекундах (настройка родителя; в пробном запуске — MISSION_TEST_MS).
export const timerMs = () => (storage.missionTestOn() ? MISSION_TEST_MS : storage.settings().mission.minutes * 60000);

// Сколько миллисекунд осталось (только в фазе timer; в остальных фазах — 0).
export function msLeft(now = Date.now()) {
  const m = storage.mission();
  return m.phase === 'timer' ? Math.max(0, m.endsAt - now) : 0;
}

// Доля пройденного времени текущего отрезка от 0 до 1 (для дуги таймера и расписания собаки). После «Ещё нет —
// добавить N минут» отрезок начинается заново: endsAt сдвигается на полную длительность, а startedAt остаётся
// (он нужен для истории), поэтому считаем от оставшегося времени, а не от startedAt.
export function timerProgress(now = Date.now()) {
  const m = storage.mission();
  if (m.phase !== 'timer') return m.phase === 'wait' ? 1 : 0;
  return Math.min(1, Math.max(0, 1 - (m.endsAt - now) / timerMs()));
}

// ---------- Переходы (каждый возвращает true, если переход разрешён в текущей фазе) ----------

// Выбор зоны: пока таймер не запущен, ребёнок может передумать. После «Начнём!» выбор не меняется.
export function chooseZone(id) {
  if (!ZONE_IDS.includes(id) || storage.mission().phase !== 'choose') return false;
  storage.setMission({ zone: id });
  return true;
}

// «Начнём!»: фиксируем зону и запускаем таймер.
export function startTimer(now = Date.now()) {
  const m = storage.mission();
  if (m.phase !== 'choose' || !m.zone) return false;
  storage.setMission({ phase: 'timer', startedAt: now, endsAt: now + timerMs(), cleanedAt: 0, extra: 0 });
  return true;
}

// «Я убралась!» (или время вышло и ребёнок нажала кнопку): ждём взрослого.
export function markCleaned(now = Date.now()) {
  if (storage.mission().phase !== 'timer') return false;
  storage.setMission({ phase: 'wait', cleanedAt: now });
  return true;
}

// Взрослый ответил «Ещё нет»: таймер снова на полную длительность, счётчик добавлений растёт.
export function addTime(now = Date.now()) {
  const m = storage.mission();
  if (m.phase !== 'wait' && m.phase !== 'timer') return false;
  storage.setMission({ phase: 'timer', endsAt: now + timerMs(), cleanedAt: 0, extra: m.extra + 1 });
  return true;
}

// Взрослый подтвердил уборку: подарок выдаёт ядро один раз (REWARD — данные, см. mission-data.js).
// Возвращает выданный подарок или null, если миссия уже закрыта.
export function confirmDone() {
  return storage.completeMission({ ...REWARD }) ? { ...REWARD } : null;
}

// Ребёнок сама пропускает уборку за SKIP_COST звёзд (без подарка). false — не хватает звёзд или миссия уже закрыта.
export function skipForStars() {
  return storage.skipMissionPaid(SKIP_COST);
}

// Взрослый пропускает миссию на сегодня.
export function skipToday() {
  return storage.skipMission();
}

// Серия подтверждённых дней подряд на сегодня (для будущих наград): вчерашняя серия сохраняется, пока день не пропущен.
export function currentStreak() {
  const m = storage.mission();
  const today = storage.dayKey();
  if (m.lastDoneDay === today) return m.streak;
  return continuesStreak(m.lastDoneDay, today, storage.settings().mission.days) ? m.streak : 0;
}

// ---------- Расписание собаки в таймере (этап 5) ----------
// Собака «делает вид, что убирается»: идёт к зоне, потом по кругу работает и отдыхает, а в последние секунды гордо сидит рядом.
// Расписание зависит только от прошедшего и оставшегося времени — не от хранимого состояния, поэтому после перезагрузки
// или возврата во вкладку собака сразу оказывается там, где ей положено быть.
export const DOG_WALK_MS = 6000; // дорога от двери к зоне
export const DOG_WORK_MS = 12000; // работает
export const DOG_REST_MS = 4000; // оглядывается, отдыхает
export const DOG_PROUD_MS = 15000; // последние секунды (и после конца таймера): гордо сидит

// elapsedMs — сколько прошло в текущем отрезке, leftMs — сколько осталось, walkIn — идёт ли собака от двери
// (false после «Ещё нет — добавить время»: она уже в комнате), proudMs — сколько последних мс она гордо сидит (в коротком пробном таймере меньше). Возвращает { mode: 'walk' | 'work' | 'rest' | 'proud', t }, t — доля дороги.
export function dogPlan(elapsedMs, leftMs, walkIn = true, proudMs = DOG_PROUD_MS) {
  if (leftMs <= proudMs) return { mode: 'proud', t: 1 };
  const walk = walkIn ? DOG_WALK_MS : 0;
  if (elapsedMs < walk) return { mode: 'walk', t: Math.max(0, elapsedMs) / walk };
  const phase = (elapsedMs - walk) % (DOG_WORK_MS + DOG_REST_MS);
  return { mode: phase < DOG_WORK_MS ? 'work' : 'rest', t: 1 };
}
