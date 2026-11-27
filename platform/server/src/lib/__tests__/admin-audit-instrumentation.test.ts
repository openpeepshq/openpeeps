import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Route-scan test: every admin write route must record an audit entry.
 *
 * The audit log is written per route (see the issue plan: option A —
 * fire-and-forget `auditAction` call after the mutation succeeds). This scan
 * keeps that guarantee from silently rotating as new admin endpoints are
 * added: a mutating admin route file must either call `auditAction(` or be
 * explicitly allowlisted below with a reason.
 */

const ADMIN_ROOT = join(
  fileURLToPath(import.meta.url),
  '../../../api/openpeeps/core/v1/admin',
);

/** HTTP methods that mutate state (Riddl route files are named `<METHOD>.ts`). */
const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    const method = entry.split('.')[0];
    return entry.endsWith('.ts') && WRITE_METHODS.has(method) ? [full] : [];
  });

/**
 * Mutating admin routes that are intentionally NOT audited, per the plan's
 * instrumented-route list. Add a route here only with a documented reason,
 * and prefer instrumenting the route instead — high-impact admin actions
 * (backups, plugin installs, raw SQL) belong in the audit trail.
 */
const NOT_AUDITED: Record<string, string> = {
  'analytics/backfill/POST.ts':
    'rebuilds compiled analytics, no user data touched',
  'analytics/report-settings/PUT.ts':
    'report cosmetics only, no user data touched',
  'backups/POST.ts': 'operational action, no user data mutation',
  'backups/restore/POST.ts': 'operational action, no user data mutation',
  'configuration/email/test/POST.ts':
    'sends a test email, no persistent mutation',
  'diagnostics/email/test/POST.ts':
    'sends a test email, no persistent mutation',
  'media/[storageId]/DELETE.ts': 'media files only, no user data mutation',
  'plugins/[namespace]/[name]/DELETE.ts':
    'plugin lifecycle, no user data mutation',
  'plugins/[namespace]/[name]/PATCH.ts':
    'plugin lifecycle, no user data mutation',
  'plugins/install/POST.ts': 'plugin lifecycle, no user data mutation',
  'plugins/reload/POST.ts': 'plugin lifecycle, no user data mutation',
  'db/sql/POST.ts':
    'raw SQL is covered by `db.explorer.update` row audits + server logs',
  'server/restart/POST.ts': 'process action, no user data mutation',
};

/**
 * The exact mutating admin routes the scan must see, relative to `ADMIN_ROOT`.
 * An added, renamed, or dropped route fails this until the list is updated —
 * which forces a deliberate decision on that route's audit action (instrument
 * it, or allowlist it with a reason) instead of a silent coverage gap.
 */
const EXPECTED_ADMIN_WRITE_ROUTES = [
  'accounts/[accountId]/DELETE.ts',
  'accounts/[accountId]/PATCH.ts',
  'analytics/backfill/POST.ts',
  'analytics/report-settings/PUT.ts',
  'backups/POST.ts',
  'backups/restore/POST.ts',
  'config/[namespace]/[name]/PATCH.ts',
  'configuration/email/test/POST.ts',
  'db/sql/POST.ts',
  'db/tables/[table]/rows/PUT.ts',
  'diagnostics/email/test/POST.ts',
  'groups/[groupId]/DELETE.ts',
  'i18n/overrides/PUT.ts',
  'media/[storageId]/DELETE.ts',
  'pinned-post/PATCH.ts',
  'plugins/[namespace]/[name]/DELETE.ts',
  'plugins/[namespace]/[name]/PATCH.ts',
  'plugins/install/POST.ts',
  'plugins/reload/POST.ts',
  'posts/[postId]/announce/POST.ts',
  'profiles/[profileId]/DELETE.ts',
  'profiles/[profileId]/roles/PUT.ts',
  'reports/[reportId]/reopen/PUT.ts',
  'reports/[reportId]/resolve/PUT.ts',
  'roles/POST.ts',
  'roles/[roleId]/PUT.ts',
  'server/restart/POST.ts',
  'service-access-tokens/POST.ts',
  'service-access-tokens/[accessTokenId]/DELETE.ts',
].sort();

describe('admin write routes are instrumented with audit entries', () => {
  const routeFiles = walk(ADMIN_ROOT);

  it('finds exactly the expected admin write routes', () => {
    const seen = routeFiles
      .map((file) => file.slice(ADMIN_ROOT.length + 1))
      .sort();
    expect(seen).toEqual(EXPECTED_ADMIN_WRITE_ROUTES);
  });

  it('every mutating admin route calls auditAction or is allowlisted', () => {
    const problems: string[] = [];
    for (const file of routeFiles) {
      const rel = file.slice(ADMIN_ROOT.length + 1);
      const source = readFileSync(file, 'utf8');
      const audited = source.includes('auditAction(');
      if (!audited && !(rel in NOT_AUDITED)) {
        problems.push(`${rel}: missing auditAction() and not allowlisted`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('the allowlist has no stale entries', () => {
    const stale = Object.keys(NOT_AUDITED).filter(
      (rel) =>
        !routeFiles.some((file) => file.slice(ADMIN_ROOT.length + 1) === rel),
    );
    expect(stale).toEqual([]);
  });
});
