// Daily: read the channel's public YouTube feed and write videos.json (newest long-form videos first).
// The "More episodes" row on every sources page reads this file, so it updates itself after each upload.
import fs from 'node:fs';

const CHANNEL = 'UCS0JLNW6Ktrd-MnKOv8F2ew';
const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`)).text();
const tag = (s, t) => (s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
const unxml = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const out = [];
for (const e of xml.split('<entry>').slice(1)) {
  const id = tag(e, 'yt:videoId');
  if (!id) continue;
  // Shorts answer 200 on /shorts/<id>; long videos redirect. Only long-form goes on the pages.
  const r = await fetch(`https://www.youtube.com/shorts/${id}`, { method: 'HEAD', redirect: 'manual' }).catch(() => null);
  if (r && r.status === 200) continue;
  const desc = unxml(tag(e, 'media:description'));
  out.push({
    id,
    title: unxml(tag(e, 'title')),
    published: tag(e, 'published'),
    slug: (desc.match(/asteriskeconomics\.com\/sources\/([a-z0-9-]+)/) || [])[1] || null,
  });
}
if (!out.length) { console.log('feed empty, keeping the old file'); process.exit(0); }
// The feed only holds the 15 newest uploads (Shorts included), so older long videos drop out of it.
// Keep every video from the old file that is not in the feed, as long as YouTube still shows it publicly.
const old = fs.existsSync('videos.json') ? JSON.parse(fs.readFileSync('videos.json', 'utf8')) : [];
for (const v of old) {
  if (out.some((x) => x.id === v.id)) continue;
  const r = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${v.id}`).catch(() => null);
  if (r && r.ok) out.push(v);
}
out.sort((a, b) => b.published.localeCompare(a.published));
fs.writeFileSync('videos.json', JSON.stringify(out.slice(0, 60), null, 2) + '\n');
console.log(out.length, 'videos');
