// Фактура бумаги рисуется ОДИН раз при старте и дальше лежит обычной картинкой (CSS-переменная --tex-paper).
// Раньше на каждый разворот книги ставился живой SVG-фильтр feTurbulence на весь экран — это самое дорогое место
// акварельного оформления на слабом Хромбуке. Плитка 512×512 бесшовная (stitchTiles), повторяется как фон.
// Пока картинка не готова (или если браузер её не отдал), --tex-paper = none: бумага просто без зерна.

const SIZE = 512;
const NS = 'http://www.w3.org/2000/svg';

const PAPER_SVG = `<svg xmlns="${NS}" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <filter id="p" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="2" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0.24 0 0 0 -0.05"/>
  </filter>
  <rect width="${SIZE}" height="${SIZE}" filter="url(#p)"/>
</svg>`;

export function installTextures() {
  const root = document.documentElement;
  const render = () => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) root.style.setProperty('--tex-paper', `url("${URL.createObjectURL(blob)}")`);
        }, 'image/png');
      } catch {
        // без текстуры бумага остаётся гладкой
      }
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PAPER_SVG)}`;
  };
  // не мешаем первой отрисовке меню
  if ('requestIdleCallback' in window) requestIdleCallback(render, { timeout: 800 });
  else setTimeout(render, 50);
}
