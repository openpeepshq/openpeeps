import { describe, expect, it } from 'vitest';
import { excludeTypesQuerySchema } from './api';

// The comma-joined `excludeTypes` contract bridges the fetch client (which can
// only send string|number query params) and the two server endpoints that
// consume it (the notifications feed `GET` and the mark-all-seen `PUT`); the
// endpoints re-export this exact schema, so pinning the split/filter behavior
// here covers the parsing both of them apply.
describe('excludeTypesQuerySchema', () => {
  it('splits a comma-joined list', () => {
    expect(excludeTypesQuerySchema.parse('repost,poll_vote')).toEqual([
      'repost',
      'poll_vote',
    ]);
  });

  it('drops empty segments from trailing/double commas', () => {
    expect(excludeTypesQuerySchema.parse('repost,,poll_vote,')).toEqual([
      'repost',
      'poll_vote',
    ]);
  });

  it('parses the empty string to an empty list (exclude nothing)', () => {
    expect(excludeTypesQuerySchema.parse('')).toEqual([]);
  });

  it('is optional', () => {
    expect(excludeTypesQuerySchema.parse(undefined)).toBeUndefined();
  });

  it('rejects non-string input', () => {
    expect(() => excludeTypesQuerySchema.parse(42)).toThrow();
  });

  it('is idempotent: re-parsing the result (array) keeps it stable', () => {
    // Riddl validates the query before the handler, and the handlers
    // re-parse the already-parsed value — so the second pass must accept the
    // array the first pass produced. This is what 500'd before the schema
    // learned to accept its own output.
    expect(excludeTypesQuerySchema.parse(['repost', 'poll_vote'])).toEqual([
      'repost',
      'poll_vote',
    ]);
    expect(
      excludeTypesQuerySchema.parse(
        excludeTypesQuerySchema.parse('repost,poll_vote'),
      ),
    ).toEqual(['repost', 'poll_vote']);
    expect(
      excludeTypesQuerySchema.parse(excludeTypesQuerySchema.parse('')),
    ).toEqual([]);
  });
});
