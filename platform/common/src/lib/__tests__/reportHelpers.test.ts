import { describe, expect, it } from 'vitest';
import type { Role } from '../../types';
import {
  canReportAuthor,
  isSelfReport,
  reportedMediaFromAttachment,
  reportedMediaOnPosts,
} from '../reportHelpers';

describe('isSelfReport', () => {
  const me = 'profile-me';
  const other = 'profile-other';

  it('rejects reporting your own profile', () => {
    expect(isSelfReport(me, me, [])).toBe(true);
  });

  it('rejects reporting a post you authored', () => {
    expect(isSelfReport(me, other, [me])).toBe(true);
  });

  it('allows reporting someone else and their posts', () => {
    expect(isSelfReport(me, other, [other])).toBe(false);
  });

  it('allows a profile-only report of someone else', () => {
    expect(isSelfReport(me, other, [])).toBe(false);
  });
});

const reporterRole = {
  capabilities: { add: ['core-reports-create'], remove: [] },
} as Role;

describe('canReportAuthor', () => {
  it('allows a member to report someone else', () => {
    expect(canReportAuthor('me', [reporterRole], 'them')).toBe(true);
  });

  it('rejects reporting yourself or reporting without the capability', () => {
    expect(canReportAuthor('me', [reporterRole], 'me')).toBe(false);
    expect(canReportAuthor('me', [], 'them')).toBe(false);
    expect(canReportAuthor(undefined, [reporterRole], 'them')).toBe(false);
  });
});

describe('reported media', () => {
  const attachment = {
    url: 'https://cdn.example/file.mp3',
    previewUrl: null,
    filename: 'voice.mp3',
    type: 'audio',
  };

  it('drops attachments that have no url', () => {
    expect(reportedMediaFromAttachment({ filename: 'x' })).toBeUndefined();
  });

  it('keeps the attachment stored on the post', () => {
    expect(
      reportedMediaOnPosts(
        [{ url: attachment.url, filename: 'spoofed' }],
        [{ data: { attachments: [attachment] } }],
      ),
    ).toEqual([
      {
        url: attachment.url,
        previewUrl: null,
        filename: 'voice.mp3',
        type: 'audio',
      },
    ]);
  });

  it('rejects a url that is not on the reported posts', () => {
    expect(
      reportedMediaOnPosts(
        [{ url: 'https://cdn.example/other.png' }],
        [{ data: { attachments: [attachment] } }],
      ),
    ).toBeUndefined();
  });
});
