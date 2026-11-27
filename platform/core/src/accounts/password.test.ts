import { describe, expect, it } from 'vitest';
import { compare, hash } from 'bcrypt';

// Uses the real bcrypt module (no vi.mock): the 5.x -> 6.x swap must not
// change hashing or verification, and existing stored hashes must stay
// verifiable. No DB or service is touched, so this runs in the bare
// test-unit container.

// Produced by bcrypt 5 (what existing DB rows contain): the signup call
// site hash(password, 1024) clamps log_rounds to 4, and password reset
// hashes at cost 12.
const LEGACY_HASH_COST04 =
  '$2b$04$8eEPgQwEX65c5w6PoI6eaua4pUy9AfM.JiCSvM8sSf5MgP7uVZria';
const LEGACY_HASH_COST12 =
  '$2b$12$c2S3CkW8xEbl6i134p8ifutbzPEDdveBmKpnd97xK8gvYowACgGl2';

describe('bcrypt password hashing', () => {
  it('hashes with cost 12 and compares the result', async () => {
    const resolved = await hash('correct horse battery staple', 12);
    expect(resolved.startsWith('$2b$12$')).toBe(true);
    await expect(
      compare('correct horse battery staple', resolved),
    ).resolves.toBe(true);
    await expect(compare('wrong password', resolved)).resolves.toBe(false);
  });

  it('clamps the signup log_rounds=1024 call to $2b$04$', async () => {
    const resolved = await hash('correct horse battery staple', 1024);
    expect(resolved.startsWith('$2b$04$')).toBe(true);
    await expect(
      compare('correct horse battery staple', resolved),
    ).resolves.toBe(true);
  });

  it('verifies hashes produced by bcrypt 5', async () => {
    await expect(
      compare('s3cret-Passw0rd!xkcd', LEGACY_HASH_COST04),
    ).resolves.toBe(true);
    await expect(
      compare('correct horse battery staple', LEGACY_HASH_COST12),
    ).resolves.toBe(true);
    await expect(
      compare('s3cret-Passw0rd!xkcd', LEGACY_HASH_COST12),
    ).resolves.toBe(false);
  });
});
