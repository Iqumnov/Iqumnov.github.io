export default {
  async fetch(request, env) {
    const ua = (request.headers.get('user-agent') || '').toLowerCase();
    const url = new URL(request.url);

    const isTerminalClient =
      ua.includes('curl') ||
      ua.includes('wget') ||
      ua.includes('httpie') ||
      url.pathname === '/terminal' ||
      url.pathname === '/terminal.txt' ||
      url.pathname === '/raw';

    // 1. Direct blog post fetch for terminal/curl clients: e.g. /blog/pqc-lattice-formal-verification(.md)
    if (url.pathname.startsWith('/blog/')) {
      const slug = url.pathname.replace(/^\/blog\//, '').replace(/\.(md|txt)$/, '');
      if (slug && isTerminalClient) {
        const mdRes = await env.ASSETS.fetch(new URL(`/blog/${slug}.md`, request.url));
        if (mdRes.ok) {
          return new Response(await mdRes.text(), {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      }
    }

    // 2. Terminal client detection for homepage -> terminal.txt
    if (isTerminalClient) {
      const res = await env.ASSETS.fetch(new URL('/terminal.txt', request.url));
      return new Response(await res.text(), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // 3. Static Web Application assets
    return env.ASSETS.fetch(request);
  }
};
