// Builds the public website into publish/ from the repository's own files:
// the report (Markdown), the figure plates, the interactive presentation and the
// restored-dolmen dashboard. Only publish/ is uploaded.
//
//   node build.mjs
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { Marked } from "marked";

const repo = new URL("../", import.meta.url);
const out = new URL("publish/", import.meta.url);
const read = (p) => readFileSync(new URL(p, repo), "utf8");
const write = (p, s) => {
  const u = new URL(p, out);
  mkdirSync(new URL("./", u), { recursive: true });
  writeFileSync(u, s);
};
const copy = (from, to) => {
  const u = new URL(to, out);
  mkdirSync(new URL("./", u), { recursive: true });
  copyFileSync(new URL(from, repo), u);
};
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const NAV = [
  ["/", "Home"],
  ["/report/", "Report"],
  ["/plates/", "Plates"],
  ["/presentation/", "Presentation"],
  ["/receiver/", "Receiver"],
];
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:ital,wght@0,400;0,500;1,400&display=swap">`;

/**
 * The running header, identical on every page. Its styles are self-contained (fixed sizes,
 * no page variables) so the presentation and receiver pages, which have their own CSS,
 * show exactly the same bar. The scrollbar's space is always reserved so nothing shifts.
 */
const BAR_CSS = `html{scrollbar-gutter:stable}
.site-bar{position:sticky;top:0;z-index:50;background:#fcfcfb;border-bottom:1.5px solid #17212b;font-family:"IBM Plex Sans","Helvetica Neue",Arial,sans-serif}
.site-bar.inset{margin-inline:-16px}
.site-bar-in{box-sizing:border-box;max-width:1240px;height:52px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.site-brand{font:500 20px/1 "IBM Plex Serif",Georgia,"Times New Roman",serif;color:#17212b;text-decoration:none;white-space:nowrap}
.site-brand span{color:#1f57a3}
.site-nav{display:flex;gap:18px;font:600 12px/1 "IBM Plex Sans","Helvetica Neue",Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.site-nav a{color:#4b5864;text-decoration:none;padding:6px 0 4px;border-bottom:2px solid transparent;white-space:nowrap}
.site-nav a:hover,.site-nav a[aria-current="page"]{color:#1f57a3;border-bottom-color:#1f57a3}
.site-nav a:focus-visible,.site-brand:focus-visible{outline:2px solid #1f57a3;outline-offset:2px}
@media (max-width:760px){.site-bar-in{height:auto;padding:10px 16px;flex-direction:column;align-items:flex-start;gap:10px}.site-nav{gap:14px;overflow-x:auto;max-width:100%}.site-brand{font-size:18px}}`;
const header = (path, inset = false) => `<header class="site-bar${inset ? " inset" : ""}"><div class="site-bar-in">
  <a class="site-brand" href="/">Dolmens <span>·</span> Acoustic Signal Network</a>
  <nav class="site-nav" aria-label="Site">${NAV.map(([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
</div></header>`;

const shell = ({ title, description, path, body }) => `<!doctype html>
<html lang="en-IE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="https://dolmens.tirnarogue.com/figures/plates/plate-1-title.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${FONTS}
<link rel="stylesheet" href="/style.css">
<style>${BAR_CSS}</style>
</head>
<body>
${header(path)}
${body}
<footer class="foot">
  <span>A speculative engineering model. Nothing here is established archaeology.</span>
  <a href="https://fianna.tirnarogue.com">A companion to Gods and Fighting Men →</a>
</footer>
</body>
</html>
`;

