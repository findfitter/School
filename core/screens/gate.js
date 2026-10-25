// Проверка «только для взрослых» перед экраном родителя: нужно решить пример на умножение
// (взрослый решит сразу, ребёнок 1 класса таблицу умножения ещё не знает).
// Ответ вводится цифрами на экране или с клавиатуры. После нескольких ошибок — короткая пауза.

import { h, button, format } from '../dom.js';
import { STR } from '../strings.js';

const G = STR.gate;
const MAX_WRONG = 3; // столько ошибок подряд — и пауза
const PAUSE_SECONDS = 30;
const MAX_DIGITS = 3;

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function makeQuestion() {
  const a = rnd(6, 9);
  const b = rnd(6, 9);
  return { a, b, answer: a * b };
}

// onPass — ответ верный, onCancel — кнопка «Назад». Возвращает { el, onLeave }.
export function renderGate(app, { onPass, onCancel }) {
  let question = makeQuestion();
  let typed = '';
  let wrong = 0;
  let pauseTimer = null;

  const questionEl = h('div', { class: 'gate-question' });
  const answerEl = h('div', { class: 'gate-answer', 'aria-live': 'polite' });
  const messageEl = h('div', { class: 'gate-message' });
  const keys = [];

  const paint = () => {
    questionEl.textContent = format(G.question, { a: question.a, b: question.b });
    answerEl.textContent = typed || '·';
  };

  const setPaused = (paused) => keys.forEach((k) => { k.disabled = paused; });

  const submit = () => {
    if (!typed || pauseTimer) return;
    if (Number(typed) === question.answer) {
      app.services.sounds('correct');
      onPass();
      return;
    }
    wrong += 1;
    typed = '';
    question = makeQuestion(); // новый пример: угадать не получится
    app.services.sounds('hint');
    answerEl.classList.remove('shake');
    void answerEl.offsetWidth; // перезапуск анимации
    answerEl.classList.add('shake');
    if (wrong >= MAX_WRONG) {
      wrong = 0;
      let left = PAUSE_SECONDS;
      setPaused(true);
      messageEl.textContent = format(G.wait, { sec: left });
      pauseTimer = setInterval(() => {
        left -= 1;
        if (left > 0) {
          messageEl.textContent = format(G.wait, { sec: left });
          return;
        }
        clearInterval(pauseTimer);
        pauseTimer = null;
        setPaused(false);
        messageEl.textContent = G.hint;
      }, 1000);
    } else {
      messageEl.textContent = G.wrong;
    }
    paint();
  };

  const press = (digit) => {
    if (pauseTimer || typed.length >= MAX_DIGITS) return;
    typed += digit;
    messageEl.textContent = G.hint;
    paint();
  };

  const erase = () => {
    typed = typed.slice(0, -1);
    paint();
  };

  const pad = h('div', { class: 'gate-pad' });
  for (const label of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']) {
    const handler = label === '⌫' ? erase : label === '✓' ? submit : () => press(label);
    const key = button(`gate-key${label === '✓' ? ' ok' : ''}`, label, handler);
    keys.push(key);
    pad.append(key);
  }

  // Клавиатура Хромбука: цифры, Backspace, Enter.
  const onKey = (e) => {
    if (e.key >= '0' && e.key <= '9') press(e.key);
    else if (e.key === 'Backspace') erase();
    else if (e.key === 'Enter') submit();
  };
  document.addEventListener('keydown', onKey);

  const screen = h('div', { class: 'screen gate-screen' },
    h('h1', { text: G.title }),
    messageEl,
    questionEl,
    answerEl,
    pad,
    button('btn quiet', `⬅ ${G.back}`, onCancel));
  messageEl.textContent = G.hint;
  paint();

  return {
    el: screen,
    onLeave: () => {
      document.removeEventListener('keydown', onKey);
      if (pauseTimer) clearInterval(pauseTimer);
    },
  };
}
