# Add a New Director

Use this command when adding a new director to the Bayley Film Club site. It covers every file that needs to be created or updated.

## Before you start — gather this information

Ask the user for anything not already provided:

1. **Director basics**: full name, date of birth, city/country of origin, nationality, years active, total feature count
2. **Season number** (next season = current `site.json` `currentSeason` + 1)
3. **Selected films** (the picks for this season): title, year, runtime, country, genres, tagline, ratings (A/E/R out of 5 each), review text, pull quotes
4. **Bio tagline**: the short bold opener used before the bio (e.g. "The poet of private memory." — one evocative phrase)
5. **Bio text**: the paragraph in `directors.json`
6. **Recurring themes**: 4–5 theme tags
7. Research filmography and major award nominations (Oscar / BAFTA / Cannes Palme d'Or / Golden Globe) online for all films

---

## Files to CREATE

### 1. `src/directors/{slug}/index.njk`

Copy the structure of an existing director's `index.njk` (e.g. `kitano/index.njk`) and update:
- `title`, `permalink`, `directorSlug`, `breadcrumbs` in frontmatter
- The bio tagline in `<strong>…</strong>` before `{{ dir.bio }}`
- Decade marks in the timeline section (match the director's active years)
- `START_YEAR` and `END_YEAR` in the `<script>` block
- The two hardcoded review cards (title, year, runtime, genres, score, excerpt, A/E/R breakdown)

### 2. `src/directors/{slug}/{film-1-slug}.md` and `{film-2-slug}.md`

Follow the exact frontmatter structure of an existing review (e.g. `kitano/violent-cop.md`). Required fields:
```yaml
layout: layouts/review.njk
title: "FILM TITLE"
permalink: /directors/{slug}/{film-slug}.html
directorSlug: {slug}
hero_ghost: "GHOST_WORD"
title_lines:
  - "LINE ONE"
  - "LINE TWO"
intro_heading: "…"
film:
  title: "…"
  year: YYYY
  runtime: NNN
  country: …
  genres: ["…", "…"]
  tagline: "…"
season:
  number: NN
  position: N
  total: N
spoiler_warning: false
ratings:
  anticipation: N
  enjoyment: N
  retrospect: N
  verdict: "…"
score_descriptions:
  anticipation: "…"
  enjoyment: "…"
  retrospect: "…"
breadcrumbs:
  - text: Director Name
    url: /directors/{slug}/
  - text: FILM TITLE
```

---

## Files to UPDATE

### 3. `src/_data/directors.json`

Add a new key `"{slug}": { … }` before the `"archive"` array. Required fields:
```json
{
  "name": "Full Name",
  "firstName": "First",
  "lastName": "Last",
  "slug": "{slug}",
  "ghostLetter": "X",
  "season": NN,
  "isCurrent": true,
  "born": "Mon DD, YYYY",
  "origin": "City, Country",
  "nationality": "…",
  "active": "YYYY – Present",
  "features": N,
  "bio": "…",
  "themes": ["…", "…", "…", "…", "…"],
  "filmography": [
    { "year": YYYY, "title": "…", "genre": "… · …", "pick": false },
    { "year": YYYY, "title": "…", "genre": "…", "pick": true, "slug": "film-slug", "awards": [{ "type": "bafta", "status": "nom" }] }
  ],
  "picks": ["film-1-slug", "film-2-slug"]
}
```

Award types: `"oscar"`, `"palme"`, `"bafta"`, `"globe"`. Status: `"won"` or `"nom"`.

Also set `"isCurrent": false` on the previous director.

### 4. `src/_data/site.json`

Update `currentSeason` and `currentDirector`.

### 5. `src/rankings/directors.njk`

Insert a new `leaderboard-row` at the correct position (sorted by average score descending; tiebreak by R avg, then E avg). Calculate:
- Average total = (sum of all film totals) / number of films
- Sub-score averages (A, E, R) to one decimal place
- `data-width` = (average total / 15) × 100, rounded to 1 decimal
- Rank CSS class: `rank-1` through `rank-7` — match the tier of nearby directors

Renumber all rows below the insertion point.

### 6. `src/rankings/films.njk`

**Add filter button** in the filter bar:
```html
<button class="filter-btn" data-filter="{slug}">{Display Name}</button>
```

**Insert each film** as a `leaderboard-row` at the correct position (sorted by total desc, tiebreak R desc then E desc). For each film:
- `data-director="{slug}"`, `data-total="N"`, `data-r="N"`, `data-e="N"`
- `data-width` = (total / 15) × 100, formatted to match surrounding entries
- Rank CSS class matches existing films at the same score tier

Renumber all rows below each insertion point.

---

## Notes

- The `ghostLetter` is the first letter of the director's last name.
- Do not create a `{slug}.json` file (the empty per-directory json files are legacy and unused).
- Delete any `{slug}.md` file in the director folder if it exists — it conflicts with `index.njk`'s permalink.
- For the timeline `START_YEAR`, use the year of the director's **first feature film** (not short films or compilation works). Use `END_YEAR = 2025` (or current year + a few).
- Score bar percent and rank classes for common totals: 15→100%/rank-1, 13→86.7%/rank-2, 12→80%/rank-2, 11→73.3%/rank-4, 10→66.7%/rank-5 or rank-6, 9→60%/rank-7, 8→53.3%/rank-7.
- **Filmography**: only include standalone feature films. Do not include short films, compilation/omnibus works, or TV movies. Documentaries can be included but clearly labelled with `"genre": "Documentary"`. If a director is known for shorts compiled into a longer work (e.g. a trilogy), it does not count as a feature.
- **Living status**: always check whether the director is still alive before writing the bio and setting `active`. If deceased, write the bio in past tense, do not use "Present" in `active` — use the year of their last film instead (matching the pattern of other directors, e.g. `"1977 – 2006"`). The bio should use past tense throughout ("was", "drew", "rendered"), not present.
- **Active field**: reflects the director's feature film career years, not birth-to-death. Use first feature year to last feature year.
