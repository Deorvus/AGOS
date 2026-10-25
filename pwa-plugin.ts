import type { Plugin } from 'vite'
import { createHash } from 'node:crypto'

// Cache the versioned app shell only. Sensor POSTs, map tiles, searches and
// remote APIs never enter this cache. Readings have a separately labelled cache.
export function agosPwa(): Plugin {
  let base = '/'
  return {
    name: 'agos-offline-shell',
    apply: 'build',
    configResolved(config) { base = config.base },
    generateBundle(_, bundle) {
      if (!base.startsWith('/')) throw new Error('PWA build requires a local path base')
      // Vite emits index.html after this hook; include it explicitly.
      const files = ['index.html', ...Object.keys(bundle).filter(f => /\.(js|css)$/.test(f)), 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']
      const version = createHash('sha256').update(files.join(',')).digest('hex').slice(0,12)
      const urls = files.map(f => base + f)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'agos-shell-${version}';
const URLS = ${JSON.stringify(urls)};
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('agos-shell-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  const path = new URL(e.request.url).pathname;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(${JSON.stringify(base + 'index.html')})));
  } else if (URLS.includes(path)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});
` })
    },
  }
}
