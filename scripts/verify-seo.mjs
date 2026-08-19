// Post-build sanity check:
//   1. every _site/directors/*/*.html has a unique og:image
//   2. every one has exactly one Review JSON-LD block
//   3. every referenced og:image exists on disk under _site/
// Fails loudly with a diff if anything is off.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(REPO_ROOT, "_site");
const REVIEWS = path.join(SITE, "directors");

function collectReviewHtml(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectReviewHtml(p));
    else if (e.name.endsWith(".html") && e.name !== "index.html") out.push(p);
  }
  return out;
}

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

const files = collectReviewHtml(REVIEWS);
if (files.length !== 30) {
  console.error(`expected 30 review pages, found ${files.length}`);
  process.exit(1);
}

// Every generated HTML page — not just reviews — must carry the full
// favicon + manifest set. Missed pages show a blank tab icon.
function collectAllHtml(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectAllHtml(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const FAVICON_REQUIRED = [
  /<link rel="icon" href="\/assets\/icons\/favicon\.ico"/,
  /<link rel="icon" href="\/assets\/icons\/favicon\.svg"/,
  /<link rel="apple-touch-icon" href="\/assets\/icons\/apple-touch-icon\.png"/,
  /<link rel="manifest" href="\/assets\/icons\/site\.webmanifest"/,
  /<meta name="theme-color" content="#06060a"/,
];
const faviconProblems = [];
for (const f of collectAllHtml(SITE)) {
  const html = fs.readFileSync(f, "utf8");
  for (const re of FAVICON_REQUIRED) {
    if (!re.test(html)) faviconProblems.push(`${f}: missing ${re}`);
  }
}
// Files that must ship at exact locations
const mustExist = [
  path.join(SITE, "favicon.ico"),
  path.join(SITE, "assets/icons/favicon.ico"),
  path.join(SITE, "assets/icons/favicon.svg"),
  path.join(SITE, "assets/icons/apple-touch-icon.png"),
  path.join(SITE, "assets/icons/icon-192.png"),
  path.join(SITE, "assets/icons/icon-512.png"),
  path.join(SITE, "assets/icons/site.webmanifest"),
  path.join(SITE, "assets/icons/bfc-mark.svg"),
];
for (const p of mustExist) {
  if (!fs.existsSync(p)) faviconProblems.push(`missing on disk: ${p}`);
}
if (faviconProblems.length) {
  console.error("Favicon verification failures:\n  " + faviconProblems.join("\n  "));
  process.exit(1);
}

const byOgImage = new Map();
const problems = [];

for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const ogImage = extract(html, /<meta property="og:image" content="([^"]+)"/);
  if (!ogImage) { problems.push(`${f}: no og:image`); continue; }
  if (!ogImage.startsWith("https://")) problems.push(`${f}: og:image not absolute → ${ogImage}`);
  (byOgImage.get(ogImage) || byOgImage.set(ogImage, []).get(ogImage)).push(f);

  const jsonldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const reviews = jsonldBlocks.filter(b => {
    try { return JSON.parse(b[1])["@type"] === "Review"; } catch { return false; }
  });
  if (reviews.length !== 1) problems.push(`${f}: expected 1 Review JSON-LD, found ${reviews.length}`);
  else {
    try {
      const d = JSON.parse(reviews[0][1]);
      if (!d.itemReviewed?.image?.startsWith("https://")) problems.push(`${f}: JSON-LD image not absolute`);
      if (typeof d.reviewRating?.ratingValue !== "number") problems.push(`${f}: reviewRating.ratingValue not a number`);
      if (d.reviewRating?.bestRating !== 15) problems.push(`${f}: bestRating != 15`);
    } catch (e) {
      problems.push(`${f}: JSON-LD parse error: ${e.message}`);
    }
  }

  // og:image file must exist under _site/
  const localPath = ogImage.replace(/^https?:\/\/[^/]+/, "");
  const abs = path.join(SITE, localPath);
  if (!fs.existsSync(abs)) problems.push(`${f}: og:image not on disk → ${abs}`);
}

for (const [url, group] of byOgImage) {
  if (group.length > 1) problems.push(`og:image collision → ${url}\n    ${group.join("\n    ")}`);
}

if (problems.length) {
  console.error("SEO verification failures:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`SEO verify: ${files.length} review pages, ${byOgImage.size} unique og:images, all Review JSON-LD valid.`);
