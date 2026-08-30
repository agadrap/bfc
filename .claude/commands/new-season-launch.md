# New Season Launch — the monthly run

Everything that happens when a season goes live: publish it, promote it, mail it.
Run this once a month, after the reviews are written.

`/add-director` is the *build* step (files, data, rankings). This command wraps it and
adds the four things that happen after: promote posters out of limbo, write the social
posts, mail the Letterboxd fragments, draft the Kit newsletter.

---

## 0 · Preflight

Read `src/_data/site.json` for the current season number, then confirm with the user:

- **Season number** being launched (usually `currentSeason` + 1)
- **Director slug** and the films in the season
- Are the reviews written? If not, stop — nothing else works without them.
- Are the posters ready? Check `limbo/posters/` for `SS_slug-year-poster.png`.

If the season is already drafted in `limbo/directors/<slug>/`, this is a **promotion**,
not a build. Promotion = move the director folder **and** its posters across together:

```bash
git mv limbo/directors/<slug> src/directors/<slug>
git mv limbo/posters/SS_*.png src/assets/posters/
```

Eleventy copies `src/assets/` wholesale into `_site`, which is exactly why unpublished
artwork lives in `limbo/` — never stage posters in `src/assets/` early.

---

## 1 · Publish the season

Follow `/add-director` in full. Non-negotiable checks before moving on:

- [ ] `src/_data/directors.json` — new director added, previous one `"isCurrent": false`
- [ ] `src/_data/site.json` — `currentSeason` + `currentDirector` updated
- [ ] Both rankings pages updated **and renumbered** (`rankings/directors.njk`, `rankings/films.njk`)
- [ ] Each review's A + E + R equals the total shown
- [ ] `npm run build` clean, then spot-check a review page in `_site/`
- [ ] Posters referenced in review frontmatter as `poster: /assets/posters/SS_slug-year-poster.png`

Commit and push to `main` — GitHub Pages rebuilds. **The site must be live before any post
goes out**, because every post below links to it.

---

## 2 · The promo pack

Produce all of it in one go, then hand it over for approval before anything is sent.
Write it to `promo/SS-<slug>/` in the repo (gitignored scratch is fine) so it can be
edited rather than copied out of the chat.

### 2a · X post

One post per season launch, plus one per film if the user wants a thread.

- 280 characters max including the link. Count it — do not estimate.
- Voice: the site's voice. Dry, specific, a real opinion. No "🎬 Excited to announce".
- No hashtag soup — at most one, usually none.
- Always: the club rating, the director, the link.
- Link to the **director page** for the season post (`/directors/<slug>/`), the **review**
  for a film post.
- The poster is the image. Attach `SS_slug-year-poster.png` (X will letterbox the 3:4).

Season-launch shape:

