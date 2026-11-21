import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

// #2251: @fedify/fedify pins @opentelemetry/sdk-metrics at exactly 2.7.1,
// which resolves the vulnerable @opentelemetry/core@2.7.1 (GHSA-8988-4f7v-96qf,
// patched >=2.8.0). The workspace override is the remediation; this pins it
// so a future lockfile regen cannot silently re-introduce the vulnerable line.
const repoRoot = resolve(import.meta.dirname, '..', '..', '..', '..', '..');
const workspace = parse(
  readFileSync(resolve(repoRoot, 'pnpm-workspace.yaml'), 'utf8'),
) as { overrides?: Record<string, unknown> };
const lockfile = readFileSync(resolve(repoRoot, 'pnpm-lock.yaml'), 'utf8');

describe('fedify sdk-metrics override (#2251)', () => {
  it('pins @fedify/fedify>@opentelemetry/sdk-metrics to a 2.12.x release', () => {
    const pinned =
      workspace.overrides?.['@fedify/fedify>@opentelemetry/sdk-metrics'];
    expect(pinned).toBeTypeOf('string');
    expect(pinned as string).toMatch(/^2\.12\./);
  });

  it('resolves no vulnerable sdk-metrics@2.7.1 or core@2.7.1', () => {
    expect(lockfile).not.toContain('@opentelemetry/sdk-metrics@2.7.1');
    expect(lockfile).not.toContain('@opentelemetry/core@2.7.1');
  });
});
