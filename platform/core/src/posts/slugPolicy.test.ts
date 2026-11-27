import { describe, expect, it } from 'vitest';
import type { Article, Profile, Role } from '@openpeepshq/common/types';
import { applyArticleSlugPolicy } from './slugPolicy';

/**
 * The gate is capability-based (`core-posts-slug-instance`), so a profile
 * needs a role that grants it — owner carries `*`, admin/moderator carry the
 * capability in the role defaults, member carries nothing.
 */
const profile = (
  roles: Array<{ key: string; add?: string[]; remove?: string[] }>,
): Profile & { roles?: Role[] } =>
  ({
    id: 'p1',
    roles: roles.map((role) => ({
      id: `r-${role.key}`,
      key: role.key,
      capabilities: { add: role.add ?? [], remove: role.remove ?? [] },
    })),
  }) as Profile & { roles?: Role[] };

const article = (slug: string | undefined, instanceScoped?: boolean): Article =>
  ({
    type: 'article',
    content: 'body',
    slug,
    ...(instanceScoped === undefined ? {} : { instanceScoped }),
  }) as Article;

describe('applyArticleSlugPolicy', () => {
  it('leaves a non-article body untouched', () => {
    const note = { type: 'note', content: 'hi' } as Article;
    expect(applyArticleSlugPolicy(note, profile([]))).toBe(note);
  });

  it('keeps a valid profile-scoped slug', () => {
    const out = applyArticleSlugPolicy(
      article('some-article', false),
      profile([]),
    );
    expect(out.slug).toBe('some-article');
    expect(out.instanceScoped).toBeUndefined();
  });

  it('drops instanceScoped from a profile without the instance-slug capability', () => {
    const out = applyArticleSlugPolicy(
      article('a-long-enough-slug', true),
      profile([{ key: 'member' }]),
    );
    expect(out.instanceScoped).toBeUndefined();
  });

  it('keeps instanceScoped for owner (via `*`), admin, or moderator', () => {
    const keep = (roles: Array<{ key: string; add?: string[] }>) =>
      applyArticleSlugPolicy(
        article('a-long-enough-slug', true),
        profile(roles),
      ).instanceScoped;
    expect(keep([{ key: 'owner', add: ['*'] }, { key: 'member' }])).toBe(true);
    expect(
      keep([
        { key: 'admin', add: ['core-posts-slug-instance'] },
        { key: 'member' },
      ]),
    ).toBe(true);
    expect(
      keep([
        { key: 'moderator', add: ['core-posts-slug-instance'] },
        { key: 'member' },
      ]),
    ).toBe(true);
  });

  it('drops a handle-shaped slug only when it is effectively instance-scoped', () => {
    // A profile-scoped role that grants the instance-slug capability asking
    // for an instance-scoped `my-slug` would collide with the `/:handle`
    // route → slug dropped, instanceScoped kept.
    const granted = applyArticleSlugPolicy(
      article('my-slug', true),
      profile([{ key: 'member', add: ['core-posts-slug-instance'] }]),
    );
    expect(granted.slug).toBeUndefined();
    expect(granted.instanceScoped).toBe(true);
    // Without the capability the slug is not effectively instance-scoped,
    // so it is kept (it resolves as `/{handle}/my-slug`).
    expect(
      applyArticleSlugPolicy(
        article('my-slug', true),
        profile([{ key: 'member' }]),
      ).slug,
    ).toBe('my-slug');
  });

  it('keeps a non-handle-shaped slug longer than 16 chars', () => {
    expect(
      applyArticleSlugPolicy(article('a-very-long-slug-name-here'), profile([]))
        .slug,
    ).toBe('a-very-long-slug-name-here');
  });
});
