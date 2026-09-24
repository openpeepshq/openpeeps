import { describe, expect, it } from 'vitest';
import { rsvpCancelRecipients } from './recipients';

describe('rsvpCancelRecipients', () => {
  it('notifies the host once and skips the member who canceled', () => {
    const recipients = rsvpCancelRecipients(
      [{ id: 'host' }, { id: 'host' }, { id: 'moderator' }, { id: 'member' }],
      'member',
    );
    expect(recipients.map((profile) => profile.id)).toEqual([
      'host',
      'moderator',
    ]);
  });
});
