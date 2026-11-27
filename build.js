const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const INDEX_HTML = path.join(ROOT_DIR, 'index.html');
const TERMINAL_TXT = path.join(ROOT_DIR, 'terminal.txt');
const SITEMAP_XML = path.join(ROOT_DIR, 'sitemap.xml');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function replaceTexFrac(str) {
  let out = '';
  let i = 0;
  while (i < str.length) {
    if (str.startsWith('\\frac{', i)) {
      let j = i + 6;
      let depth = 1;
      while (j < str.length && depth > 0) {
        if (str[j] === '{') depth++;
        else if (str[j] === '}') depth--;
        j++;
      }
      const num = str.slice(i + 6, j - 1);
      if (str[j] === '{') {
        let k = j + 1;
        depth = 1;
        while (k < str.length && depth > 0) {
          if (str[k] === '{') depth++;
          else if (str[k] === '}') depth--;
          k++;
        }
        const den = str.slice(j + 1, k - 1);
        out += `<span class="math-frac"><span class="math-num">${texToUnicodeHtml(num)}</span><span class="math-den">${texToUnicodeHtml(den)}</span></span>`;
        i = k;
        continue;
      }
    }
    out += str[i];
    i++;
  }
  return out;
}

function safeUrl(url) {
  const s = String(url).trim();
  if (/^(?:javascript|vbscript|data):/i.test(s.replace(/[\u0000-\u0020]+/g, ''))) {
    return '#';
  }
  return escapeAttr(s);
}

function texToUnicodeHtml(tex) {
  let out = escapeHtml(String(tex).trim());
  const cmdMap = {
    '\\mathbb{Z}': '&#x2124;',
    '\\mathbb{C}': '&#x2102;',
    '\\mathbb{R}': '&#x211D;',
    '\\mathbb{N}': '&#x2115;',
    '\\partial': '&part;',
    '\\dagger': '&dagger;',
    '\\alpha': '&alpha;',
    '\\beta': '&beta;',
    '\\gamma': '&gamma;',
    '\\theta': '&theta;',
    '\\pi': '&pi;',
    '\\phi': '&phi;',
    '\\otimes': '&otimes;',
    '\\cdot': '&middot;',
    '\\times': '&times;',
    '\\equiv': '&equiv;',
    '\\neq': '&ne;',
    '\\in': '&isin;',
    '\\to': '&rarr;',
    '\\infty': '&infin;',
    '\\left|': '|',
    '\\right|': '|',
    '\\left(': '(',
    '\\right)': ')',
    '\\left[': '[',
    '\\right]': ']',
    '\\le': '&le;',
    '\\ge': '&ge;',
  };

  out = replaceTexFrac(out);
  out = out.replace(/\\text\{([^{}]+)\}/g, (_, txt) => `<span class="math-text">${txt}</span>`);
  out = out
    .replace(/\^\{((?:[^{}]|<[^>]+>)+)\}/g, (_, s) => `<sup>${s}</sup>`)
    .replace(/_\{((?:[^{}]|<[^>]+>)+)\}/g, (_, s) => `<sub>${s}</sub>`)
    .replace(/\^(\\[A-Za-z]+|[A-Za-z0-9*†])/g, (_, s) => `<sup>${s}</sup>`)
    .replace(/_(\\[A-Za-z]+|[A-Za-z0-9])/g, (_, s) => `<sub>${s}</sub>`);

  const ordered = Object.entries(cmdMap).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of ordered) {
    out = out.split(k).join(v);
  }
  return out;
}

