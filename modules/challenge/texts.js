// Тексты модуля «Сложное задание». Язык интерфейса — язык раздела: русский, немецкий; английский — по-русски,
// ребёнок английский ещё не знает. Сами рассказы лежат в pools/.

export const LANG_OF = { math: 'ru', orientation: 'ru', russian: 'ru', german: 'de', english: 'en' };

export const TEXT = {
  ru: {
    header: 'Сложное задание',
    note: 'Прочитай и ответь — получишь косточку 🦴',
    hint: 'Подумай ещё раз. Нужное место в тексте подсвечено.',
    hintPlain: 'Подумай ещё раз.',
    hintMath: 'Считай по шагам: сначала первое действие, потом второе.',
    hintOrientation: 'Представь, что смотришь на картинку: лево — там, где левая рука.',
    praise: ['Верно!', 'Молодец!', 'Правильно!'],
    repeatLabel: 'Послушать ещё раз',
  },
  de: {
    header: 'Knifflige Aufgabe',
    note: 'Lies und antworte — du bekommst einen Knochen 🦴',
    hint: 'Denk noch einmal nach. Die passende Stelle im Text ist markiert.',
    hintPlain: 'Denk noch einmal nach.',
    praise: ['Richtig!', 'Super!', 'Toll gemacht!'],
    repeatLabel: 'Noch einmal hören',
  },
  en: {
    header: 'Hello! Story time',
    note: 'Послушай рассказ и выбери картинку — получишь косточку 🦴',
    hint: 'Послушай ещё раз и подумай. Нужное предложение подсвечено.',
    hintPlain: 'Послушай ещё раз и подумай.',
    praise: ['Верно!', 'Молодец!', 'Well done!'],
    repeatLabel: 'Послушать ещё раз',
  },
};
