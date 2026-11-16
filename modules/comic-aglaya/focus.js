// «Подъезд» кадра на всю сцену и возврат на место.
// Кадр на странице-«раскладке» бывает очень вытянутым (до 2,6:1), а картинки у нас почти 3:2, поэтому в увеличенном виде
// кадр получает форму картинки (FOCUS_ASPECT) и по центру сцены: картинка почти не обрезается. Сам кадр — container-type: size,
// так что облачка и надписи пересчитываются по новой форме. Движение — transform (с места страницы на центр и обратно).

export const FOCUS_ASPECT = 1.5; // как у картинок (3:2 и 1216×816): ничего не обрезается
const MARGIN = 0.985;
const BACK_MS = 640; // с запасом на transition кадра (0.55 с)

// transform, который ставит кадр точно на его место на странице
function home(h) {
  return `translate(${h.L - h.fl}px, ${h.T - h.ft}px) scale(${h.w / h.fw}, ${h.h / h.fh})`;
}

export function focusPanel(node, stageEl, on) {
  const s = node.style;
  if (on) {
    clearTimeout(node._back);
    const PW = stageEl.clientWidth;
    const PH = stageEl.clientHeight;
    const fw = Math.min(PW, PH * FOCUS_ASPECT) * MARGIN;
    const fh = fw / FOCUS_ASPECT;
    const h = {
      L: node.offsetLeft, T: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight,
      fl: (PW - fw) / 2, ft: (PH - fh) / 2, fw, fh,
    };
    node._home = h;
    s.transition = 'none';
    s.left = `${h.fl}px`;
    s.top = `${h.ft}px`;
    s.width = `${fw}px`;
    s.height = `${fh}px`;
    s.transform = home(h);
    void node.offsetWidth;
    s.transition = '';
    s.transform = '';
    node.classList.add('focus');
    return;
  }
  const h = node._home;
  node.classList.remove('focus');
  if (!h) return;
  s.transform = home(h);
  node._back = setTimeout(() => {
    s.transition = 'none';
    s.left = s.top = s.width = s.height = s.transform = '';
    void node.offsetWidth;
    s.transition = '';
  }, BACK_MS);
}
