# Моя школа

Образовательное приложение для ребёнка 1 класса: PWA на чистом HTML/CSS/JS, работает офлайн, управляется касанием.
Без рекламы, регистрации, аналитики и сети.

## Запуск

Из корня проекта запустите любой статический сервер, например:

```bash
python -m http.server 8080
```

Откройте http://localhost:8080/ в Chrome. После первого открытия приложение работает без интернета.
Чтобы поставить его на полку Хромбука: меню Chrome → «Установить».

## Как добавить модуль

Покажем на выдуманном модуле «Животные» (немецкий: как называется животное).

### 1. Папка модуля

```
modules/
  tiere/
    manifest.json
    index.js
    texts.js
    style.css
```

### 2. manifest.json

```json
{
  "id": "tiere",
  "title": "Tiere",
  "subject": "german",
  "icon": "🐶",
  "description": "Wie heißt das Tier?",
  "version": "1.0.0",
  "styles": ["style.css"],
  "files": ["texts.js"]
}
```

- `id` совпадает с именем папки.
- `subject`: `math`, `orientation`, `russian` или `german`. Плитка появится в нужной группе меню.
- `cycle` (необязательно): id круга. Модули с одним `cycle` проходятся по одному разу, затем выдаётся супер-наклейка и круг начинается заново. Подробности — в [CLAUDE.md](CLAUDE.md).
- `styles` и `files` — чтобы CSS и дополнительные файлы (и озвучка, если есть) попали в офлайн-кэш. `index.js` и `manifest.json` кэшируются сами.

### 3. index.js

```js
import { TEXT } from './texts.js';

const ANIMALS = [
  { emoji: '🐶', word: 'der Hund' },
  { emoji: '🐱', word: 'die Katze' },
  { emoji: '🐴', word: 'das Pferd' },
];

export function start(ctx) {
  const total = ctx.settings.seriesLength;
  let alive = true;
  let correct = 0;
  const mistakes = [];

  async function run() {
    for (let i = 0; i < total && alive; i++) {
      const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      const firstTry = await askOne(animal);
      if (firstTry) correct++;
      else mistakes.push({ key: animal.word, label: `${animal.emoji} ${animal.word}` });
    }
    if (alive) ctx.finish({ correct, total, mistakes });
  }

  function askOne(animal) {
    return new Promise((resolve) => {
      let wrong = 0;
      ctx.container.innerHTML = `<div class="tiere-pic">${animal.emoji}</div>`;
      // ... нарисовать три кнопки с названиями.
      // Верный ответ: ctx.sound('correct'); resolve(wrong === 0);
      // Неверный: wrong++; ctx.sound('hint'); показать подсказку, дать ещё одну попытку.
      ctx.speak(animal.word, 'de'); // кнопка «повторить» вызывает тот же speak
    });
  }

  run();                          // не ждём конца серии: start должен вернуться сразу
  return () => { alive = false; };  // очистка при выходе в меню
}
```

### 4. Одна строка в реестре

`modules/registry.json`:

```json
[
  "addition-10",
  "tiere"
]
```

Всё. Файлы в `core/` менять не нужно. Модуль появится в меню, в статистике и в списке включения на экране для родителя.

## Что получает модуль (ctx)

| Поле | Назначение |
|---|---|
| `container` | DOM-корень для модуля |
| `voice` | включена ли озвучка (`core/config.js`); если нет — скройте кнопку «повторить» |
| `speak(text, lang, key?)` | озвучка (`'ru'` или `'de'`) |
| `sound(name)` | `tap`, `correct`, `hint`, `star`, `done` |
| `settings` | `{ seriesLength, speechRate, volume }` |
| `hard` | «трудные» задания прошлых серий (ваши `key`) |
| `finish({ correct, total, mistakes })` | завершает серию |

Звёзды, стикеры, прогресс и экран результата делает ядро.

## Озвучка файлами

Озвучка выключается флагом `VOICE_ENABLED` в `core/config.js`.

`speak(text, lang, key)` сначала ищет `audio/<lang>/<key>.mp3`. Без `key` имя файла строится из текста: «Das Pferd» → `audio/de/das-pferd.mp3`. Если файла нет, используется голос браузера. Чтобы mp3 были доступны офлайн сразу, перечислите их в `files` манифеста (например, `"../../audio/de/das-pferd.mp3"`); иначе они сохранятся после первого воспроизведения.

## Правила и детали

См. [CLAUDE.md](CLAUDE.md): контракт модуля, требования к детскому интерфейсу, устройство ядра.