/* ---------------- the report ---------------- */
let md = read("neolithic-acoustic-signal-network.md")
  // repository bookkeeping from the report's first draft
  .replace(/^\*\*Repository:\*\*.*\n/m, "")
  .replace(/^\*\*Base state reviewed:\*\*.*\n/m, "")
  // the ChatGPT transcript isn't published: keep the name, drop the link
  .replace(/\[`(chatgpt\/[^`]+)`\]\(chatgpt\/[^)]+\)/g, "`$1` in the project repository")
  .replace(/\]\(figures\//g, "](/figures/");
const toc = [];
const marked = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = slug(text);
      if (depth === 2) toc.push([id, text]);
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
  },
});
const reportHtml = marked.parse(md);
write(
  "report/index.html",
  shell({
    title: "Report · Neolithic Acoustic Signal Network",
    description: "Engineering concept report: could clusters of Irish portal tombs have supported a relay of horn signals? Spacing, range model, receiving station, pulse code and tests.",
    path: "/report/",
    body: `<main class="page"><div class="report">
<nav class="toc" aria-label="Contents"><b>Contents</b><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join("")}</ol></nav>
<article class="sheet prose">${reportHtml}</article>
</div></main>`,
  }),
);

/* ---------------- the plates, captions from the report's Appendix A ---------------- */
const plates = [...md.matchAll(/### Plate (\d+)\. (.+)\n\n!\[[^\]]*\]\(\/figures\/plates\/([^)]+)\)\n\n(.+)\n/g)].map(([, n, title, file, caption]) => ({ n, title, file, caption }));
if (plates.length !== 8) throw new Error(`expected 8 plates in Appendix A, found ${plates.length}`);
for (const f of readdirSync(new URL("figures/plates/", repo))) copy(`figures/plates/${f}`, `figures/plates/${f}`);
write(
  "plates/index.html",
  shell({
    title: "Figure plates · Neolithic Acoustic Signal Network",
    description: "Eight white-paper figure plates summarising the Neolithic acoustic signal network concept.",
    path: "/plates/",
    body: `<main class="page">
<div class="sheet hero"><div class="eyebrow">Appendix A of the report</div><h1 style="font-size:clamp(32px,5vw,56px)">Figure plates</h1>
<p class="lede">Eight plates that summarise the concept, from the all-island inventory to the test plan. Each is 1920 × 1080; open one for full size.</p></div>
<div class="plates">${plates
      .map(
        (p) => `<figure class="plate" id="plate-${p.n}"><a href="/figures/plates/${p.file}"><img src="/figures/plates/${p.file}" alt="Plate ${p.n}: ${esc(p.title)}" width="1920" height="1080" loading="lazy"></a>
<figcaption><b>Plate ${p.n}. ${esc(p.title)}</b> ${marked.parseInline(p.caption)}</figcaption></figure>`,
      )
      .join("\n")}</div>
</main>`,
  }),
);

/* ---------------- the two interactive pages, with a way home ---------------- */
// both pages pad their body by 16px, so the bar pulls out by that much to span the width
const withBar = (html, path) =>
  html
    .replace("</head>", `${FONTS}\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n<style>${BAR_CSS}</style>\n</head>`)
    .replace(/<body>\n?/, (m) => `${m}${header(path, true)}\n`);
write("presentation/index.html", withBar(read("presentation/web/index.html"), "/presentation/"));
write(
  "receiver/index.html",
  withBar(read("restored-dolmen/index.html"), "/receiver/").replace(
    "Model file: <code>restored-dolmen/dolmen-restored.glb</code> in the repository.",
    'Model file: <a href="dolmen-restored.glb" download>dolmen-restored.glb</a> (glTF, metres, one named part per component).',
  ),
);
copy("restored-dolmen/dolmen-restored.glb", "receiver/dolmen-restored.glb");

/* ---------------- home ---------------- */
const part = (n, href, img, title, text, go) => `<a class="part" href="${href}"><img src="/figures/plates/${img}" alt="" width="1920" height="1080" loading="lazy">
<div class="body"><span class="n">${n}</span><h2>${title}</h2><p>${text}</p><span class="go">${go} →</span></div></a>`;
write(
  "index.html",
  shell({
    title: "Neolithic Acoustic Signal Network",
    description: "Could clusters of Irish portal tombs have passed horn signals from one to the next? A testable engineering hypothesis, with a report, figure plates, an interactive presentation and a 3D restored receiver.",
    path: "/",
    body: `<main class="page">
