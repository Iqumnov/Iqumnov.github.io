const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const INDEX_HTML = path.join(ROOT_DIR, 'index.html');
const TERMINAL_TXT = path.join(ROOT_DIR, 'terminal.txt');

// Permanent core initiatives (hardcoded in index.html, mirrored here for terminal.txt)
const INITIATIVES = [
  {
    title: 'PQCanary',
    summary: 'Enterprise post-quantum cryptographic (PQC) discovery and remediation platform: CBOM compliance generation (NIST FIPS 203/204/205), Z3 SMT formal verification of constant-time lattice polynomial reduction bounds (KyberSlash side-channel prevention), and automated AST modernization (DOI: 10.5281/zenodo.24527917).',
    stack: 'Rust, Solid.js, WebAssembly, Z3 SMT Solver, liboqs, Qiskit',
    github: 'https://github.com/Iqumnov/PQCanary',
    visit: 'https://pqcanary.pages.dev'
  },
  {
    title: 'QIR Reversing',
    summary: 'LLVM Quantum Intermediate Representation (QIR) reverse engineering & formal verification suite: algebraic commutation deobfuscator (involution collapse & Lie rotation consolidation), 2^N Hilbert space unitary process fidelity verification (F=1.0) with Lean 4 proofs, and native Rizin/Cutter plugins (DOI: 10.5281/zenodo.24528097).',
    stack: 'Rust (#![forbid(unsafe_code)]), LLVM QIR, Lean 4, WebAssembly, Rizin C-ABI, Cutter (PySide), OpenQASM 3.0, MCP',
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

function parseMarkdownToHtml(md) {
  if (!md) return '';
  let cleanMd = md.replace(/^---[\s\S]*?---\s*/, '');

  const codeBlocks = [];
  cleanMd = cleanMd.replace(/```([a-z0-9_-]+)?\r?\n([\s\S]*?)```/g, (match, lang, code) => {
    const clean = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${clean}</code></pre>`);
    return `\n\n%%CODE_BLOCK_${idx}%%\n\n`;
  });

  let html = cleanMd
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^(?:---|___|\*\*\*)\s*$/gm, '<hr />')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
    .replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>')
    .replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>')
    .replace(/^\|(.+)\|$/gim, (match) => {
      const cells = match.split('|').filter((c, i, a) => i > 0 && i < a.length - 1);
      if (cells.every((c) => /^[-:\s]+$/.test(c))) {
        return '<!-- table-sep -->';
      }
      const cellTags = cells.map((c) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cellTags}</tr>`;
    })
    .replace(/\n\s*\n/gim, '</p><p>');

  let parsed = `<p>${html}</p>`
    .replace(/<!-- table-sep -->\s*/g, '')
    .replace(/((?:<tr>.*?<\/tr>\s*)+)/g, '<table>$1</table>')
    .replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/<p>\s*(<(?:h[1-6]|ul|ol|table|blockquote|hr|pre)[^>]*>[\s\S]*?<\/(?:h[1-6]|ul|ol|table|blockquote|pre)>|<hr\s*\/?>)\s*<\/p>/gi, '$1')
    .replace(/<p>\s*<\/p>/g, '');

  codeBlocks.forEach((block, i) => {
    parsed = parsed.replace(new RegExp(`<p>\\s*%%CODE_BLOCK_${i}%%\\s*<\\/p>|%%CODE_BLOCK_${i}%%`, 'g'), block);
  });

  return parsed;
}

function generateTerminalFile(initiatives, blogPosts) {
  const socials = [
    { name: 'GitHub',    val: 'https://github.com/Iqumnov' },
    { name: 'ORCID',     val: 'https://orcid.org/0009-0001-7924-1522' },
    { name: 'Telegram',  val: 'https://t.me/iqumnov' },
    { name: 'Discord',   val: 'https://discord.com/users/iqumnov' },
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
├── Quantum & Formal ────► Qiskit • PennyLane • ETSI GS QKD 014 • Z3 SMT
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
            <span class="dispatch-title-link">${p.title}</span>
          </li>`).join('\n');

  const articlesHtml = blogPosts.map(p => `
        <article class="article-reader" id="reader-${p.id}">
          <div class="md-body">
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

  // 3. Generate clean terminal.txt
  generateTerminalFile(INITIATIVES, blogPosts);
}

build();
