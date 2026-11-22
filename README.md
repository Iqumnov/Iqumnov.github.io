# Matvei Igumnov // Personal Website

> Quantum Security, Cryptographic Engineering, and Low-Level Systems Defense.

* **Live Web Edition**: [https://iqumnov.com](https://iqumnov.com)
* **Plaintext Terminal Edition**: `curl -sL https://iqumnov.com` (or `https://iqumnov.com/terminal.txt`)

---

### Architecture & Specs

* **Zero-Dependency SSG**: Static compiler (`build.js`) compiles markdown posts in `blog/` into static HTML.
* **Hosting**: Cloudflare Pages (`_worker.js` for CLI terminal UA detection & `_headers` for strict HTTP security headers).
* **PWA & Offline**: Offline Service Worker (`sw.js`) and W3C Web Manifest.

### Local Development

```bash
# Compile blog markdown into static HTML & generate terminal.txt
npm run build

# Preview locally
npx serve .
```

---

© 2026 Matvei Igumnov

