# OpenPeeps release description (HTML)

Write a narrative release page for the **latest** git `*-RELEASE` tag in this
repo. Distill what changed for people (UI) and for the platform (backend).
Do not paste the changelog as-is.

## Goal

One self-contained HTML file under `releases/` that a PM or operator can open
in a browser. Match the **roadmap** visual language
(`planning/roadmap-timeline.html`): same CSS tokens, type, borders, and
accent. No gradients, drop shadows, emoji, or external assets.

## 1. Resolve the last release from tags

From the OpenPeeps repo root:

```bash
git fetch origin --tags
git tag --list '*RELEASE*' --sort=-creatordate
```

Take:

- **this** tag: the newest `YYYY-MM-DD-<sha>-RELEASE`
- **previous** tag: the next newest `*-RELEASE`

Commit range: `previous..this` (`git log --oneline previous..this`).

If two tags share a date, still describe **this** tag’s range only. Mention
the same-day predecessor in a short note if the range is a small follow-up.

Record the tag name, the date from the tag prefix, and the previous tag.

## 2. Distill the story

Read the commits (and `CHANGELOG.md` section for that date if it matches).
Split into:

| Column | Include |
| --- | --- |
| **In the product** | Member, moderator, and admin **UI**: feeds, posts, groups, jams, PWA, i18n, analytics screens, mobile |
| **In the platform** | API, DB, LiveKit, workers, auth, plugins, config, CI, packaging, security |

Rules:

- Write in complete sentences a non-engineer can scan.
- Group related commits under short `h3` headings (3–6 words).
- Prefer outcomes over ticket numbers and file paths.
- Skip `Regenerate changelog` and pure chore noise unless it is user-visible
  (e.g. npm scope rename).
- Call out breaking ops notes (package scope, migration commands) in the
  platform column.
- Docs-only work can sit in an “Also in this tag” strip under the two
  columns.

## 3. Write the HTML

Output path: **`releases/<tag-name-without--RELEASE>.html`**

Example: tag `2026-08-12-855c41aa-RELEASE` →
`releases/2026-08-12-855c41aa.html`.

If `releases/index.html` exists, add a card at the top linking this file.

### Layout contract

- Max width ~960px. Header: “OpenPeeps release · \<readable date\>”, subtitle
  is the full tag name.
- Lede paragraph (one short block, accent top border) stating the week’s
  thrust.
- Two-column grid: product (left) and platform (right). Stack to one column
  under ~720px.
- Optional notes strip for docs/CI.
- Footer: git range, link to the previous release HTML if it exists, source
  `code.openpeeps.org/openpeeps/openpeeps` and the tag.

### Visual rules (copy from the roadmap)

```css
:root {
  --bg: #fafafa;
  --text: #171717;
  --text-2: #404040;
  --text-3: #737373;
  --text-4: #a3a3a3;
  --line: #d4d4d4;
  --line-strong: #525252;
  --accent: #2563eb;
  --surface: #ffffff;
}
```

- Font: `'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- Body padding 24px, background `--bg`
- Cards: `--surface` fill, `1px solid var(--line)`
- Section labels: 13px, weight 600, `--accent`, uppercase
- Topic bullets: 3px dots in `--text-4` (same as roadmap `.topics li::before`)
- No CDN, no images required
- Print: landscape, white background

Reuse the structure of an existing file in `releases/` when one exists;
replace the copy from the new tag.

## 4. Quality bar

- [ ] Range is `previous-RELEASE..this-RELEASE`, not `main` or “Current”
- [ ] UI and backend are both covered (or explicitly empty with a sentence)
- [ ] Tag name appears in the subtitle and footer
- [ ] File is self-contained HTML
- [ ] Tokens match the roadmap (do not invent a new palette)

## 5. Chat response

Report: tag, previous tag, commit count, one-line product theme, one-line
platform theme, and the HTML path.
