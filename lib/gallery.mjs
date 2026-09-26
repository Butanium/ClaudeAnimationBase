// lib/gallery.mjs: builds a browsable contact sheet of every lib asset from lib/README.md's index tables and the render
// sheets next to each asset (one card per asset: its sheet, what it's for, how to call it, where it came from).
//   node lib/gallery.mjs --out=<dir> [--intro=<markdown file>]      writes <dir>/index.html + <dir>/sheets/...
// The page is self-contained apart from the copied sheets (relative paths), so it opens from disk or publishes as is.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
if (!args.out) { console.error('usage: node lib/gallery.mjs --out=<dir> [--intro=<file.md>]'); process.exit(2); }
const LIB = dirname(fileURLToPath(import.meta.url)), OUT = resolve(args.out);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// the markdown that README cells use: `code`, [text](url), **bold**
const md = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => /^https?:/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const cells = line => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));

// ---- parse the index: "### <folder>/ — <title>" headings, each followed by a table and optional prose ----
const readme = readFileSync(join(LIB, 'README.md'), 'utf8');
const index = readme.slice(readme.indexOf('## Index'), readme.indexOf('\n## ', readme.indexOf('## Index') + 5));
const cats = [];
for (const block of index.split(/\n(?=### )/).slice(1)) {
  const [head, ...rest] = block.split('\n');
  const m = head.match(/^### (?:(\S+)\/ — )?(.+)$/); if (!m) continue;
  const cat = { dir: m[1] || null, title: m[2], rows: [], prose: [] };
  const lines = rest.filter(l => l.trim());
  const table = lines.filter(l => l.startsWith('|'));
  cat.prose = lines.filter(l => !l.startsWith('|') && !l.startsWith('<!--'));
  if (table.length > 2) { cat.cols = cells(table[0]).map(c => c.toLowerCase()); cat.rows = table.slice(2).map(cells); }
  if (cat.rows.length || cat.prose.length) cats.push(cat);
}

// ---- cards ----
mkdirSync(join(OUT, 'sheets'), { recursive: true });
let nAssets = 0, nImported = 0;
const card = (cat, r) => {
  const link = r[0].match(/\[`?([^`\]]+)`?\]\(([^)]+)\)/), name = link ? link[1] : r[0].replace(/`/g, ''), path = link ? link[2] : null;
  const jpg = path && path.replace(/\.m?js$/, '.jpg'), src = jpg && join(LIB, jpg);
  let img = '';
  if (src && existsSync(src)) {
    const rel = 'sheets/' + jpg; mkdirSync(dirname(join(OUT, rel)), { recursive: true }); copyFileSync(src, join(OUT, rel));
    img = `<button class="sheet" type="button" data-full="${rel}" aria-label="Open the render sheet of ${esc(name)}"><img src="${rel}" alt="Render sheet: ${esc(name)}" loading="lazy"></button>`;
  }
  const code = path && existsSync(join(LIB, path)) ? readFileSync(join(LIB, path), 'utf8') : '';
  const global = (code.match(/^(?:const|function|let|var)\s+([A-Za-z_$][\w$]*)/m) || [])[1];
  const imported = cat.dir === 'imported'; if (cat.dir !== 'debug') nAssets++; if (imported) nImported++;
  const [what, use, source] = [r[1] || '', r[2] || '', r[3] || ''];
  return `<article class="card${img ? '' : ' noimg'}">${img}
  <div class="body">
    <h3><span class="file">${esc(name)}</span>${global ? `<span class="global">${esc(global)}</span>` : ''}</h3>
    <p class="what">${md(what)}</p>
    ${use ? `<details><summary>How to call it</summary><p class="use">${md(use)}</p></details>` : ''}
    <p class="src ${imported ? 'imp' : 'own'}"><span class="tag">${imported ? 'imported' : 'made here'}</span> ${md(source)}</p>
  </div></article>`;
};

const sections = cats.map(cat => {
  const id = (cat.dir || cat.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const isLinks = !cat.dir;        // "Elsewhere": a table of links, not assets
  const body = isLinks
    ? `<div class="tablewrap"><table><thead><tr>${cat.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${cat.rows.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : `<div class="grid">${cat.rows.map(r => card(cat, r)).join('\n')}</div>`;
  return { id, title: cat.dir ? `${cat.dir}/` : cat.title, sub: cat.dir ? cat.title : '', n: isLinks ? 0 : cat.rows.length,
    html: `<section id="${id}"><header class="cathead"><h2>${esc(cat.dir ? cat.dir + '/' : cat.title)}</h2>${cat.dir ? `<p>${esc(cat.title)}</p>` : ''}</header>
${cat.prose.map(p => `<p class="prose">${md(p)}</p>`).join('')}${body}</section>` };
});

const intro = args.intro && existsSync(args.intro) ? readFileSync(args.intro, 'utf8').split(/\n\s*\n/).map(p => `<p>${md(p.trim())}</p>`).join('') : '';
const nav = sections.filter(s => s.n || s.title.startsWith('Elsewhere')).map(s => `<a href="#${s.id}">${esc(s.title.replace(/ \(.*$/, ''))}${s.n ? ` <span>${s.n}</span>` : ''}</a>`).join('');

const html = `<title>Clawd Asset Library</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&family=Permanent+Marker&display=swap">
<style>
:root { --ground:#ECEAF0; --surface:#F9F8FB; --ink:#2B2233; --muted:#665E72; --line:#D9D5E0; --accent:#A84D33; --clay:#D97757; --chip:#E3DFEA; --own:#3A7C78; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ground:#16142A; --surface:#211E37; --ink:#EDE8F2; --muted:#A8A1B8; --line:#35304F; --accent:#F2A283; --clay:#E08A6B; --chip:#2C2846; --own:#7CC7C2; color-scheme: dark; } }
:root[data-theme="dark"] { --ground:#16142A; --surface:#211E37; --ink:#EDE8F2; --muted:#A8A1B8; --line:#35304F; --accent:#F2A283; --clay:#E08A6B; --chip:#2C2846; --own:#7CC7C2; color-scheme: dark; }
body { background: var(--ground); color: var(--ink); font: 16px/1.55 Karla, "Segoe UI", system-ui, sans-serif; padding-inline: 20px; padding-block: 28px 64px; }
.wrap { max-width: 1320px; margin: 0 auto; display: grid; gap: 44px; }
code, .file, .global, .use { font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace; }
a { color: var(--accent); }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--clay); outline-offset: 2px; }
.top { display: grid; gap: 14px; max-width: 72ch; }
.top h1 { font: 400 clamp(34px, 5vw, 52px)/1.05 "Permanent Marker", "Comic Sans MS", cursive; margin: 0; letter-spacing: .01em; }
.top h1 span { color: var(--clay); }
.top p { margin: 0; color: var(--muted); }
.stats { font-variant-numeric: tabular-nums; color: var(--ink) !important; font-weight: 500; }
nav { display: flex; flex-wrap: wrap; gap: 8px; }
nav a { text-decoration: none; color: var(--ink); background: var(--chip); padding: 5px 12px; border-radius: 999px; font: 500 14px "IBM Plex Mono", monospace; }
nav a span { color: var(--muted); margin-left: 4px; }
section { display: grid; gap: 18px; scroll-margin-top: 16px; }
.cathead { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; border-bottom: 2px solid var(--ink); padding-bottom: 6px; }
.cathead h2 { margin: 0; font: 500 24px "IBM Plex Mono", monospace; }
.cathead p { margin: 0; color: var(--muted); }
.prose { margin: 0; max-width: 72ch; color: var(--muted); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); gap: 22px; align-items: start; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; display: grid; }
.sheet { all: unset; cursor: zoom-in; display: block; background: #2B2233; }
.sheet img { display: block; width: 100%; height: auto; }
.body { padding: 14px 16px 16px; display: grid; gap: 10px; }
h3 { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-weight: 500; }
.file { font-size: 16px; }
.global { font-size: 12.5px; color: var(--muted); background: var(--chip); padding: 1px 7px; border-radius: 4px; }
.what { margin: 0; font-size: 15px; }
details summary { cursor: pointer; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.use { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; overflow-wrap: anywhere; }
.use code, .what code { font-size: .88em; background: var(--chip); padding: 0 4px; border-radius: 3px; }
.src { margin: 0; font-size: 13.5px; color: var(--muted); border-top: 1px dashed var(--line); padding-top: 9px; }
.tag { font: 500 11.5px "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .06em; padding: 1px 6px; border-radius: 3px; margin-right: 4px; }
.own .tag { color: var(--own); border: 1px solid var(--own); }
.imp .tag { color: var(--accent); border: 1px solid var(--accent); }
.noimg .body { padding-top: 16px; }
.tablewrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 14.5px; background: var(--surface); }
th, td { text-align: left; vertical-align: top; padding: 9px 12px; border-bottom: 1px solid var(--line); }
th { font: 500 12px "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.intro p { margin: 0 0 10px; }
dialog { border: 0; padding: 0; background: transparent; max-width: 96vw; max-height: 94vh; }
dialog::backdrop { background: rgba(22, 20, 42, .82); }
dialog img { display: block; max-width: 96vw; max-height: 94vh; width: auto; height: auto; cursor: zoom-out; }
footer { color: var(--muted); font-size: 14px; }
</style>
<div class="wrap">
  <div class="top">
    <h1>Clawd <span>asset</span> library</h1>
    <p>Reusable, hand-painted pieces for Clawd films (p5.js + p5.brush): each card shows the asset's render sheet, what it's for, how to call it, and where it came from. Click a sheet to see it full size.</p>
    <p class="stats">${nAssets} assets · ${nImported} of them imported from other people's kits · plus checking tools</p>
    ${intro ? `<div class="intro">${intro}</div>` : ''}
    <nav aria-label="Categories">${nav}</nav>
  </div>
  ${sections.map(s => s.html).join('\n')}
  <footer>Built by <code>node lib/gallery.mjs</code> from <code>lib/README.md</code> in the clawd-kit (a growing copy of <a href="https://github.com/JohnHeibel/ClaudeAnimationBase" target="_blank" rel="noopener">JohnHeibel/ClaudeAnimationBase</a>, MIT).</footer>
</div>
<dialog id="lb" aria-label="Render sheet"><img id="lbimg" alt=""></dialog>
<script>
const lb = document.getElementById('lb'), lbimg = document.getElementById('lbimg');
document.querySelectorAll('.sheet').forEach(b => b.addEventListener('click', () => { lbimg.src = b.dataset.full; lbimg.alt = b.querySelector('img').alt; lb.showModal(); }));
lb.addEventListener('click', () => lb.close());
</script>
`;
writeFileSync(join(OUT, 'index.html'), html);
console.log(`${OUT}/index.html: ${nAssets} assets (${nImported} imported) in ${sections.length} sections`);
