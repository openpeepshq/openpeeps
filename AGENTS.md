# AGENTS.md

Guidelines for coding agents working in this repository. Read this before
making changes. These rules are not optional.

## Prime directives

1. **Keep overall complexity low.** The simplest solution that fully solves the
   problem wins. Fewer moving parts, fewer abstractions, fewer files.
2. **Be terse.** Write the least code that does the job clearly. No speculative
   generality, no dead code, no "just in case" options or parameters.
3. **Code quality over speed.** Don't take shortcuts that leave the codebase
   worse than you found it.
4. **Consistency beats cleverness.** Match the surrounding code's patterns even
   when you'd personally prefer another approach. A consistent codebase is more
   valuable than any local optimization.
5. **Refactor when it simplifies.** If a change becomes cleaner by first
   simplifying existing code, do the refactor. Leave things simpler than you
   found them — never bolt complexity onto a shaky structure to avoid touching
   it.

## Explaining your changes

**Any change that touches more than 3 files OR changes more than 6 lines must be
accompanied by a written outline of exactly what changed and why.**

- List each file touched and the reason for the change to it.
- Explain the "why", not just the "what" — what problem it solves and which
  approach you chose over alternatives.
- For commits/PRs this goes in the message body. For a chat response it goes in
  the summary. Trivial changes (≤3 files and ≤6 lines) need no outline.

## Language & style (inferred from the codebase — follow it)

- **Arrow functions only.** Define functions as `export const fn = (args) => …`.
  Do not use `function` declarations.
- **No TypeScript classes.** This codebase does not use `class`. Model behavior
  with functions and plain data; model data with types and Zod schemas.
- **Named exports.** No default exports except where a framework requires them
  (e.g. email template `index.ts`).
- **`type` and `interface` for shapes; Zod for runtime-validated data.** Where a
  schema exists, derive the type with `z.infer<typeof schema>` rather than
  hand-writing a duplicate type.
- **Prefer immutability.** `const` over `let`; avoid mutation; prefer
  `map`/`filter`/`reduce` and spreads over in-place edits.
- **No `any`.** It is an ESLint warning and should be treated as an error. Use
  precise types or `unknown` + narrowing.
- **Prefix intentionally-unused identifiers with `_`** (matches the lint rule).
- **Barrel files.** Each module exposes its public surface via `index.ts`.
  Export new public symbols there.
- **`@openpeepshq/*` import depth.** Import from the package root
  (`@openpeepshq/core`, `@openpeepshq/common`, …) **or at most one subpath
  segment** (`@openpeepshq/core/jams`, `@openpeepshq/common/types`,
  `@openpeepshq/react/email`). No deeper chains
  (`@openpeepshq/core/db/explorer`, `@openpeepshq/react/pwa/vite`). One-level
  entry points are the public surface (`package.json` `exports` `./*` →
  `dist/*/index.js`); re-export nested modules from that segment’s barrel
  instead of importing deeper.

## Comments

- Comment **why**, not **what**. Do not narrate the code.
- No comments that restate the next line. Delete obvious/redundant comments.
- A short comment explaining a non-obvious constraint, trade-off, or edge case
  is welcome.

## Formatting & linting

- Prettier and ESLint are the source of truth. Config: 2-space indent, single
  quotes, trailing commas (`all`), 80-column print width.
- Do not hand-format against the tools. Run `pnpm format` / `pnpm lint` in the
  package you touched.
- Fix any lint errors you introduce before finishing.

## Repository layout

- pnpm workspace monorepo. Packages live under `platform/*`, `libraries/*`,
  and `plugins/*/*`.
- `platform/common` — shared types and utilities (Zod schemas live here).
- `platform/core` — backend logic: DB, notifications, email, jobs, roles, plugin loader.
- `platform/server` — API server (Riddl); add new API endpoints here.
- `platform/web` — web client (React); add new UI here.
- `platform/react` — React client (includes plugin registry). `platform/rn-components` — React Native client.
- `platform/worker` — BullMQ workers (email, media, notifications, events).
- `platform/i18n` — locale files; user-facing strings go in `locales/en.json`.
- `plugins/<namespace>/<name>` — plugin packages. See `platform/web/docs/development/plugins.md` for the contract.

## Run the app

To run OpenPeeps locally, use the `run-openpeeps` skill
(`.agents/skills/run-openpeeps/SKILL.md`). Do not improvise setup or startup
steps — follow that skill.

## Build, test, lint

- Tests use Vitest: `pnpm --filter @openpeepshq/<pkg> test` (or
  `pnpm exec vitest run <path>` within a package).
- Rebuild, lint, and verify touched packages before finishing — see
  `check-openpeeps-pr-readiness` when preparing a PR.

## Conventions to respect

- **i18n:** never hardcode user-facing copy. Add a key to `locales/en.json` and
  reference it via the `t()` function.
- **Schema migrations:** changes to stored data shape go through **Drizzle SQL**.
  Update tables under
  `platform/core/src/db/pg/schema/`, then
  `pnpm --filter @openpeepshq/core db:generate -- --name snake_case_what_it_does`
  (SQL lands in `platform/core/src/db/pg/sql/`) and apply with `db:migrate`
  (also runs on server start). See `platform/core/docs/postgres-schema-adr.md`.
  Filenames must describe the change (`NNNN_snake_case_what_it_does.sql`, e.g.
  `0011_drop_data_migrations.sql`). Always pass `--name`. Do not commit
  drizzle-kit’s default Marvel-style tags (`silly_mariko_yashida`,
  `bizarre_chat`). If generate produced one, rename the SQL file and the
  matching `_journal.json` `tag` before committing. One-off PG data backfills
  belong in an intentional SQL migration or a documented one-shot script.
