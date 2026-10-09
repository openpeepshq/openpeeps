import { describe, expect, it } from 'vitest';
import {
  attachmentMediaKind,
  categoryTreeFromPaths,
  normalizeResourceTags,
  pathStartsWith,
  resourceHasRequiredMedia,
} from '../resources';

describe('resources helpers', () => {
  it('classifies attachments by type and mimetype', () => {
    expect(attachmentMediaKind({ type: 'image', meta: {} })).toBe('image');
    expect(
      attachmentMediaKind({
        type: 'unknown',
        meta: { mimetype: 'video/mp4' },
      }),
    ).toBe('video');
    expect(
      attachmentMediaKind({
        type: 'unknown',
        meta: { mimetype: 'application/pdf' },
      }),
    ).toBe('file');
  });

  it('requires a URL for link resources and matching media otherwise', () => {
    expect(
      resourceHasRequiredMedia({
        resourceKind: 'link',
        url: 'https://example.com',
      }),
    ).toBe(true);
    expect(resourceHasRequiredMedia({ resourceKind: 'link' })).toBe(false);
    expect(
      resourceHasRequiredMedia({
        resourceKind: 'gallery',
        attachments: [{ type: 'image', meta: {} } as never],
      }),
    ).toBe(true);
    expect(
      resourceHasRequiredMedia({
        resourceKind: 'file',
        attachments: [{ type: 'image', meta: {} } as never],
      }),
    ).toBe(false);
  });

  it('builds a category tree and prefix-matches paths', () => {
    const tree = categoryTreeFromPaths([
      ['Guides', '2026'],
      ['Guides', 'Onboarding'],
      ['Templates'],
    ]);
    expect(tree).toEqual([
      {
        name: 'Guides',
        path: ['Guides'],
        children: [
          { name: '2026', path: ['Guides', '2026'], children: [] },
          {
            name: 'Onboarding',
            path: ['Guides', 'Onboarding'],
            children: [],
          },
        ],
      },
      { name: 'Templates', path: ['Templates'], children: [] },
    ]);
    expect(pathStartsWith(['Guides', '2026'], ['Guides'])).toBe(true);
    expect(pathStartsWith(['Templates'], ['Guides'])).toBe(false);
  });

  it('normalizes tags as hashtags without duplicates', () => {
    expect(normalizeResourceTags(['#Hello', 'hello', ' World '])).toEqual([
      'hello',
      'world',
    ]);
  });
});
