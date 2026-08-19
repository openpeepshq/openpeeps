# OpenPeeps roadmap timeline (HTML)

Regenerate `planning/roadmap-timeline.html` from **current** open issues and
milestones on `code.openpeeps.org/openpeeps/openpeeps`. Do not reuse stale
counts, themes, or topics from a previous run — always fetch and distill fresh
data.

## Goal

One landscape HTML page with a **central horizontal time arrow** from today
through the farthest open milestone (typically 2028). Near-term milestones get
weekly detail; later horizons get progressively less detail. Each point on the
arrow shows a short theme title and a few main topics.

Overwrite `planning/roadmap-timeline.html` in this repo. Keep the file
self-contained (no external assets, no build step).

## 1. Fetch current data

From the OpenPeeps repo root (or any clone with `origin` → Forgejo):

```bash
# List open milestones (titles + open issue counts)
tea milestones list --remote origin --state open --output json

# Page through all open issues until exhausted
# (tea paginates; collect every page into one array)
tea issues list --remote origin --state open --output json --page N
```

If `tea` fails, use the Forgejo API against `https://code.openpeeps.org` for
`/api/v1/repos/openpeeps/openpeeps/milestones` and
`/api/v1/repos/openpeeps/openpeeps/issues?state=open`. Prefer `tea` when
authenticated.

Record:

- Snapshot date (today)
- Total open issues
- Per-milestone: title, open issue count, issue titles + `feature/*` labels
- Counts for non-dated buckets: `Specification Needed`, `Not Planned`,
  unmilestoned

## 2. Build the timeline model

### Include on the arrow

Only **dated / sequenced** milestones:

- Weekly `Release YYYY-MM-DD` milestones that are still open (or the current
  quarter’s weekly releases)
- Quarterly buckets: `YYYY Qn`
- Year buckets: `YYYY`

Sort chronologically. Drop past weekly releases that are closed or empty unless
they still have open issues.

### Exclude from the arrow (footer only)

- `Specification Needed`
- `Not Planned`
- Unmilestoned issues

Mention their counts in the page footer; do not invent dates for them.

### Detail taper

| Region | Which milestones | Topics per point |
| --- | --- | --- |
| **Near term** (current quarter / next ~6–8 weeks) | Each weekly release as its own point | 3–4 concrete topics |
| **Mid horizon** (rest of year + next 1–2 quarters) | One point per quarter | 2–3 topics |
| **Far horizon** | Collapse thin quarters (e.g. Q3+Q4 if both tiny); year bucket if present | 1–2 topics |

If milestone structure has changed (no weekly releases, different naming), keep
the same principle: denser points near today, coarser points later.

### Distill themes and topics

For each timeline point:

1. Read issue titles and `feature/*` labels in that milestone (or group of
   milestones if collapsed).
2. Invent **one theme title** (3–6 words) that names the main thrust — not a
   label dump.
3. List **main topics** as short phrases a PM could scan. Prefer product
   outcomes over ticket numbers. Do not list every issue.
4. Set `count` to the number of open issues represented by that point.

Example of good distillation (illustrative only — replace with live data):

- Milestone “Release 2026-08-19”, 28 issues → theme “Mobile and jam quality”,
  topics about jam chat/recording, RN polish, moderator role, SSE — not 28
  bullets.

## 3. Write the HTML

Output path: **`planning/roadmap-timeline.html`**

### Layout contract

- Landscape composition: wide canvas (~1600×760 content area, page scrolls
  horizontally if needed).
- Header: title “OpenPeeps roadmap to \<end year\>”, subtitle with total open
  issues and one line of framing (“resolution narrows as the horizon widens”).
- Two zone labels above the axis: **current quarter** (accent) vs **horizon**.
- Central horizontal axis:
  - Thick accent stroke for the near-term stretch
  - Thinner neutral stroke for the horizon stretch
  - Arrowhead at the right end
  - A “today” tick near the left
