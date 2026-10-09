import { describe, expect, it } from 'vitest';
import { extractHashtags } from './index';

describe('extractHashtags', () => {
  it('includes resource tags as hashtags', () => {
    expect(
      extractHashtags({
        type: 'resource',
        title: 'Guide',
        resourceKind: 'link',
        url: 'https://example.com',
        content: 'See #program',
        tags: ['FAQ', '#program'],
      }),
    ).toEqual(['program', 'faq']);
  });
});
