import { describe, expect, it } from 'vitest';
import type { FollowerRecipient } from './ingest';
import { withoutBlockedRecipients } from './ingest';

const recipient = (uri: string): FollowerRecipient => ({
  uri,
  inboxUrl: `${uri}/inbox`,
  sharedInboxUrl: null,
});

describe('withoutBlockedRecipients', () => {
  it('keeps every recipient when the blocklist is empty', () => {
    const recipients = [
      recipient('https://mastodon.social/@a'),
      recipient('https://a.example.com/@b'),
    ];
    expect(withoutBlockedRecipients(recipients, [])).toEqual(recipients);
  });

  it('drops recipients on a blocked host', () => {
    const recipients = [
      recipient('https://mastodon.social/@a'),
      recipient('https://a.example.com/@b'),
    ];
    const filtered = withoutBlockedRecipients(recipients, ['mastodon.social']);
    expect(filtered).toEqual([recipient('https://a.example.com/@b')]);
  });

  it('drops recipients matching a wildcard block pattern', () => {
    const recipients = [
      recipient('https://a.example.com/@x'),
      recipient('https://good.social/@y'),
    ];
    const filtered = withoutBlockedRecipients(recipients, ['*.example.com']);
    expect(filtered).toEqual([recipient('https://good.social/@y')]);
  });

  it('keeps recipients whose host cannot be parsed', () => {
    const recipients = [recipient('not-a-url')];
    expect(withoutBlockedRecipients(recipients, ['*.example.com'])).toEqual(
      recipients,
    );
  });
});
