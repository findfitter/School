// Шесть видов заданий на чтение. Каждое возвращает Promise<boolean>: верно ли с первой попытки.
// Правильный ответ берётся из самой истории (текст облачка, герой, место), в данных лежат только неверные.
// Ошибка — мягкая подсказка и ещё одна попытка; кнопки ≥ 64 px, нажатие через Pointer Events (+ Enter/Пробел).

import { el, portraitEl } from './art.js';

const TAP_PAD = 24;

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function onTap(node, fn) {
  let armed = false;
  const inside = (e) => {
    const r = node.getBoundingClientRect();
    return e.clientX > r.left - TAP_PAD && e.clientX < r.right + TAP_PAD && e.clientY > r.top - TAP_PAD && e.clientY < r.bottom + TAP_PAD;
  };
  node.addEventListener('pointerdown', (e) => {
    if (node.disabled) return;
    armed = true;
    node.setPointerCapture?.(e.pointerId);
    node.classList.add('pressed');
  });
  node.addEventListener('pointerup', (e) => {
    const was = armed;
    armed = false;
    node.classList.remove('pressed');
    if (was && inside(e)) fn();
  });
  node.addEventListener('pointercancel', () => {
    armed = false;
    node.classList.remove('pressed');
  });
  node.addEventListener('click', (e) => {
    if (e.detail === 0) fn();
  });
}

function button(className, ...kids) {
  const b = el('button', className);
  b.type = 'button';
  b.append(...kids);
  return b;
}

// Выбор из вариантов. entries: [{ node, right }]. Возвращает Promise<boolean>.
function choose(env, entries, { onRight, onWrong } = {}) {
  return new Promise((resolve) => {
    let wrong = 0;
    let locked = false;
    for (const { node, right } of entries) {
      onTap(node, async () => {
        if (locked || node.disabled) return;
        if (!right) {
          wrong += 1;
          env.ctx.sound('hint');
          node.classList.add('faded');
          node.disabled = true;
          env.hint();
          onWrong?.(wrong);
          return;
        }
        locked = true;
        env.ctx.sound('correct');
        env.praise();
        node.classList.add('right');
        for (const e of entries) if (e.node !== node) e.node.classList.add('faded');
        await onRight?.();
        resolve(wrong === 0);
      });
    }
  });
}

const textOption = (text) => button('cmx-opt', el('span', 'cmx-opt-text', text));

// Вопрос с тремя ответами (правильный — task.right).
function askTask(text, task, env) {
  env.ask(text);
  const entries = shuffle([task.right, ...task.decoys]).map((t) => ({ node: textOption(t), right: t === task.right }));
  env.options(entries.map((e) => e.node));
  return choose(env, entries, { onRight: () => env.wait(900) });
}

// ---------- виды заданий ----------
const TASKS = {
  // вставь слово вместо «___» в облачке
  fill(task, view, env) {
    const b = view.bubbles[task.bubble];
    const [before, after] = b.data.text.split('___');
    const blank = el('span', 'cmx-blank', env.TEXT.blank);
    b.textEl.replaceChildren(before, blank, after);
    env.ask(env.TEXT.fill);
    const entries = shuffle([task.word, ...task.decoys]).map((w) => ({ node: textOption(w), right: w === task.word }));
    env.options(entries.map((e) => e.node));
    return choose(env, entries, {
      onRight: () => {
        blank.textContent = task.word;
        blank.classList.add('filled');
        return env.wait(900);
      },
    });
  },

  // выбери фразу, которая подходит в облачко (облачко пока пустое)
  pick(task, view, env) {
    const b = view.bubbles[task.bubble];
    b.textEl.textContent = env.TEXT.emptyBubble;
    b.el.classList.add('empty');
    const name = b.data.who ? env.HEROES[b.data.who]?.name : '';
    env.ask(name ? `${env.TEXT.pick} ${name}?` : env.TEXT.pickNoName);
    const entries = shuffle([b.data.text, ...task.decoys]).map((t) => ({ node: textOption(t), right: t === b.data.text }));
    env.options(entries.map((e) => e.node));
    return choose(env, entries, {
      onRight: () => {
        b.textEl.textContent = b.data.text;
        b.el.classList.remove('empty');
        b.el.classList.add('revealed');
        return env.wait(1100);
      },
    });
  },

  // кто это сказал
  who(task, view, env) {
    const b = view.bubbles[task.bubble];
    b.el.classList.add('unknown');
    env.ask(`${env.TEXT.who}\n«${b.data.text}»`); // цитата в вопросе: ясно, про какое облачко речь
    const card = (who) => button('cmx-opt hero', portraitEl(who), el('span', 'cmx-opt-text', env.HEROES[who].name));
    const entries = shuffle([b.data.who, ...task.decoys]).map((w) => ({ node: card(w), right: w === b.data.who }));
    env.options(entries.map((e) => e.node));
    return choose(env, entries, {
      onRight: () => {
        b.el.classList.remove('unknown');
        view.heroes[b.data.who]?.classList.add('speaker');
        return env.wait(1000);
      },
    });
  },

  // что будет дальше (ответ подтвердит следующий кадр)
  next(task, view, env) {
    return askTask(`${env.TEXT.guess} ${task.ask.charAt(0).toLowerCase()}${task.ask.slice(1)}`, task, env);
  },

  // вопрос по прочитанному: три ответа
  ask(task, view, env) {
    return askTask(task.ask, task, env);
  },

  // правда или нет: утверждение про прочитанное; у неверного после ответа показывается, как правильно
  tf(task, view, env) {
    env.ask(`${env.TEXT.tf}\n${task.text}`); // две строки: «Правда или нет?» и утверждение
    const yes = button('cmx-opt yes', el('span', 'cmx-opt-text', `✔ ${env.TEXT.yes}`));
    const no = button('cmx-opt no', el('span', 'cmx-opt-text', `✖ ${env.TEXT.no}`));
    env.options([yes, no]);
    return choose(env, [{ node: yes, right: task.truth }, { node: no, right: !task.truth }], {
      onRight: () => {
        if (task.truth || !task.fix) return env.wait(900);
        env.ask(`${env.TEXT.fix} ${task.fix}`);
        return env.wait(2600);
      },
    });
  },

  // расставь три предложения по порядку: нажимай в том порядке, как было в истории
  order(task, view, env) {
    env.ask(env.TEXT.order);
    env.slots(task.lines.length); // пустые клеточки 1, 2, 3 рядом с вопросом: заполняются по мере верных нажатий
    return new Promise((resolve) => {
      let step = 0;
      let wrong = 0;
      const cards = shuffle(task.lines).map((line) => {
        const node = textOption(line);
        node.dataset.line = line;
        return node;
      });
      env.options(cards);
      for (const node of cards) {
        onTap(node, async () => {
          if (node.disabled) return;
          if (node.dataset.line !== task.lines[step]) {
            wrong += 1;
            env.ctx.sound('hint');
            env.hint();
            node.classList.remove('shake');
            void node.offsetWidth;
            node.classList.add('shake');
            return;
          }
          env.ctx.sound('tap');
          step += 1;
          env.fillSlot(step - 1);
          node.disabled = true;
          node.classList.add('right');
          node.prepend(el('span', 'cmx-num', String(step)));
          if (step === task.lines.length) {
            env.ctx.sound('correct');
            env.praise();
            await env.wait(1000);
            resolve(wrong === 0);
          }
        });
      }
    });
  },
};

export function runTask(task, view, env) {
  return TASKS[task.type](task, view, env);
}
