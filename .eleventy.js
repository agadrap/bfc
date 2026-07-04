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
