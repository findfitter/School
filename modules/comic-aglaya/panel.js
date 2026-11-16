// Один кадр комикса: фон, герои, предметы, облачка, эффекты. Все анимации одноразовые (transform / opacity).

import { el, sceneEl, heroEl, propEl } from './art.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const UNDER = new Set(['plaid', 'tracks', 'puddle']); // лежат на земле — рисуются под героями

// ---------- эффекты ----------
const FX = {
  speed: (p) => p.fx.append(el('div', 'cmx-speed')),
  dots: (p) => p.fx.append(el('div', 'cmx-halftone')),
  rain: (p) => p.fx.append(el('div', 'cmx-rain')),
  flash: (p) => p.fx.append(el('div', 'cmx-flash')),
  shake: (p) => {
    p.inner.classList.remove('shaking');
    void p.inner.offsetWidth; // перезапуск анимации
    p.inner.classList.add('shaking');
  },
  zoom: (p) => p.scene.classList.add('zooming'),
  feathers: (p) => burst(p, '🪶', 7),
  stars: (p) => burst(p, '⭐', 6),
  zzz: (p) => burst(p, '💤', 3, 'zzz'),
  exclaim: (p, who) => mark(p, who, '!'),
  question: (p, who) => mark(p, who, '?'),
};

function burst(p, glyph, n, kind = 'burst') {
  for (let i = 0; i < n; i++) {
    const s = el('span', `cmx-${kind}`, glyph);
    s.style.setProperty('--x', `${rnd(15, 85)}%`);
    s.style.setProperty('--y', `${rnd(20, 60)}%`);
    s.style.setProperty('--dx', `${rnd(-18, 18)}cqw`);
    s.style.setProperty('--dy', `${rnd(-26, -8)}cqh`);
    s.style.setProperty('--r', `${rnd(-40, 40)}deg`);
    s.style.animationDelay = `${i * 70}ms`;
    p.fx.append(s);
  }
}

function mark(p, who, glyph) {
  const hero = p.heroes[who];
  if (!hero) return;
  hero.append(el('span', 'cmx-mark', glyph));
}

// Надпись-звук («ВЖУХ!», «ПЛЮХ!») ставится в свободное место: не на героев, не на облачка, не на предметы.
// Работаем по размерам раскладки (offset*), а не по getBoundingClientRect: кадр в этот момент ещё «подъезжает», а у облачек
// идёт анимация появления. У больших кадров-картинок (splash) героев в разметке нет, там место задаёт сам кадр (f.y — % сверху).
const BASE = { m: 8, l: 11, xl: 16 }; // размер шрифта в cqmin
const TRIES = [1, 0.86, 0.72, 0.6]; // если места мало — надпись уменьшается

function boxIn(node, root) {
  let x = 0;
  let y = 0;
  for (let e = node; e && e !== root; e = e.offsetParent) {
    x += e.offsetLeft;
    y += e.offsetTop;
  }
  return { x, y, w: node.offsetWidth, h: node.offsetHeight };
}
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

function obstacles(p, self) {
  const list = [];
  for (const b of p.bubbles) list.push(boxIn(b.el, p.inner));
  for (const n of p.cast.querySelectorAll('.cmx-hero-img, .cmx-face')) {
    const r = boxIn(n, p.inner);
    list.push({ x: r.x + r.w * 0.06, y: r.y + r.h * 0.04, w: r.w * 0.88, h: r.h * 0.96 });
  }
  for (const n of [...p.props.children, ...p.under.children]) list.push(boxIn(n, p.inner));
  for (const n of p.sfx.children) if (n !== self) list.push(boxIn(n, p.inner)); // уже поставленные надписи
  return list;
}