// Permanent core initiatives (hardcoded in index.html, mirrored here for terminal.txt)
const INITIATIVES = [
  {
    title: 'PQCanary',
    summary: 'Enterprise post-quantum cryptographic (PQC) discovery and remediation platform: CBOM compliance generation (NIST FIPS 203/204/205), Z3 SMT formal verification of constant-time lattice polynomial reduction bounds (KyberSlash side-channel prevention), and automated AST modernization (DOI: 10.5281/zenodo.24527917).',
    stack: 'Rust, Solid.js, WebAssembly, Z3 SMT Solver, liboqs, Qiskit',
    github: 'https://github.com/Iqumnov/PQCanary',
    visit: 'https://pqcanary.iqumnov.com'
  },
  {
    title: 'QIR Reversing',
    summary: 'LLVM Quantum Intermediate Representation (QIR) reverse engineering & formal verification suite: algebraic commutation deobfuscator (involution collapse & Lie rotation consolidation), 2^N Hilbert space unitary process fidelity verification (F=1.0) with Lean 4 proofs, and native Rizin/Cutter plugins (DOI: 10.5281/zenodo.24528097).',
    stack: 'Rust (#![deny(unsafe_code)]), LLVM QIR, Lean 4, WebAssembly, Rizin C-ABI, Cutter (PySide), OpenQASM 3.0, MCP',
    github: 'https://github.com/Iqumnov/Qir-Reversing',
    visit: 'https://qir-reversing.iqumnov.com'
  },
  {
    title: 'TurtleShell',
    summary: 'Multi-tenant process isolation, side-channel defense & hardware benchmarking platform for shared quantum clouds: 4-contour physical mitigation (spectral QPU partitioning, compiler bytecode audit, QuTiP-verified laser cooling, telemetric SPC), QIB benchmark suite, and browser-native simulation engine (DOI: 10.5281/zenodo.24528037).',
    stack: 'Python, FastAPI, QuTiP, Qiskit, TypeScript, React, Vite, NetworkX, Scikit-learn',
    github: 'https://github.com/Iqumnov/TurtleShell',
    visit: 'https://turtleshell.iqumnov.com'
  }
];

function parseMarkdownMetadata(filePath, defaultId) {
  const content = fs.readFileSync(filePath, 'utf8');

  let meta = {
    id: defaultId,
    title: defaultId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    date: '',
    draft: false
  };

  let bodyContent = content;

  // 1. YAML Frontmatter
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const lines = frontmatterMatch[1].split('\n');
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key === 'draft') {
          meta.draft = value.toLowerCase() === 'true';
        } else if (key === 'title' || key === 'date') {
          meta[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    bodyContent = content.slice(frontmatterMatch[0].length).trim();
  }

  // 2. Heading fallback if title not in frontmatter
  if (!meta.title || meta.title === defaultId) {
    const headingMatch = bodyContent.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      meta.title = headingMatch[1].trim();
    }
  }

  meta.rawContent = content;
  return meta;
}

function renderInline(text) {
  const codeSpans = [];
  let s = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `%%INLINE_CODE_${idx}%%`;
  });

  const mathSpans = [];
  s = s.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    const idx = mathSpans.length;
    mathSpans.push(`<span class="math-inline">${texToUnicodeHtml(tex)}</span>`);
    return `%%INLINE_MATH_${idx}%%`;
  });

  s = escapeHtml(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${escapeAttr(alt)}" loading="lazy" />`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  mathSpans.forEach((span, i) => {
    s = s.replace(`%%INLINE_MATH_${i}%%`, span);
  });
  codeSpans.forEach((span, i) => {
    s = s.replace(`%%INLINE_CODE_${i}%%`, span);
  });
  return s;
}

function parseMarkdownToHtml(md) {
  if (!md) return '';
  let cleanMd = md.replace(/^---[\s\S]*?---\s*/, '');

  const codeBlocks = [];
  cleanMd = cleanMd.replace(/```([a-z0-9_-]+)?\r?\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="language-${escapeAttr(lang || 'text')}">${escapeHtml(code)}</code></pre>`);
    return `\n\n%%CODE_BLOCK_${idx}%%\n\n`;
  });

  const mathBlocks = [];
  cleanMd = cleanMd.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    const idx = mathBlocks.length;
    mathBlocks.push(`<div class="math-display">${texToUnicodeHtml(tex)}</div>`);
    return `\n\n%%MATH_BLOCK_${idx}%%\n\n`;
  });

  const lines = cleanMd.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const codeMatch = trimmed.match(/^%%CODE_BLOCK_(\d+)%%$/);
    if (codeMatch) {
      blocks.push(codeBlocks[Number(codeMatch[1])]);
      i++;
      continue;
    }

    const mathMatch = trimmed.match(/^%%MATH_BLOCK_(\d+)%%$/);
    if (mathMatch) {
      blocks.push(mathBlocks[Number(mathMatch[1])]);
      i++;
      continue;
    }

    if (/^(?:---|___|\*\*\*)\s*$/.test(trimmed)) {
      blocks.push('<hr />');
      i++;
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      blocks.push(`<h4>${renderInline(h3Match[1].trim())}</h4>`);
      i++;
      continue;
    }
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      blocks.push(`<h3>${renderInline(h2Match[1].trim())}</h3>`);
      i++;
      continue;
    }
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      blocks.push(`<h2 class="article-title">${renderInline(h1Match[1].trim())}</h2>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(renderInline(lines[i].replace(/^>\s?/, '')));
        i++;
      }
      blocks.push(`<blockquote>${quoteLines.join('<br />')}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (/^\|.+\|$/.test(trimmed)) {
      const rows = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        const cells = lines[i].trim().split('|').slice(1, -1);
        if (!cells.every((c) => /^[-:\s]+$/.test(c))) {
          const tag = rows.length === 0 ? 'th' : 'td';
          rows.push(`<tr>${cells.map((c) => `<${tag}>${renderInline(c.trim())}</${tag}>`).join('')}</tr>`);
        }
        i++;
      }
      blocks.push(`<table>${rows.join('')}</table>`);
      continue;
    }

    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^%%(?:CODE|MATH)_BLOCK_\d+%%$/.test(lines[i].trim()) &&
      !/^(?:---|___|\*\*\*)\s*$/.test(lines[i].trim()) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*(?:[-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^\|.+\|$/.test(lines[i].trim())
    ) {
      paraLines.push(renderInline(lines[i]));
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(`<p>${paraLines.join(' ')}</p>`);
    }
  }

  return blocks.join('\n');
}

