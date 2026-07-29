const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const gitDateCache = new Map();
function gitLastModified(inputPath) {
  if (!inputPath) return null;
  const abs = path.resolve(inputPath);
  if (gitDateCache.has(abs)) return gitDateCache.get(abs);
  let iso = null;
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", abs],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    if (out) iso = out;
  } catch (_) {}
  gitDateCache.set(abs, iso);
  return iso;
}

let reviewPathsCache = null;
function reviewSourcePaths() {
  if (reviewPathsCache) return reviewPathsCache;
  const root = path.resolve("src/directors");
  const out = [];
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const sub = path.join(root, dir.name);
    for (const f of fs.readdirSync(sub)) {
      if (f.endsWith(".md")) out.push(path.join(sub, f));
    }
  }
  reviewPathsCache = out;
  return out;
}

// Walk _includes once, parse each .njk for `extends` / `include`, and compute
// the transitive dependency set for every template. Used so a page's lastmod
// reflects edits to base.njk, partials, etc. — not just its own source file.
let layoutDepsCache = null;
function layoutDeps() {
  if (layoutDepsCache) return layoutDepsCache;
  const root = path.resolve("src/_includes");
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".njk")) files.push(p);
    }
  })(root);

  const RE = /\{%\s*(?:extends|include)\s+["']([^"']+)["']/g;
  const direct = new Map();
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const set = new Set();
    let m;
    while ((m = RE.exec(src)) !== null) {
      set.add(path.resolve(root, m[1]));
    }
    direct.set(f, set);
  }

  const cache = new Map();
  function trans(f, seen) {
    if (cache.has(f)) return cache.get(f);
    if (seen.has(f)) return new Set();
    seen.add(f);
    const out = new Set([f]);
    for (const dep of direct.get(f) || []) {
      for (const t of trans(dep, seen)) out.add(t);
    }
    seen.delete(f);
    cache.set(f, out);
    return out;
  }
  const result = new Map();
  for (const f of files) result.set(f, trans(f, new Set()));
  layoutDepsCache = result;
  return result;
}

function templateDeps(page) {
  const layout = page && page.data && page.data.layout;
  if (!layout) return [];
  const layoutPath = path.resolve("src/_includes", layout);
  const deps = layoutDeps().get(layoutPath);
  return deps ? [...deps] : [layoutPath];
}

function maxGitDate(paths) {
  let maxTs = -Infinity;
  let maxIso = null;
  for (const p of paths) {
    const d = gitLastModified(p);
    if (!d) continue;
    const t = Date.parse(d);
    if (Number.isFinite(t) && t > maxTs) { maxTs = t; maxIso = d; }
  }
  return maxIso;
}

// Ranking pages aggregate every review, so their freshness is the newest
// review edit — not the template's own mtime.
const RANKING_URLS = new Set(["/rankings/films/", "/rankings/directors/"]);

