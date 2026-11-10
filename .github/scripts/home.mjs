// After videos.json is refreshed: rebuild the home page's episodes section from it, so every
// video that goes live on YouTube shows on asteriskeconomics.com by the next run (newest first).
// It rewrites only the block between <!-- videos:start --> and <!-- videos:end --> in index.html.
// The first time, it replaces the old hand-built <section id="latest"> with that block.
import fs from 'node:fs';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const videos = JSON.parse(fs.readFileSync('videos.json', 'utf8'));
if (!videos.length) { console.log('no videos, home page left alone'); process.exit(0); }

const total = videos.length;
const date = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const watch = (v) => `https://www.youtube.com/watch?v=${esc(v.id)}`;
const thumb = (v) => `https://i.ytimg.com/vi/${esc(v.id)}/maxresdefault.jpg`;
// A video's sources page: the slug its description links, or else the page whose data-yt is its id.
const pageFor = new Map();
for (const d of fs.existsSync('sources') ? fs.readdirSync('sources') : []) {
  const f = `sources/${d}/index.html`;
  if (!fs.existsSync(f)) continue;
  const id = (fs.readFileSync(f, 'utf8').match(/data-yt="([^"]+)"/) || [])[1];
  if (id) pageFor.set(id, d);
}
const slugOf = (v) => (v.slug && fs.existsSync(`sources/${v.slug}/index.html`) ? v.slug : pageFor.get(v.id));
const sources = (v) => (slugOf(v) ? ` <a class="ghost" href="/sources/${esc(slugOf(v))}/">Sources</a>` : '');
const play = '<span class="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 3.5v17L21 12z"/></svg></span>';

const [latest, ...rest] = videos;
const block = `<!-- videos:start (written by .github/scripts/home.mjs from videos.json; edits here are overwritten) -->
<style>
.eps-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(18px, 3vw, 32px); margin-top: clamp(40px, 6vw, 72px); }
.eps-grid a.card { display: block; text-decoration: none; }
.eps-grid .thumb { box-shadow: 0 10px 26px rgba(22,33,58,.14); margin-bottom: 12px; }
.eps-grid h4 { font: 600 1.15rem/1.3 var(--f-name); margin: 0 0 4px; text-wrap: balance; color: var(--ink); }
.eps-grid .when { font: 600 .85rem var(--f-body); color: var(--muted); }
.eps-more { margin-top: clamp(28px, 4vw, 44px); }
@media (max-width: 820px) { .eps-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .eps-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
<section id="latest"><div class="wrap">
  <div class="ep">
    <a class="thumb" href="${watch(latest)}" target="_blank" rel="noopener" aria-label="Watch ${esc(latest.title)} on YouTube">
      <img src="${thumb(latest)}" alt="" width="1280" height="720">${play}
    </a>
    <div>
      <p class="eyebrow">Latest episode</p>
      <span class="ep-label">${date(latest.published)}</span>
      <h3>${esc(latest.title)}</h3>
      <p><a class="ghost" href="${watch(latest)}" target="_blank" rel="noopener">Watch it on YouTube</a>${sources(latest)}</p>
    </div>
  </div>
${rest.length ? `  <div class="eps-grid">
${rest.map((v) => `    <div><a class="card" href="${watch(v)}" target="_blank" rel="noopener"><span class="thumb"><img src="${thumb(v)}" alt="" width="1280" height="720" loading="lazy"></span><h4>${esc(v.title)}</h4></a><span class="when">${date(v.published)}</span>${sources(v)}</div>`).join('\n')}
  </div>` : ''}
  <p class="eps-more"><a class="ghost" href="https://www.youtube.com/@asteriskeconomics1/videos" target="_blank" rel="noopener">See every episode on YouTube</a></p>
</div></section>
<!-- videos:end -->`;

let html = fs.readFileSync('index.html', 'utf8');
const marked = /<!-- videos:start[\s\S]*?<!-- videos:end -->/;
const old = /<section id="latest">[\s\S]*?<\/div><\/section>/;
if (marked.test(html)) html = html.replace(marked, () => block);
else if (old.test(html)) html = html.replace(old, () => block);
else { console.log('no episodes section found in index.html'); process.exit(1); }
fs.writeFileSync('index.html', html);
console.log('home page:', total, 'videos');