- Nodes on the axis; **radius scales with √(issue count)** (cap ~15px) so large
  milestones read as bulges.
- Near-term nodes filled with accent; horizon nodes hollow (stroke only).
- Labels **alternate above / below** the axis so text does not collide.
- Each label: date/period, issue count, theme, then topic bullets.
- Footer: off-arrow counts + source URL + snapshot date.

### Visual rules

- Self-contained single HTML file; inline CSS only.
- Clean, flat, print-friendly. No gradients, no drop shadows, no emoji.
- System or readable UI font stack is fine.
- Use a restrained palette (neutral text/lines + one accent, e.g. `#2563eb`).
- Prefer SVG for the axis, stems, nodes, and arrowhead; HTML/CSS for header,
  zone titles, and milestone label cards positioned absolutely over the SVG.
- Must look coherent when opened in a browser at ~1600px wide; readable when
  printed landscape.

### Structure sketch

Reuse this skeleton and fill from live data (adjust coordinates when the number
of points changes — spread near-term points evenly in the left zone, horizon
points evenly in the right zone):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenPeeps roadmap</title>
  <style>/* layout + tokens */</style>
</head>
<body>
  <header>…title, issue total…</header>
  <main class="timeline" style="width:1600px;height:760px;position:relative">
    <div class="zones">…current quarter / horizon…</div>
    <svg>…axis, today tick, stems, nodes, arrow…</svg>
    <!-- absolutely positioned .milestone blocks alternating above/below -->
  </main>
  <footer>…spec needed / not planned / source / date…</footer>
</body>
</html>
```

## 4. Export the PNG

Render the finished HTML to **`planning/roadmap-timeline.png`** (same path,
overwrite the old one). Use the Chromium that ships with the repo's Playwright —
do not install a new browser or add a dependency.

Full-page screenshot at a 1648×920 viewport, `deviceScaleFactor: 1` (matches the
1600px canvas + 24px body padding on each side):

```bash
REPO="$(git rev-parse --show-toplevel)"   # this repo root
cd "$REPO"
PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" node -e "
const { chromium } = require('$REPO/node_modules/.pnpm/playwright@<version>/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1648, height: 920 },
    deviceScaleFactor: 1,
  });
  await page.goto('file://$REPO/planning/roadmap-timeline.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '$REPO/planning/roadmap-timeline.png', fullPage: true });
  await browser.close();
})();
"
```

Notes:

- pnpm hides `playwright` behind `.pnpm/playwright@<version>/node_modules/`, so a
  bare `require('playwright')` fails — require the absolute path (find the
  version with `ls node_modules/.pnpm/playwright@*`).
- The sandbox may point Playwright at an empty temp cache; set
  `PLAYWRIGHT_BROWSERS_PATH` to the real cache (`~/Library/Caches/ms-playwright`)
  so it finds the already-installed Chromium headless shell.
- If the milestone count changes the page height, adjust the viewport height so
  the full-page screenshot has no large empty band, but keep width at 1648.
- Confirm the output is `PNG image data, 1648 x <h>` and re-open it to check the
  axis, nodes and labels rendered.

## 5. Quality bar

Before finishing:

- [ ] Data was fetched in this run (not copied from an old HTML or chat)
- [ ] Every dated open milestone with issues appears (or is intentionally
      collapsed with a note in the theme/topics)
- [ ] Near term is weekly; later is quarterly/yearly
- [ ] Themes and topics match the **current** issue set
- [ ] Counts in labels and footer match the fetch
- [ ] File is at `planning/roadmap-timeline.html` and opens as one landscape page
- [ ] No external CDN / fonts / images required
- [ ] `planning/roadmap-timeline.png` was re-rendered from the new HTML and
      matches the current data

## 6. Chat response

After writing the files, briefly report: snapshot date, total open issues,
how many timeline points, and the near-term → far-horizon theme sequence
(one line each). Link the HTML and PNG paths.
