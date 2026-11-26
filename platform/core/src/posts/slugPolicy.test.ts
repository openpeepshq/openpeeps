import { describe, expect, it } from 'vitest';
import type { Article, Profile, Role } from '@openpeepshq/common/types';
import { applyArticleSlugPolicy } from './slugPolicy';

const profile = (roles: string[]): Profile & { roles?: Role[] } =>
  ({
    id: 'p1',
    roles: roles.map((key) => ({ id: `r-${key}`, key })),
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

  it('drops instanceScoped from a profile without an instance-scoped role', () => {
    const out = applyArticleSlugPolicy(
      article('a-long-enough-slug', true),
      profile(['member']),
    );
    expect(out.instanceScoped).toBeUndefined();
  });

  it('keeps instanceScoped for an admin or moderator', () => {
    expect(
      applyArticleSlugPolicy(
        article('a-long-enough-slug', true),
        profile(['admin']),
      ).instanceScoped,
    ).toBe(true);
    expect(
      applyArticleSlugPolicy(
        article('a-long-enough-slug', true),
        profile(['moderator']),
      ).instanceScoped,
    ).toBe(true);
  });

  it('drops a handle-shaped slug only when it is effectively instance-scoped', () => {
    // An admin asking for an instance-scoped `my-slug` would collide with the
    // `/:handle` route → slug dropped, instanceScoped kept.
    const admin = applyArticleSlugPolicy(
      article('my-slug', true),
      profile(['admin']),
    );
    expect(admin.slug).toBeUndefined();
    expect(admin.instanceScoped).toBe(true);
    // A profile-scoped `my-slug` resolves as `/{handle}/my-slug`, so it is kept.
    expect(
      applyArticleSlugPolicy(article('my-slug', false), profile([])).slug,
    ).toBe('my-slug');
  });

  it('keeps a non-handle-shaped slug longer than 16 chars', () => {
    expect(
      applyArticleSlugPolicy(article('a-very-long-slug-name-here'), profile([]))
        .slug,
    ).toBe('a-very-long-slug-name-here');
  });
});
