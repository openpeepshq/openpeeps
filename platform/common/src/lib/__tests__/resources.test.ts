import { describe, expect, it } from 'vitest';
import {
  attachmentMediaKind,
  categoryTreeFromPaths,
  isValidResourceUrl,
  normalizeResourceTags,
  pathStartsWith,
  resourceFormIssues,
  resourceHasRequiredMedia,
  resourceVisibilityForCapabilities,
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

  it('requires a real URL for link resources and matching media otherwise', () => {
    expect(isValidResourceUrl('  https://example.com/path ')).toBe(true);
    expect(isValidResourceUrl('not a url')).toBe(false);
    expect(isValidResourceUrl('example.com')).toBe(false);
    expect(
      resourceHasRequiredMedia({
        resourceKind: 'link',
        url: 'https://example.com',
      }),
    ).toBe(true);
    expect(
      resourceHasRequiredMedia({
        resourceKind: 'link',
        url: 'not a url',
      }),
    ).toBe(false);
    expect(resourceHasRequiredMedia({ resourceKind: 'link' })).toBe(false);
    expect(
      resourceFormIssues({
        title: '',
        resourceKind: 'link',
        url: 'not a url',
        visibility: 'public',
      }),
    ).toEqual(['title', 'url']);
    expect(
      resourceFormIssues({
        title: 'Guide',
        resourceKind: 'link',
        url: 'https://example.com',
        visibility: 'direct',
        audience: [],
      }),
    ).toEqual(['audience']);
    expect(
      resourceFormIssues({
        title: 'a'.repeat(200),
        resourceKind: 'link',
        url: 'https://example.com',
        visibility: 'public',
      }),
    ).toEqual([]);
    expect(
      resourceFormIssues({
        title: 'a'.repeat(201),
        resourceKind: 'link',
        url: 'https://example.com',
        visibility: 'public',
      }),
    ).toEqual(['titleLength']);
    expect(
      resourceFormIssues({
        title: 'Guide',
        resourceKind: 'file',
        visibility: 'public',
      }),
    ).toEqual(['media']);
    expect(
      resourceFormIssues({
        title: 'Guide',
        resourceKind: 'link',
        url: 'https://example.com',
        visibility: 'group',
      }),
    ).toEqual(['group']);
    expect(
      resourceFormIssues({
        title: 'Guide',
        resourceKind: 'link',
        url: 'https://example.com',
        visibility: 'group',
        groupId: 'group-1',
      }),
    ).toEqual([]);
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

  it('starts a group-only draft on a group the author can post in', () => {
    expect(
      resourceVisibilityForCapabilities({
        visibility: 'local',
        allowed: ['group'],
        postableGroupIds: ['group-1'],
      }),
    ).toEqual({ visibility: 'group', groupId: 'group-1' });
    expect(
      resourceVisibilityForCapabilities({
        visibility: 'local',
        allowed: ['group'],
        postableGroupIds: ['group-1', 'group-2'],
      }),
    ).toEqual({ visibility: 'group', groupId: undefined });
    expect(
      resourceVisibilityForCapabilities({
        visibility: 'local',
        allowed: ['local', 'group'],
        postableGroupIds: ['group-1'],
      }),
    ).toEqual({ visibility: 'local' });
    expect(
      resourceVisibilityForCapabilities({
        visibility: 'group',
        groupId: 'group-2',
        allowed: ['group'],
        postableGroupIds: null,
      }),
    ).toEqual({ visibility: 'group', groupId: 'group-2' });
  });

  it('normalizes tags as hashtags without duplicates', () => {
    expect(normalizeResourceTags(['#Hello', 'hello', ' World '])).toEqual([
      'hello',
      'world',
    ]);
  });
});