function generateTerminalFile(initiatives, blogPosts) {
  const socials = [
    { name: 'GitHub',    val: 'https://github.com/Iqumnov' },
    { name: 'ORCID',     val: 'https://orcid.org/0009-0001-7924-1522' },
    { name: 'Telegram',  val: 'https://t.me/iqumnov' },
    { name: 'Discord',   val: 'https://discord.com/users/1515738859910987959' },
    { name: 'LinkedIn',  val: 'https://www.linkedin.com/in/iqumnov' },
    { name: 'YouTube',   val: 'https://www.youtube.com/@Iqumnov' },
    { name: 'Instagram', val: 'https://www.instagram.com/iqumnov' },
    { name: 'Email',     val: 'mailto:matvei@iqumnov.com' }
  ];

  const socialsText = socials.map(s => `• ${s.name.padEnd(10)}: ${s.val}`).join('\n');

  const initiativesText = initiatives.map((p, i) => `[0${i + 1}] ${p.title}
     ${p.summary}
     Stack:  ${p.stack}
     Links:  ${[p.github, p.visit].filter(Boolean).join(' • ')}`).join('\n\n');

  const blogText = blogPosts.map((p, i) => `[0${i + 1}] ${p.title}
     Date:  ${p.date}
     Web:   https://iqumnov.com/#${p.id}
     Read:  curl -sSL https://iqumnov.com/blog/${p.id}.md`).join('\n\n');

  const content = `================================================================================
 Matvei Igumnov // Quantum Security & Systems Defense
 Web: https://iqumnov.com | Email: matvei@iqumnov.com
================================================================================

⌍ Overview ⌎
Quantum Security, Cryptographic Engineering, and Low-Level Systems Defense.
Developing static verification tooling, kernel-level telemetry, and post-quantum
cryptographic (PQC) architectures.

• Education: B.S. in Information Security, Moscow Polytechnic University (2027)
• Co-founder & curator at Our Dynasty Art (https://ourdynasty.art) — gallery & collection spanning five generations of family artists.

⌍ Network & Socials ⌎
${socialsText}

⌍ Core Initiatives ⌎
${initiativesText}

⌍ Technical Skills ⌎
┌── Languages ───────────► Rust • Python • C/C++ • Java • C# • SQL (Postgres) • OpenQASM
├── Security & Backend ──► Spring Boot • Spring Security • Quarkus • Bouncy Castle (JCA/PQC) • Keycloak • gRPC
├── Quantum & Formal ────► Qiskit • PennyLane • ETSI GS QKD 014 • Lean 4 • Z3 SMT
├── Crypto & Compliance ─► liboqs • NIST PQC (FIPS 203/204/205) • PKI / X.509 • PKCS#11 • eBPF • OpenTelemetry • DORA / NIS2
├── Infra & Cloud ───────► Linux (RHEL/Debian) • Git • Docker • Kubernetes • AWS
└── Spoken Languages ────► English (Advanced) • French (Learning) • Russian (Native)

⌍ Validation & Milestones ⌎
• eLearnSecurity Certified Web Penetration Tester (eWPT v1.0) | ID: 8017284
  https://github.com/Iqumnov/Iqumnov/blob/main/Certifications/eWPT_v1.0_Matvei_Igumnov.pdf
• IBM Qiskit Quantum Excellence Awards | 2026, 2021, 2020
  https://github.com/Iqumnov/Iqumnov/blob/main/Certifications/IBM_Quantum_Excellence_2026.pdf
• Lomonosov MSU Case-Championship Winner | Medical Analytical Platform
  https://github.com/Iqumnov/Iqumnov/blob/main/Certifications/MSU_Winner_Matvei_Igumnov_Team_1.pdf
• Womanium Global Quantum Computing Program | Hardware Certificate (MIT, IBM, Princeton)
  https://github.com/Iqumnov/Iqumnov/blob/main/Certifications/Womanium_Quantum_2022_Matvei_Igumnov.pdf
• QHack Coding Challenges Certificate | PennyLane / Xanadu
  https://github.com/Iqumnov/Iqumnov/blob/main/Certifications/QHack_Coding_Challenge_Matvei_Igumnov.pdf
• QWorld QSilver Diploma | Complex Numbers & Shor's Algorithm | No: QSilver2-50
  https://github.com/Iqumnov/Iqumnov/blob/main/Certifications/QSilver2021_Matvei_Igumnov.pdf

⌍ Blog ⌎
${blogText}

================================================================================
 (c) 2026 Matvei Igumnov • Terminal Edition • https://iqumnov.com
================================================================================
`;

  fs.writeFileSync(TERMINAL_TXT, content);
  console.log('[BUILD] Generated clean terminal.txt (pure plaintext, Title Case headers, complete socials)');
}