- **Queries:** keep `platform/core/src/db/pg/map/` for existing document/edge
  call sites, but **new features and hot-path work** should prefer Drizzle /
  SQL-native queries (typed repositories under domain modules or
  `db/pg/queries/`) over deepening the map DSL (`filters.ts`, `relations.ts`,
  `registry.ts`). Expand the map layer only when an existing mapping call site
  truly requires it. See `platform/web/docs/development/data-storage.md`.
- **Capabilities:** gate features by role capabilities (`core-*`) rather than
  hardcoded role checks.
- **Async work** belongs in a BullMQ queue/worker, not inline in request paths.

## Git & PRs

- Only commit when explicitly asked.
- Don't force-push shared branches or amend pushed commits unless asked.
- Before opening a PR, follow the `check-openpeeps-pr-readiness` skill.

### Commit workflow

When finalizing a branch for PR:

1. **Rebase** onto latest `main`:
   ```bash
   rtk git fetch origin main && rtk git rebase origin/main
   ```
2. **Squash** all branch commits into one using the squash script:
   ```bash
   bash scripts/squash-branch.sh --ci -m "feat(scope): description"
   ```
   Requires a clean working tree. Commit or stash changes first.
3. **Sign** the commit with your configured git author (from `git config
   user.name`/`user.email`; do not hardcode an author here):
   ```bash
   rtk git commit --amend \
     -m "feat(scope): description

   Signed-off-by: Your Name <you@example.com>"
   ```
4. **Push** with force-with-lease:
   ```bash
   rtk git fetch origin <branch> && rtk git push --force-with-lease origin <branch>
   ```
   Always fetch before pushing to avoid stale ref errors.

## Deployment (community.consolving.de)

### Target

- Instance: LXC 101 (Debian 13) on host1
- Domain: `https://community.consolving.de` (proxied via host1 Traefik)
- `publicContent: false` — API/anonymous viewing requires auth
- Author: `philipp` = account `philipp@consolving.de`, profile id `019feb77-aa7e-79eb-ae99-8e837732bc8f`

### SSH + DB access

```bash
# SSH to host1
ssh -p 24 root@host1.consolving.net

# Push files to LXC
pct push 101 <local> <remote>

# psql via docker compose
pct exec 101 -- bash -lc \
  'cd /opt/openpeeps && docker compose -f compose.prod.yml --env-file .env.production exec -T postgres psql -U openpeeps -d openpeeps -v ON_ERROR_STOP=1'
```

### Publishing: direct Postgres insert (backdating)

API sets `created_at=now()`. To backdate: INSERT into `posts` + `entries` tables directly.

**Critical safety rules:**

- ALWAYS take a pg_dump backup before inserting (pre_<label>_<YYYYMMDD_HHMMSS>.sql)
- Run in BEGIN/COMMIT (never uncommitted in prod)
- Dry-run: BEGIN → inserts → ROLLBACK, verify → then real apply
- Single-quote escape inside SQL: `'` → `''`

**Post body JSON for articles:**

```json
{
  "type": "article",
  "content": "<markdown content>",
  "language": "en",
  "image": "https://...optional-banner-url..."
}
```

**Entry body JSON:**

```json
{
  "data": { "type": "create", "data": { "type": "article", "content": "...", "language": "en" } },
  "type": "create"
}
```

**UUIDs:** `uuid5(NAMESPACE_URL, "openpeeps-article-" + filename)` for post; `"entry-" + filename` for entry.

### Banner images: upload via API + link to existing posts (verified workflow)

Bearer token lives in the shared Enpass vault, entry **"API Token for
philipp@community.consolving.de"**, field `password` (long-lived JWT, scope
`write` on `posts`). Retrieve via the `enpass-vault` skill (`vault-cache`).

```bash
TOKEN=$(cat token-file-or-var)

# 1. Upload image (multipart) — no login step needed, token is long-lived
curl -s -X POST "https://community.consolving.de/api/openpeeps/core/v1/media" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/banner.jpg;type=image/jpeg" \
  -F "usage=post"
# Returns: { id, url, meta, status, ... }
# url = "https://community.consolving.de/storage/allpeep/<key>/<filename>"

# 2. Link to an EXISTING post (already-published article) via direct DB update —
#    there is no need to touch `data.attachments` on POST /posts for this;
#    articles read their banner from body.image directly:
UPDATE posts SET body = jsonb_set(body, '{image}', '"<uploaded-url>"') WHERE id = '<post-uuid>';
```

Always wrap multi-post updates in a single `BEGIN; ... COMMIT;` transaction,
verify with a `SELECT ... WHERE id IN (...)` afterward, and check
`docker logs openpeeps-app-1 --since <N>m | grep -i error` for regressions.

**Banner file → article mapping**: read `banner_foto:` (or an inline
`![...](images/...)` / `![[images/...]]`) from each article's frontmatter —
don't guess from the `images/` folder listing alone, filenames don't always
match the article title. If `banner_foto` is only a text description (an
unused AI-image-generation prompt, no real path), no banner has been
generated yet for that article — skip it, don't invent one.

### Markdown cleanup before posting (strip Obsidian artifacts)

- YAML frontmatter (`---` block at top)
- `→ [[...]]` nav lines
- `![[...]]` wiki image embeds
- `[[slug|label]]` → `label`
- Trailing `## Related Topics` internal-link footers

### Existing DB backups

- `/opt/openpeeps/.backups/pre_articles_20260901_095608.sql` (before 19-article batch)
- `/opt/openpeeps/.backups/pre_3articles_20260901_080528.sql` (before 3-article batch)