<section class="sheet hero">
  <div class="eyebrow">Engineering concept report · Island of Ireland</div>
  <h1>Neolithic Acoustic Signal Network</h1>
  <p class="sub">Portal tombs, horn signalling and passive listening: a testable engineering hypothesis</p>
  <p class="lede">Could clusters of Irish portal tombs have passed simple horn signals from one to the next? This project works through the physics: how far the tombs sit apart, how far a horn carries at 250–500 Hz, what a passive listening collector at the portal would add, and how a slow pulse code could carry short messages. It also sets out the tests that would prove it wrong.</p>
  <div class="status"><span class="stamp hyp">HYPOTHETICAL</span> Physically plausible in local clusters; archaeologically unproven; experimentally testable.</div>
  <div class="figs">
    <div class="fig"><div class="v">207</div><div class="k">grouped portal-tomb locations, all island</div></div>
    <div class="fig"><div class="v">5</div><div class="k">recognised clusters tested</div></div>
    <div class="fig"><div class="v">0.9–4.7<small>km</small></div><div class="k">longest hop each cluster needs</div></div>
    <div class="fig"><div class="v">+6<small>dB</small></div><div class="k">receiver gain that reaches the hardest hop</div></div>
    <div class="fig"><div class="v">+7.0<small>dB</small></div><div class="k">at 250 Hz from a 1.4 m hide-and-hazel collector</div></div>
  </div>
</section>
<div class="parts">
${part("The report", "/report/", "plate-1-title.png", "Engineering concept report", "The inventory, cluster spacing, range model, receiving station, resonance, pulse code, Slieve Gullion's summit relays, parallels from around the world, and the falsification tests.", "Read the report")}
${part("Interactive", "/presentation/", "plate-4-range.png", "Presentation", "Eight slides with live controls: receiver gain and air absorption, the Slieve Gullion relays, an exploded tomb, and a pulse code you can play.", "Open the presentation")}
${part("3D model", "/receiver/", "plate-6-exploded.png", "Restored dolmen receiver", "A fully restored portal tomb in its cairn with a collector sized for at least +6 dB across 250–500 Hz, built from materials of the period.", "Explore the model")}
${part("Appendix A", "/plates/", "plate-5-clusters.png", "Figure plates", "Eight plates that summarise the concept, from the all-island inventory to the test plan.", "See the plates")}
</div>
<div class="verdict">
  <div><b style="color:var(--blue)">Physically plausible</b><span>in local clusters</span></div>
  <div><b style="color:var(--signal)">Archaeologically unproven</b><span>no evidence of intent</span></div>
  <div><b style="color:var(--ochre)">Experimentally testable</b><span>GIS, acoustics, field trials</span></div>
</div>
</main>`,
  }),
);

/* ---------------- odds and ends ---------------- */
copy("site/style.css", "style.css");
write(
  "favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#fcfcfb"/><path d="M3 27h26" stroke="#17212b" stroke-width="2"/><rect x="7" y="12" width="4" height="15" fill="#1f57a3"/><rect x="21" y="15" width="4" height="12" fill="#1f57a3"/><path d="M4 8l24 4v4L4 12z" fill="#17212b"/></svg>`,
);
write(
  "404.html",
  shell({ title: "Not found · Neolithic Acoustic Signal Network", description: "Page not found.", path: "", body: `<main class="page"><div class="sheet hero"><div class="eyebrow">404</div><h1 style="font-size:48px">Nothing here</h1><p class="lede"><a href="/">Back to the start</a>.</p></div></main>` }),
);
console.log(`publish/: home, report (${toc.length} sections), ${plates.length} plates, presentation, receiver`);
