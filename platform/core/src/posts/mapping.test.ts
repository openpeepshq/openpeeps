import { describe, expect, it } from 'vitest';
import {
  EMBEDDED_LATEST_REPLIES_LIMIT,
  postsMapping,
  threadPreviewMappingForProfile,
} from './mapping';

describe('thread preview mapping', () => {
  it('does not embed latestReplies on the main post graph', () => {
    const relation = postsMapping
      .data()
      .postFilterRelations?.find((item) => item.alias === 'latestReplies');
    expect(relation).toBeUndefined();
  });

  it('loads lean descendants with inReplyToId', () => {
    const data = threadPreviewMappingForProfile().data();
    expect(EMBEDDED_LATEST_REPLIES_LIMIT).toBe(3);
    expect(
      data.postFilterDerivedProperties?.some(
        (item) => item.alias === 'inReplyToId',
      ),
    ).toBe(true);
    expect(data.postFilterRelations?.map((item) => item.alias)).toEqual([
      'entries',
    ]);
  });
});