module.exports = function(eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets/css");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/images");

  // Watch for changes
  eleventyConfig.addWatchTarget("src/assets/");

  // ── Rating helpers ──────────────────────────────────────
  const MAX_SCORE = 15;

  function total(ratings) {
    return (ratings.anticipation || 0) + (ratings.enjoyment || 0) + (ratings.retrospect || 0);
  }

  // Site-wide tie-break rule: total desc, then Retrospect, then Enjoyment.
  // Final fallback keeps the sort deterministic.
  function byClubRating(a, b) {
    return (
      b.total - a.total ||
      b.r - a.r ||
      b.e - a.e ||
      a.name.localeCompare(b.name)
    );
  }

  // Bar gradient class (defined in rankings.css: rank-1..rank-5).
  // Gold for the #1 spot, purple for 12+, magenta for 10+, muted below.
  function fillClass(totalScore, rank) {
    if (rank === 1) return "rank-1";
    if (totalScore >= 12) return "rank-2";
    if (totalScore >= 10) return "rank-3";
    return "rank-4";
  }

  function barWidth(totalScore) {
    const pct = (totalScore / MAX_SCORE) * 100;
    return String(Math.round(pct * 10) / 10); // 86.7, 80, 100 …
  }

  // ── Collections ─────────────────────────────────────────

  // Every film review, ranked. Powers /rankings/films/.
  eleventyConfig.addCollection("filmRankings", function(collectionApi) {
    const films = collectionApi
      .getFilteredByGlob("src/directors/*/*.md")
      .filter((item) => item.data.ratings)
      .map((item) => {
        const ratings = item.data.ratings;
        return {
          name: item.data.film.title,
          film: item.data.film,
          slug: item.data.directorSlug,
          season: item.data.season.number,
          url: item.url,
          a: ratings.anticipation || 0,
          e: ratings.enjoyment || 0,
          r: ratings.retrospect || 0,
          total: total(ratings)
        };
      })
      .sort(byClubRating);

    return films.map((film, i) => ({
      ...film,
      rank: i + 1,
      width: barWidth(film.total),
      fillClass: fillClass(film.total, i + 1)
    }));
  });

  // Per-director averages across their reviewed films. Powers /rankings/directors/.
  eleventyConfig.addCollection("directorRankings", function(collectionApi) {
    const bySlug = {};
    collectionApi
      .getFilteredByGlob("src/directors/*/*.md")
      .filter((item) => item.data.ratings)
      .forEach((item) => {
        const slug = item.data.directorSlug;
        (bySlug[slug] = bySlug[slug] || []).push(item.data.ratings);
      });

    const avg = (arr) => arr.reduce((s, n) => s + n, 0) / arr.length;
    const fix1 = (n) => n.toFixed(1);

    const directors = Object.entries(bySlug)
      .map(([slug, ratingsList]) => {
        const t = avg(ratingsList.map(total));
        return {
          name: slug,
          slug,
          count: ratingsList.length,
          a: avg(ratingsList.map((r) => r.anticipation || 0)),
          e: avg(ratingsList.map((r) => r.enjoyment || 0)),
          r: avg(ratingsList.map((r) => r.retrospect || 0)),
          total: t
        };
      })
      .sort(byClubRating);

    return directors.map((d, i) => ({
      slug: d.slug,
      count: d.count,
      a: fix1(d.a),
      e: fix1(d.e),
      r: fix1(d.r),
      total: fix1(d.total),
      rank: i + 1,
      width: barWidth(d.total),
      fillClass: fillClass(d.total, i + 1)
    }));
  });

  // ── Filters ─────────────────────────────────────────────
  eleventyConfig.addFilter("pad", function(num, size, char = '0') {
    let s = String(num);
    while (s.length < size) s = char + s;
    return s;
  });

  eleventyConfig.addFilter("totalRating", total);

  // Git-derived last-modified ISO string for sitemap <lastmod>.
  // Takes the newest commit date across: the page source, every layout/partial
  // it renders through, and (for rankings) every review it aggregates. A base
  // layout edit therefore bumps every page — the rendered output really did
  // change — while a single-review edit only bumps that one page.
  eleventyConfig.addFilter("lastmod", function(page) {
    const paths = new Set();
    if (page && page.inputPath) paths.add(page.inputPath);
    for (const p of templateDeps(page)) paths.add(p);
    if (page && RANKING_URLS.has(page.url)) {
      for (const p of reviewSourcePaths()) paths.add(p);
    }
    const iso = maxGitDate(paths);
    if (iso) return iso;
    if (page && page.date) return new Date(page.date).toISOString();
    return null;
  });

  // Directors data object → array sorted by season (for the filter bar).
  eleventyConfig.addFilter("bySeason", function(directorsData) {
    return Object.entries(directorsData)
      .filter(([slug, d]) => slug !== "archive" && d && d.season)
      .map(([slug, d]) => d)
      .sort((a, b) => a.season - b.season);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
