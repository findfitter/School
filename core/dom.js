// Мелкие помощники для работы с DOM.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in el) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// Касание кнопки: срабатывает при отпускании пальца на самой кнопке.
// click с detail === 0 — это нажатие с клавиатуры (Enter/Пробел).
export function onTap(el, fn) {
  let down = false;
  const release = () => {
    down = false;
    el.classList.remove('pressed');
  };
  el.addEventListener('pointerdown', () => {
    down = true;
    el.classList.add('pressed');
  });
  el.addEventListener('pointerup', (e) => {
    if (!down) return;
    release();
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (under && el.contains(under)) fn(e);
  });
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
  el.addEventListener('click', (e) => {
    if (e.detail === 0) fn(e);
  });
}

export function button(className, label, handler) {
  const el = h('button', { class: className, type: 'button' }, label);
  if (handler) onTap(el, handler);
  return el;
}

export function format(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in values ? values[k] : ''));
}
