import { canSendDmMessage } from '../../../react/src/hooks/conversations/dmMessage';
import {
  hasVisibleText,
  POST_MAX_VISIBLE_LENGTH,
  visibleTextLength,
} from '@openpeepshq/common';

const attachments: never[] = [];

describe('DM visible-length send gate', () => {
  it('shares the note budget with the server refine', () => {
    expect(POST_MAX_VISIBLE_LENGTH).toBe(500);
  });

  it('blocks a message whose visible text is over the budget', () => {
    const text = 'x'.repeat(POST_MAX_VISIBLE_LENGTH + 1);
    expect(visibleTextLength(text)).toBeGreaterThan(POST_MAX_VISIBLE_LENGTH);
    expect(
      canSendDmMessage({
        sending: false,
        uploadsPending: false,
        text,
        attachments,
      })
    ).toBe(false);
  });

  it('allows a markdown link whose URL alone is longer than the budget', () => {
    const text =
      '[a long but visibly short link](https://example.com/' +
      'y'.repeat(600) +
      ')';
    expect(text.length).toBeGreaterThan(POST_MAX_VISIBLE_LENGTH);
    expect(visibleTextLength(text)).toBeLessThanOrEqual(
      POST_MAX_VISIBLE_LENGTH
    );
    expect(
      canSendDmMessage({
        sending: false,
        uploadsPending: false,
        text,
        attachments,
      })
    ).toBe(true);
  });

  it('blocks whitespace-only text without attachments', () => {
    expect(hasVisibleText('   \n  ')).toBe(false);
    expect(
      canSendDmMessage({
        sending: false,
        uploadsPending: false,
        text: '   \n  ',
        attachments,
      })
    ).toBe(false);
  });
});
