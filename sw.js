// Minimal service worker whose only real job is handling the Web Share
// Target POST (see manifest.json's "share_target") — this is what lets
// Android's "Open with" / "Share" sheet offer this installed PWA as a
// destination for a .hidaya file shared from WhatsApp, exactly like the
// native phone app already does via its own Android intent filter.
//
// No caching/offline strategy here — the display page's own offline
// story is handled separately by the "Download Offline Version" feature
// (a fully self-contained standalone .html file), not by this service
// worker.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('hidayafile');
    const text = file ? await file.text() : '';
    // Hand the file content to the real page via localStorage + a redirect
    // (a service worker fetch handler can't write to the page's own
    // localStorage directly, but it CAN return an HTML response that does,
    // then immediately navigates on to index.html).
    const html = `<!DOCTYPE html><html><body><script>
      try {
        localStorage.setItem('hidaya_shared_file_v1', ${JSON.stringify(text)});
      } catch (e) {}
      location.replace('./index.html?shared=1');
    </script></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (e) {
    return Response.redirect('./index.html', 303);
  }
}