> Season 15 of The Bayley Film Club: Lynne Ramsay.
> Three films, three ratings, one argument about whether Morvern Callar is cold or just
> honest. (It's cold.)
> bayleyfilmclub.com/directors/ramsay/

Film shape:

> Ratcatcher (1999) — 12/15.
> Anticipation 3, Enjoyment 5, Retrospect 4. A community stuck in limbo, rendered
> through pure feeling.
> [link]

### 2b · Instagram story

Stories are 1080×1920. The posters are 896×1200 (3:4), so they need a frame, not a crop.

Produce a **spec**, not a guess — the user builds the frame in Canva/Figma, or asks an
image model for it:

- Background: near-black `#06060a`, same scanline texture as the poster.
- Poster centred, ~78% width, sitting slightly above centre.
- Above it: `THE BAYLEY FILM CLUB` in Space Mono, letterspaced, muted `#6a6880`.
- Below it: film title in Bebas Neue, then `CLUB RATING NN/15` in the season's accent
  colour (`season % 3` → 0 magenta `#e8189a`, 1 purple `#7b2fff`, 2 gold `#c9a84c`).
- Bottom third left clear for the link sticker — that is where the "read the review"
  tap goes. Never put text in the bottom 320px.
- One story per film, plus one season-opener with the director's name.

Also write the **story caption text overlay** — one line, under 12 words, the sharpest
sentence in the review.

### 2c · Letterboxd fragments — emailed

Letterboxd is posted by hand, so the job here is to produce paste-ready text and **email
it to agadrap@gmail.com**.

For each film in the season:

- **Star rating**: `stars = round((total / 15) * 5 * 2) / 2` gives the number, and it is
  usually right — checked against all 10 reviews on letterboxd.com/dr_agnieszka, 8 match
  exactly. **Propose it rather than assert it**, because the two deviations both run the
  same way: upward, where a low Anticipation drags the club total below what the film
  deserves. Funny Games is 8/15 (Anticipation 5, Enjoyment 1) → formula 2.5, actual ★★★½.
  Only God Forgives is 11/15 → formula 3.5, actual ★★★★. So when Enjoyment is low but the
  review is admiring, expect the star rating to sit half a point to a point above the
  formula — flag it and ask.
  (12/15 → 4 · 10/15 → 3.5 · 13/15 → 4.5 · 14/15 → 4.5 · 15/15 → 5)
- **Short review**: 60–120 words. This is not a summary of the site review — it is the
  two or three best sentences of it, lifted and lightly stitched so they stand alone.
  Prefer the sentences that make a claim over the ones that describe the plot.
- **Sign-off line**: a link back to the full review. Vary it (see §4).
- Flag anything spoiler-heavy — Letterboxd needs the spoiler box ticked, and the site
  review's `spoiler_warning: true` is the tell.

Send with the Gmail tools — `create_draft` if the user wants to review it first,
`send_message` if they have already approved the text in chat. Subject line:
`BFC Season NN — Letterboxd fragments (Director Name)`. Plain text, one film per block,
nothing that needs reformatting after a copy-paste.

---

## 3 · The newsletter

The list lives in **Kit**, in the Bayley Film Club account (separate from the byaga.dev
one). Kit's own editor is where the broadcast is finished — this step produces the copy.

Structure, in order:

1. **Subject line** — 3 options, under 50 characters. Concrete beats clever. The director's
   name or a film title in the subject outperforms a tease.
2. **Preview text** — one line, different from the subject, not a repeat of it.
3. **The opener** — two or three sentences on why this director, now. Personal, not a
   press release.
4. **The films** — one short block each: title, year, club rating, one sentence of verdict,
   link to the review.
5. **The Letterboxd ask** — see §4. Rotate it. This is the whole point of the email:
   it is asking for a conversation, not a click.
6. **Sign-off** — what's coming next season, if it's decided.

Length target: under 300 words. It is a dispatch, not an essay — the essays are on the site.

Then: paste into Kit → **Broadcasts → New broadcast**, set the From address to the
bayleyfilmclub.com sending address, send a test to yourself, check the links, schedule it.

---

## 4 · The Letterboxd ask — rotate it

The email always asks people to come and argue on Letterboxd. If the wording is identical
every month it reads like a template and stops working.

Pick by season number so it never repeats back-to-back: `variant = season % 10`.
Rewrite the chosen one in the moment — these are shapes, not scripts.

0. I've left my reviews up on Letterboxd. Tell me where I'm wrong in the comments.
1. If you've seen it, I want to know what you made of it — the comments under my Letterboxd review are open.
2. Rate it against me. My Letterboxd review is here; the disagreement is the fun part.
3. Comment under the Letterboxd review if you've seen it. Especially if you loved the one I didn't.
4. There's a comment box under my Letterboxd review and it is far too quiet.
5. Genuinely curious whether anyone else landed where I did. Letterboxd comments, please.
6. Half of watching a film is arguing about it afterwards. Letterboxd is where I do that.
7. If you think I've been unfair to [film], say so under the Letterboxd review. I can take it.
8. Tell me your rating out of five in the Letterboxd comments — I'll tell you if you're wrong.
9. The reviews are on Letterboxd too. Come and disagree with the numbers.

Same rule for the **X posts** and the **subject lines**: check the last two months'
files in `promo/` and do not reuse an opening construction, a joke shape, or a subject
formula that appeared in either.

---

## 5 · Wrap up

- [ ] Site live, links checked from the actual published page (not localhost)
- [ ] X post published, poster attached
- [ ] Instagram story posted with the link sticker
- [ ] Letterboxd fragments emailed to agadrap@gmail.com
- [ ] Kit broadcast tested and scheduled
- [ ] Letterboxd reviews posted, and the newsletter's link points at the right ones
- [ ] `promo/SS-<slug>/` saved so next month can check for repetition

Then tell the user what went out and what still needs a human hand.

---

## Notes

- The signup form's Kit form id lives in `src/_data/site.json` → `newsletter.formId`.
  If it still reads `REPLACE_WITH_KIT_FORM_ID`, the form on the site is not collecting
  anything — fix that before promoting a season.
- `newsletter.letterboxd` in the same file holds the Letterboxd profile URL used in copy.
- Never invent a quote, a rating or a runtime. Everything comes from the review frontmatter
  or the review body. If it isn't there, ask.
- Season accents rotate `season % 3` → 0 magenta, 1 purple, 2 gold. Every asset in a
  season shares the accent.
