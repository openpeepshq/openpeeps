import { describe, expect, it } from 'vitest';
import { eventOccurrenceExceptionSchema, eventSchema } from '../models';

const event = {
  type: 'event',
  content: '',
  start: '2026-11-06T09:00:00.000Z',
  end: '2026-11-06T10:00:00.000Z',
  wholeDay: false,
} as const;

describe('eventSchema end-before-start refine', () => {
  it('accepts an end after the start', () => {
    expect(eventSchema.safeParse(event).success).toBe(true);
  });

  it('accepts an event without an end', () => {
    const { end: _end, ...noEnd } = event;
    expect(eventSchema.safeParse(noEnd).success).toBe(true);
  });

  it('rejects an end before the start', () => {
    const result = eventSchema.safeParse({
      ...event,
      end: '2026-11-06T08:00:00.000Z',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['end'] })]),
      );
    }
  });

  it('rejects an end equal to the start', () => {
    expect(eventSchema.safeParse({ ...event, end: event.start }).success).toBe(
      false,
    );
  });
});

describe('eventOccurrenceExceptionSchema end-before-start refine', () => {
  it('accepts an exception end after its start', () => {
    expect(
      eventOccurrenceExceptionSchema.safeParse({
        recurrenceId: '2026-11-06T09:00:00.000Z',
        start: '2026-11-06T09:00:00.000Z',
        end: '2026-11-06T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects an exception end before its start', () => {
    const result = eventOccurrenceExceptionSchema.safeParse({
      recurrenceId: '2026-11-06T09:00:00.000Z',
      start: '2026-11-06T10:00:00.000Z',
      end: '2026-11-06T09:00:00.000Z',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['end'] })]),
      );
    }
  });
});
