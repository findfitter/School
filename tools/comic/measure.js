// Проверка раскладки комикса в браузере (для разработки; в приложение не входит, в офлайн-кэш не попадает).
// В консоли страницы с открытым комиксом (после «Читать»), например по адресу /?comic=1:
//   const { measure } = await import('/tools/comic/measure.js');
//   await measure([0, 1, 2])      // главы по индексу (0 — первая); по умолчанию все шесть
// Каждый кадр строится так же, как в игре, «подъезжает» (focus.js) и проверяется:
//   • кадр целиком внутри сцены;
//   • облачка внутри кадра и не заходят на героев;
//   • герои не вылезают за кадр;
//   • жёлтые надписи-звуки (sfx) не лежат на героях, облачках и предметах и не выходят за кадр.
// Возвращает текст: по строке на кадр, «ok» или список замечаний.

export async function measure(chapters = [0, 1, 2, 3, 4, 5]) {
  const { buildPanel } = await import('/modules/comic-aglaya/panel.js');
  const { focusPanel } = await import('/modules/comic-aglaya/focus.js');
  const { STORY, HEROES } = await import('/modules/comic-aglaya/story.js');
  const real = document.querySelector('.cmx-stage');
  if (!real) throw new Error('Откройте комикс (Читать), потом запускайте проверку');
  const sr = real.getBoundingClientRect();
  const wrap = document.createElement('div');
  wrap.className = 'cmx';
  wrap.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999;display:block;background:#fff';
  const stage = document.createElement('div');
  stage.className = 'cmx-stage';
  stage.style.cssText = `position:absolute;left:${sr.left}px;top:${sr.top}px;width:${sr.width}px;height:${sr.height}px;flex:none`;
  wrap.append(stage);
  document.body.append(wrap);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const share = (a, b) => Math.round((area(a, b) / (a.width * a.height)) * 100);
  const out = [];
  try {
    for (const ci of chapters) {
      for (const [pi, pg] of STORY.chapters[ci].pages.entries()) {
        const pageEl = document.createElement('div');
        pageEl.className = 'cmx-page';
        pageEl.dataset.layout = pg.panels.length === 4 ? 'B' : 'A';
        stage.replaceChildren(pageEl);
        const panels = pg.panels.map((d, i) => {
          const slot = document.createElement('div');
          slot.className = `cmx-slot pos-${i}`;
          pageEl.append(slot);
          const p = buildPanel(d, HEROES);
          p.el.classList.add(`pos-${i}`);
          pageEl.append(p.el);
          return p;
        });
        for (const [i, p] of panels.entries()) {
          const node = p.el;
          node.classList.remove('pre');
          focusPanel(node, stage, true);
          node.style.transition = 'none';
          p.play();
          await sleep(330);
          node.getAnimations({ subtree: true }).forEach((a) => { try { a.finish(); } catch (e) { /* уже закончилась */ } });
          const pr = node.getBoundingClientRect();
          const st = stage.getBoundingClientRect();
          const bubs = p.bubbles.map((b) => b.el.getBoundingClientRect());
          const heroes = [...node.querySelectorAll('.cmx-hero-img, .cmx-face')].map((x) => x.getBoundingClientRect());
          const props = [...node.querySelectorAll('.cmx-prop')].map((x) => x.getBoundingClientRect());
          const sfx = [...node.querySelectorAll('.cmx-sfx')].map((x) => ({ t: x.textContent, r: x.getBoundingClientRect() }));
          const issues = [];
          if (pr.left < st.left - 1 || pr.right > st.right + 1 || pr.top < st.top - 1 || pr.bottom > st.bottom + 1) issues.push('кадр вылез за сцену');
          if (bubs.some((b) => b.left < pr.left - 1 || b.right > pr.right + 1 || b.top < pr.top - 1 || b.bottom > pr.bottom + 1)) issues.push('облачко вылезло за кадр');
          const heroTop = heroes.length ? Math.min(...heroes.map((r) => r.top)) : null;
          const bubBottom = bubs.length ? Math.max(...bubs.map((b) => b.bottom)) : 0;
          if (heroTop != null && bubBottom > heroTop + 2) issues.push(`облачка на герое (низ ${Math.round(((bubBottom - pr.top) / pr.height) * 100)}%, верх героя ${Math.round(((heroTop - pr.top) / pr.height) * 100)}%)`);
          for (const r of heroes) {
            const d = [Math.round(pr.left - r.left), Math.round(r.right - pr.right), Math.round(pr.top - r.top)]; // слева, справа, сверху (px)
            if (d.some((v) => v > 2)) issues.push(`герой вылез за кадр (слева/справа/сверху, px: ${d.join('/')}; кадр ${Math.round(pr.width)}×${Math.round(pr.height)})`);
          }
          for (const f of sfx) {
            const onHero = Math.max(0, ...heroes.map((r) => share(f.r, r)));
            const onBub = Math.max(0, ...bubs.map((r) => share(f.r, r)));
            const onProp = Math.max(0, ...props.map((r) => share(f.r, r)));
            if (!p.data.splash && onHero > 3) issues.push(`«${f.t}» на герое (${onHero}%)`);
            if (onBub > 3) issues.push(`«${f.t}» на облачке (${onBub}%)`);
            if (onProp > 3) issues.push(`«${f.t}» на предмете (${onProp}%)`);
            if (f.r.left < pr.left || f.r.right > pr.right || f.r.top < pr.top || f.r.bottom > pr.bottom) issues.push(`«${f.t}» вылезла за кадр`);
          }
          out.push(`гл${ci + 1} с${pi + 1} к${i + 1} [${p.data.splash || p.data.bg}] ${issues.join('; ') || 'ok'}`);
          focusPanel(node, stage, false);
          node.classList.add('pre');
        }
      }
    }
  } finally {
    wrap.remove();
  }
  return out.join('\n');
}
