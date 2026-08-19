// Generate 1200×630 social preview cards, one per review.
// Composition: dark bg, poster left, film metadata right in the season's
// accent colour. Fonts are rendered via SVG so there's no system-font
// dependency in CI.
//
// Skips regeneration when the output JPEG is newer than both the source
// poster and this script itself.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEWS_ROOT = path.join(REPO_ROOT, "src/directors");
const OUT_DIR = path.join(REPO_ROOT, "src/assets/og");
const DIRECTORS_JSON = path.join(REPO_ROOT, "src/_data/directors.json");
const SCRIPT_PATH = fileURLToPath(import.meta.url);

const W = 1200;
const H = 630;
const BG = "#06060a";
const ACCENTS = ["#e8189a", "#7b2fff", "#c9a84c"]; // season % 3

function accentFor(season) {
  return ACCENTS[season % ACCENTS.length];
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  const grab = (re) => { const g = body.match(re); return g ? g[1] : null; };
  out.title = grab(/^\s{2}title:\s*"([^"]+)"\s*$/m);
  out.year = grab(/^\s{2}year:\s*(\d+)\s*$/m);
  out.poster = grab(/^\s{2}poster:\s*(\S+)\s*$/m);
  const seasonBlock = body.match(/^season:\n([\s\S]*?)(?=^\S|\Z)/m);
  if (seasonBlock) {
    const sm = seasonBlock[1].match(/^\s{2}number:\s*(\d+)\s*$/m);
    if (sm) out.season = Number(sm[1]);
  }
  out.directorSlug = grab(/^directorSlug:\s*(\S+)\s*$/m);
  const ratings = body.match(/^ratings:\n([\s\S]*?)(?=^\S|\Z)/m);
  if (ratings) {
    const a = ratings[1].match(/^\s{2}anticipation:\s*(\d+)\s*$/m);
    const e = ratings[1].match(/^\s{2}enjoyment:\s*(\d+)\s*$/m);
    const r = ratings[1].match(/^\s{2}retrospect:\s*(\d+)\s*$/m);
    if (a && e && r) out.total = Number(a[1]) + Number(e[1]) + Number(r[1]);
  }
  return out;
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function wrapTitle(title, maxCharsPerLine) {
  const words = title.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (candidate.length > maxCharsPerLine && cur) { lines.push(cur); cur = w; }
    else cur = candidate;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2); // hard cap 2 lines
}

function textSvg({ title, director, year, total, accent, posterWidth }) {
  const leftPad = posterWidth + 60;
  const textW = W - leftPad - 60;
  const titleLines = wrapTitle(truncate(title, 60), 22);
  const titleFontSize = titleLines.length > 1 ? 68 : 82;
  const titleLineHeight = titleFontSize * 1.05;
  const titleTop = 170;

  const tspans = titleLines
    .map((line, i) => `<tspan x="${leftPad}" dy="${i === 0 ? 0 : titleLineHeight}">${esc(line)}</tspan>`)
    .join("");

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .eyebrow { font-family: 'Space Mono', 'Courier New', monospace; font-size: 20px; letter-spacing: 6px; fill: ${accent}; text-transform: uppercase; }
      .title { font-family: 'Bebas Neue', Impact, sans-serif; font-size: ${titleFontSize}px; fill: #ffffff; letter-spacing: 1px; }
      .meta { font-family: 'Syne', Helvetica, sans-serif; font-size: 22px; fill: #b7b7c8; }
      .rating-num { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 92px; fill: ${accent}; letter-spacing: 2px; }
      .rating-max { font-family: 'Space Mono', 'Courier New', monospace; font-size: 20px; fill: #7a7a8c; letter-spacing: 3px; }
      .brand { font-family: 'Space Mono', 'Courier New', monospace; font-size: 18px; letter-spacing: 4px; fill: #7a7a8c; text-transform: uppercase; }
    </style>
    <text class="eyebrow" x="${leftPad}" y="120">The Bayley Film Club</text>
    <text class="title" x="${leftPad}" y="${titleTop + titleFontSize}">${tspans}</text>
    <text class="meta" x="${leftPad}" y="${titleTop + titleFontSize + titleLineHeight * titleLines.length + 24}">${esc(director)} · ${esc(year)}</text>
    <text class="rating-num" x="${leftPad}" y="${H - 80}">${total}<tspan class="rating-max" dx="12">/ 15</tspan></text>
    <text class="brand" x="${W - 60}" y="${H - 40}" text-anchor="end">bayleyfilmclub.com</text>
  </svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const directors = JSON.parse(fs.readFileSync(DIRECTORS_JSON, "utf8"));
  const scriptMtime = fs.statSync(SCRIPT_PATH).mtimeMs;

  let generated = 0, skipped = 0;
  const failures = [];

  for (const dir of fs.readdirSync(REVIEWS_ROOT, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const sub = path.join(REVIEWS_ROOT, dir.name);
    for (const f of fs.readdirSync(sub)) {
      if (!f.endsWith(".md")) continue;
      const full = path.join(sub, f);
      const src = fs.readFileSync(full, "utf8");
      const fm = parseFrontmatter(src);
      if (!fm || !fm.poster || !fm.title || !fm.year || fm.season == null || fm.total == null || !fm.directorSlug) {
        failures.push(`${full}: could not extract frontmatter fields`);
        continue;
      }
      const posterRel = fm.poster.replace(/^\/+/, "");
      const posterPath = path.join(REPO_ROOT, "src", posterRel);
      if (!fs.existsSync(posterPath)) {
        failures.push(`${full}: poster not on disk → ${fm.poster}`);
        continue;
      }
      const dirData = directors[fm.directorSlug];
      if (!dirData || !dirData.name) {
        failures.push(`${full}: no directors[${fm.directorSlug}].name`);
        continue;
      }

      const stem = f.replace(/\.md$/, "");
      const outFile = path.join(OUT_DIR, `${stem}-${fm.year}-card.jpg`);
      const posterMtime = fs.statSync(posterPath).mtimeMs;
      if (fs.existsSync(outFile)) {
        const outMtime = fs.statSync(outFile).mtimeMs;
        if (outMtime > posterMtime && outMtime > scriptMtime) { skipped++; continue; }
      }

      const accent = accentFor(fm.season);
      const posterH = 630;
      const posterW = Math.round(posterH * 3 / 4);
      const posterBuf = await sharp(posterPath)
        .resize({ width: posterW, height: posterH, fit: "cover" })
        .png()
        .toBuffer();

      const svg = Buffer.from(textSvg({
        title: fm.title,
        director: dirData.name,
        year: fm.year,
        total: fm.total,
        accent,
        posterWidth: posterW,
      }));

      await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
        .composite([
          { input: posterBuf, left: 0, top: 0 },
          { input: svg, left: 0, top: 0 },
        ])
        .jpeg({ quality: 85 })
        .toFile(outFile);
      generated++;
    }
  }

  if (failures.length) {
    console.error("OG card build failures:\n  " + failures.join("\n  "));
    process.exit(1);
  }
  console.log(`OG cards: generated ${generated}, skipped ${skipped}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
