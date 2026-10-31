// Цифровая клавиатура для ввода ответа. Общая для модулей арифметики: лежит в addition-10, остальные подключают её
// (../addition-10/keypad.js и keypad.css — файлы перечислены в их манифестах). Это исключение из правила
// «модуль самодостаточен», как у english-quiz.
//
// createKeypad({ digits, onInput, onComplete }) -> { el, clear(), lock(on) }
//   digits — сколько цифр в верном ответе: ответ отправляется сам, когда набрано столько цифр;
//   onInput(text) — набранное изменилось (показать в «?»); onComplete(text) — набрано нужное число цифр.

const KEYS = ['1', '2', '3', '4', '5', '⌫', '6', '7', '8', '9', '0'];

function onTap(button, fn) {
  let down = false;
  button.addEventListener('pointerdown', () => {
    down = true;
    button.classList.add('pressed');
  });
  button.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    button.classList.remove('pressed');
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (under && button.contains(under)) fn();
  });
  const cancel = () => {
    down = false;
    button.classList.remove('pressed');
  };
  button.addEventListener('pointercancel', cancel);
  button.addEventListener('pointerleave', cancel);
  button.addEventListener('click', (e) => {
    if (e.detail === 0) fn(); // Enter / Пробел
  });
}

export function createKeypad({ digits, onInput = () => {}, onComplete = () => {} }) {
  let text = '';
  let locked = false;
  const el = document.createElement('div');
  el.className = 'kp';

  const press = (key) => {
    if (locked) return;
    if (key === '⌫') {
      text = text.slice(0, -1);
    } else if (text.length < digits) {
      text += key;
    } else {
      return;
    }
    onInput(text);
    if (text.length === digits) onComplete(text);
  };

  for (const key of KEYS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key === '⌫' ? 'kp-key kp-back' : 'kp-key';
    button.textContent = key;
    if (key === '⌫') button.setAttribute('aria-label', 'Стереть');
    onTap(button, () => press(key));
    el.append(button);
  }

  return {
    el,
    clear() {
      text = '';
      onInput(text);
    },
    lock(on) {
      locked = Boolean(on);
    },
  };
}
