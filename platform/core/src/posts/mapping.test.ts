import { describe, expect, it } from 'vitest';
import { postsMapping, EMBEDDED_LATEST_REPLIES_LIMIT } from './mapping';

describe('latestReplies mapping', () => {
  it('loads only direct inbound replies, newest first, capped', () => {
    const relation = postsMapping
      .data()
      .postFilterRelations?.find((item) => item.alias === 'latestReplies');

    expect(relation).toMatchObject({
      alias: 'latestReplies',
      edgeCollection: 'replyTo',
      direction: 'INBOUND',
      maxDepth: 1,
      cardinality: 'many',
    });
    expect(relation?.mapping?.limit).toBe(EMBEDDED_LATEST_REPLIES_LIMIT);
    expect(relation?.mapping?.sort).toEqual([['createdAt', 'DESC']]);
  });
});
