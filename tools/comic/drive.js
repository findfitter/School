// Автопроход комикса в браузере (для проверки; в приложение не входит, в офлайн-кэш не попадает).
// В консоли страницы с открытым модулем «Аглая и гусь» (после «Читать»):
//   const { drive } = await import('/tools/comic/drive.js');
//   await drive(0, 1, 5)    // глава 1 (индекс 0): пройти кадры 1–4 верно и остановиться перед кадром 5
//   await drive(0, 5, 999)  // дальше до конца главы
// На чётных кадрах сначала нарочно отвечает неверно, чтобы проверить подсказку.
// Нажатия идут через element.click() (detail === 0 — тот же запасной путь, что у клавиатуры).

export async function drive(chIdx, START = 1, STOP = 999) {
  const { STORY, HEROES } = await import('/modules/comic-aglaya/story.js');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, t = 9000) => {
    const s = Date.now();
    while (Date.now() - s < t) {
      const v = fn();
      if (v) return v;
      await sleep(60);
    }
    throw new Error('timeout: ' + fn.toString().slice(0, 80));
  };
  const q = (s) => [...document.querySelectorAll(s)];
  const ch = STORY.chapters[chIdx];
  const log = [];
  let n = 0;
  for (const [pi, page] of ch.pages.entries()) {
    for (const [i, pn] of page.panels.entries()) {
      n++;
      if (n < START) continue;
      await until(() => document.querySelector(`.cmx-page:not(.leave) .cmx-panel.focus.pos-${i}`));
      if (n === STOP) return log.concat(['stopped before panel ' + n]);
      const t = pn.task;
      if (!t) {
        (await until(() => document.querySelector('.cmx-opts .cmx-next'))).click();
        log.push(n + ': next');
      } else {
        await until(() => document.querySelector('.cmx-bar.active') && document.querySelector('.cmx-opts .cmx-opt'));
        const opts = () => q('.cmx-opts .cmx-opt');
        const byText = (s) => opts().find((o) => o.textContent.trim() === s || o.textContent.includes(s));
        let right;
        let wrongNode;
        if (t.type === 'fill') { right = byText(t.word); wrongNode = byText(t.decoys[0]); }
        if (t.type === 'pick') { right = byText(pn.bubbles[t.bubble].text); wrongNode = byText(t.decoys[0]); }
        if (t.type === 'who') { right = opts().find((o) => o.textContent.includes(HEROES[pn.bubbles[t.bubble].who].name)); wrongNode = opts().find((o) => o !== right); }
        if (t.type === 'next') { right = byText(t.right); wrongNode = byText(t.decoys[0]); }
        if (t.type === 'ask') { right = byText(t.right); wrongNode = byText(t.decoys[0]); }
        if (t.type === 'tf') { right = opts().find((o) => o.textContent.includes(t.truth ? '✔' : '✖')); wrongNode = opts().find((o) => o !== right); }
        if (t.type === 'order') {
          for (const line of t.lines) {
            await until(() => opts().find((o) => o.dataset.line === line && !o.disabled)).then((o) => o.click());
            await sleep(120);
          }
          log.push(n + ': order ok');
        } else {
          if (!right) throw new Error('нет правильного варианта: ' + n + ' ' + t.type);
          if (n % 2 === 0 && wrongNode) {
            wrongNode.click();
            await sleep(150);
            log.push(n + ': hint=' + document.querySelector('.cmx-ask').textContent);
          }
          right.click();
          log.push(n + ': ' + t.type + ' ok');
        }
        await sleep(300);
      }
      await until(() => !document.querySelector('.cmx-panel.focus') || document.querySelector('.cmx-opts .cmx-next') || document.querySelector('.cmx-title'), 9000).catch(() => {});
      await sleep(700);
    }
    if (pi < ch.pages.length - 1 && n >= START) {
      (await until(() => document.querySelector('.cmx-opts .cmx-next'))).click();
      log.push('page turn');
      await sleep(900);
    }
  }
  return log;
}