function addSfx(p, f) {
  const s = el('div', `cmx-sfx size-${f.size}`, f.sfx);
  s.style.setProperty('--tilt', `${rnd(-9, 9)}deg`);
  p.sfx.append(s);
  if (p.data.splash) {
    s.classList.add(`at-${f.at}`);
    s.style.top = `${f.y ?? 40}%`;
    return;
  }
  const W = p.inner.clientWidth;
  const H = p.inner.clientHeight;
  const pad = Math.min(W, H) * 0.05; // запас на наклон надписи и обводку
  const bars = obstacles(p, s);
  const wantX = f.at === 'l' ? 0 : f.at === 'r' ? 1 : 0.5;
  let best = null;
  for (const k of TRIES) {
    s.style.fontSize = `${BASE[f.size] * k}cqmin`;
    const w = s.offsetWidth + pad * 2;
    const h = s.offsetHeight + pad * 2;
    for (let y = H * 0.04; y + h <= H * 0.97; y += H * 0.03) {
      for (let x = W * 0.02; x + w <= W * 0.98; x += W * 0.02) {
        const box = { x, y, w, h };
        const hit = bars.reduce((sum, o) => sum + overlap(box, o), 0);
        const cost = hit * 1000 + Math.abs((x + w / 2) / W - (wantX === 0.5 ? 0.5 : wantX === 0 ? 0.22 : 0.78)) + Math.abs((y + h / 2) / H - 0.42) * 0.6;
        if (!best || cost < best.cost) best = { cost, x: x + pad, y: y + pad, hit };
      }
    }
    if (best && best.hit === 0) break; // нашли свободное место
  }
  if (best) {
    s.style.left = `${best.x}px`;
    s.style.top = `${best.y}px`;
  }
}

// ---------- кадр ----------
// data — кадр из story.js; heroes — имена героев. Возвращает { el, bubbles, heroes, ... , play() }.
export function buildPanel(data, HEROES) {
  const root = el('div', 'cmx-panel pre');
  const inner = el('div', 'cmx-inner');
  const scene = sceneEl(data.bg, data.splash);
  const fx = el('div', 'cmx-fx');
  const cast = el('div', 'cmx-cast');
  const props = el('div', 'cmx-props');
  const under = el('div', 'cmx-props under'); // то, что лежит на земле: герой стоит поверх
  const bubblesBox = el('div', 'cmx-bubbles');
  const sfxBox = el('div', 'cmx-sfxbox');
  const heroes = {};
  const atOf = {};

  if (!data.splash) {
    for (const c of data.cast) {
      const h = heroEl(c.who, c.pose, c.at);
      heroes[c.who] = h;
      atOf[c.who] = c.at;
      cast.append(h);
    }
    for (const [id, at] of data.props) (UNDER.has(id) ? under : props).append(propEl(id, at));
  } else {
    for (const c of data.cast) atOf[c.who] = c.at;
  }

  const bubbles = data.bubbles.map((b, i) => {
    const box = el('div', `cmx-bubble ${b.kind} ${b.kind === 'box' ? '' : `at-${atOf[b.who] || 'c'}`}`);
    const text = el('span', 'cmx-btext', b.text);
    const shell = el('div', 'cmx-bshell');
    shell.append(text);
    box.append(shell);
    box.style.setProperty('--d', `${180 + i * 380}ms`);
    return { el: box, textEl: text, data: b };
  });
  bubbles.forEach((b) => bubblesBox.append(b.el));

  inner.append(scene, fx, under, cast, props, bubblesBox, sfxBox);
  root.append(inner);

  const parts = { el: root, inner, scene, fx, sfx: sfxBox, heroes, bubbles, data, cast, props, under };

  // Показать кадр «вживую»: облачки выпрыгивают по очереди, эффекты срабатывают.
  parts.play = () => {
    root.classList.add('live');
    setTimeout(() => {
      for (const f of data.fx) {
        if (typeof f === 'object') addSfx(parts, f);
        else {
          const [name, arg] = f.split(':');
          FX[name]?.(parts, arg);
        }
      }
    }, 260);
  };
  return parts;
}
