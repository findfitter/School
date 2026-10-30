// Реестр модулей: modules/registry.json -> modules/<id>/manifest.json -> modules/<id>/index.js

import { h } from './dom.js';

const MODULES_URL = new URL('../modules/', import.meta.url);

export async function loadRegistry() {
  const res = await fetch(new URL('registry.json', MODULES_URL));
  const ids = await res.json();
  const manifests = await Promise.all(ids.map(loadManifest));
  return manifests.filter(Boolean);
}

async function loadManifest(id) {
  try {
    const base = new URL(`${id}/`, MODULES_URL);
    const res = await fetch(new URL('manifest.json', base));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    return { ...manifest, id, base: base.href };
  } catch (err) {
    console.warn(`Модуль «${id}» пропущен:`, err);
    return null;
  }
}

export function loadModule(manifest) {
  return import(new URL('index.js', manifest.base).href);
}

// Подключает стили модуля. ready — когда стили загружены, detach — убрать их.
export function attachStyles(manifest) {
  const links = (manifest.styles || []).map((file) =>
    h('link', { rel: 'stylesheet', href: new URL(file, manifest.base).href })
  );
  const ready = Promise.all(
    links.map((link) => new Promise((resolve) => { link.onload = link.onerror = resolve; }))
  );
  document.head.append(...links);
  return { ready, detach: () => links.forEach((l) => l.remove()) };
}

export function moduleIcon(manifest) {
  const icon = manifest.icon || '📘';
  if (/\.(png|svg|jpe?g|webp)$/i.test(icon)) {
    return h('img', { class: 'icon-img', src: new URL(icon, manifest.base).href, alt: '' });
  }
  return h('span', { class: 'icon-emoji', text: icon });
}

// Просит service worker закэшировать файлы модулей, чтобы они работали офлайн.
export async function warmCache(manifests) {
  if (!('serviceWorker' in navigator)) return;
  const urls = ['registry.json'].map((f) => new URL(f, MODULES_URL).href);
  for (const m of manifests) {
    const files = ['manifest.json', 'index.js', ...(m.styles || []), ...(m.files || [])];
    for (const f of files) urls.push(new URL(f, m.base).href);
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'precache', urls: [...new Set(urls)] });
  } catch (err) {
    console.warn('Не удалось передать список файлов service worker', err);
  }
}
