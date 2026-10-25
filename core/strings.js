// ВСЕ тексты интерфейса ядра — только здесь.
// Тексты самих модулей лежат в modules/<id>/texts.js.

export const STR = {
  appTitle: 'Моя школа',

  // lang — язык, на котором ребёнок видит и слышит служебные тексты после заданий этого предмета.
  subjects: {
    math: { title: 'Математика', icon: '🔢', lang: 'ru' },
    russian: { title: 'Русский язык', icon: '📖', lang: 'ru' },
    german: { title: 'Deutsch', icon: '🇩🇪', lang: 'de' },
    orientation: { title: 'Право и лево', icon: '↔️', lang: 'ru' },
    other: { title: 'Другое', icon: '🧩', lang: 'ru' },
  },
  subjectOrder: ['math', 'orientation', 'russian', 'german'],

  common: {
    home: 'Домой',
    back: 'Назад',
    cancel: 'Отмена',
    repeat: 'Повторить',
  },

  menu: {
    stickers: 'Наклейки',
    parent: 'Родителям',
    done: 'Пройдено',
    empty: 'Пока нет заданий. Модули включаются в разделе для родителей.',
  },

  // Служебные тексты для ребёнка — на языке предмета.
  result: {
    ru: {
      praise: { 1: 'Молодец! Попробуем ещё?', 2: 'Здорово!', 3: 'Отлично!' },
      score: 'Верно: {correct} из {total}',
      newSticker: 'Новая наклейка!',
      superPopup: {
        title: 'Ура! Супер-наклейка!',
        text: 'Ты получила «{name}»! Твоя сказка растёт.',
        ok: 'Ура!',
      },
      nextTask: 'Отлично! Выбери другое задание.',
      again: 'Ещё раз',
      toMenu: 'В меню',
    },
    de: {
      praise: { 1: 'Gut gemacht! Noch einmal?', 2: 'Toll gemacht!', 3: 'Super!' },
      score: '{correct} von {total} richtig',
      newSticker: 'Neuer Sticker!',
      superPopup: {
        title: 'Hurra! Super-Sticker!',
        text: 'Du hast «{name}» bekommen! Dein Märchen wächst.',
        ok: 'Hurra!',
      },
      nextTask: 'Prima! Such dir eine andere Aufgabe aus.',
      again: 'Nochmal',
      toMenu: 'Menü',
    },
  },

  stickers: {
    title: 'Мои наклейки',
    progress: 'До новой наклейки: {left} ⭐',
    complete: 'Все наклейки собраны! 🎉',
    locked: '{stars} ⭐',
    superTitle: 'Моя сказка',
    superHint: 'Пройди все задания круга — в сказке появится новый предмет!',
    superMore: 'Ещё сокровища',
  },

  errors: {
    module: 'Не получилось открыть задание. Вернёмся в меню.',
  },

  parent: {
    title: 'Для родителей',
    totalStars: 'Звёзд: {stars} · Супер-наклеек: {supers}',
    statsTitle: 'Статистика',
    statsHead: { module: 'Модуль', series: 'Серий', accuracy: 'Точность', hard: 'Трудные задания' },
    statsNone: '—',
    modulesTitle: 'Модули',
    settingsTitle: 'Настройки',
    seriesLength: 'Заданий в серии',
    volume: 'Громкость',
    speechRate: 'Скорость речи',
    speechTest: 'Проверить',
    voiceRu: 'Голос: русский',
    voiceDe: 'Голос: немецкий',
    voiceAuto: 'Автоматически',
    voiceOnline: '(интернет)',
    voiceNone: 'Нет голосов',
    speechSampleRu: 'Привет! Давай учиться.',
    speechSampleDe: 'Hallo! Los geht’s.',
    dataTitle: 'Данные',
    export: 'Сохранить прогресс в файл',
    import: 'Загрузить прогресс из файла',
    importOk: 'Прогресс загружен.',
    importFail: 'Не удалось прочитать файл.',
    reset: 'Сбросить прогресс',
    resetConfirm: 'Сбросить весь прогресс, звёзды и наклейки? Это нельзя отменить.',
    resetYes: 'Да, сбросить',
    resetDone: 'Прогресс сброшен.',
    on: 'Вкл',
    off: 'Выкл',
  },
};