function generateSitemap(blogPosts) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: 'https://iqumnov.com/', lastmod: today, changefreq: 'weekly', priority: '1.0' },
    { loc: 'https://iqumnov.com/terminal.txt', lastmod: today, changefreq: 'monthly', priority: '0.8' },
    ...blogPosts.map(p => ({
      loc: `https://iqumnov.com/blog/${p.id}.md`,
      lastmod: p.date || today,
      changefreq: 'monthly',
      priority: '0.7'
    }))
  ];

  const entries = urls.map(u => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>
    <lastmod>${escapeHtml(u.lastmod)}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
  fs.writeFileSync(SITEMAP_XML, xml);
  console.log('[BUILD] Updated sitemap.xml dynamically');
}

function build() {
  console.log('[BUILD] Compiling markdown blog posts into static SSG index.html...');

  // 1. Blog Posts
  const blogFiles = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const blogPosts = blogFiles
    .map(file => {
      const id = path.basename(file, '.md');
      const meta = parseMarkdownMetadata(path.join(BLOG_DIR, file), id);
      return {
        id: meta.id,
        title: meta.title,
        date: meta.date || '',
        summary: meta.summary || '',
        draft: meta.draft,
        html: parseMarkdownToHtml(meta.rawContent)
      };
    })
    .filter(p => !p.draft);

  blogPosts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  fs.writeFileSync(path.join(BLOG_DIR, 'manifest.json'), JSON.stringify(blogPosts, null, 2));

  const dispatchesHtml = blogPosts.map(p => `
          <li class="dispatch-item" tabindex="0" role="button" aria-expanded="false" onclick="openBlogPost('${p.id}', event)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openBlogPost('${p.id}', event);}">
            <span class="dispatch-date">${p.date || ''}</span>
            <span class="dispatch-title-link" id="title-${p.id}">${escapeHtml(p.title)}</span>
          </li>`).join('\n');

  const articlesHtml = blogPosts.map(p => `
        <article class="article-reader" id="reader-${p.id}">
          <div class="md-body" id="body-${p.id}">
            ${p.html}
          </div>
        </article>`).join('\n');

  // 2. Compile blog directly into index.html
  if (fs.existsSync(INDEX_HTML)) {
    let html = fs.readFileSync(INDEX_HTML, 'utf8');

    html = html.replace(
      /(<!-- DISPATCHES_START -->)[\s\S]*?(<!-- DISPATCHES_END -->)/,
      (m, p1, p2) => `${p1}\n${dispatchesHtml}\n        ${p2}`
    );

    html = html.replace(
      /(<!-- ARTICLES_START -->)[\s\S]*?(<!-- ARTICLES_END -->)/,
      (m, p1, p2) => `${p1}\n${articlesHtml}\n        ${p2}`
    );

    fs.writeFileSync(INDEX_HTML, html);
    console.log('[BUILD] Successfully compiled blog markdown into static index.html');
  }

  // 3. Generate clean terminal.txt and dynamic sitemap.xml
  generateTerminalFile(INITIATIVES, blogPosts);
  generateSitemap(blogPosts);
}

build();
