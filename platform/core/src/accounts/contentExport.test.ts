import { describe, expect, it } from 'vitest';
import {
  assembleAccountContent,
  type ContentExportRows,
} from './contentExport';

const me = '11111111-1111-4111-8111-111111111111';
const them = '22222222-2222-4222-8222-222222222222';
const noteId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const savedId = '55555555-5555-4555-8555-555555555555';
const recordingId = '66666666-6666-4666-8666-666666666666';

const at = '2026-11-05T12:00:00.000Z';

const rows = (patch: Partial<ContentExportRows> = {}): ContentExportRows => ({
  profiles: [],
  settings: [],
  roles: [],
  memberships: [],
  followedHashtags: [],
  posts: [],
  followers: [],
  following: [],
  followRequests: [],
  blocks: [],
  bookmarks: [],
  entries: [],
  reposts: [],
  mentions: [],
  directMessages: [],
  seenPosts: [],
  notifications: [],
  reports: [],
  accessTokens: [],
  pushSubscriptions: [],
  invites: [],
  jamRecordings: [],
  jamActivity: [],
  ...patch,
});

describe('assembleAccountContent', () => {
  it('splits authored notes from events and keeps media urls', () => {
    const content = assembleAccountContent(
      rows({
        posts: [
          {
            id: noteId,
            profileId: me,
            type: 'note',
            visibility: 'public',
            createdAt: at,
            updatedAt: at,
            body: {
              content: 'hello',
              attachments: [
                {
                  type: 'image',
                  url: 'https://cdn.example/a.png',
                  filename: 'a.png',
                },
              ],
            },
          },
          {
            id: eventId,
            profileId: me,
            type: 'event',
            visibility: 'public',
            createdAt: at,
            updatedAt: at,
            body: {
              name: 'Standup',
              start: '2026-11-06T15:00:00.000Z',
              wholeDay: false,
              physicalLocation: { text: 'Hall' },
              jam: { moderators: [them] },
            },
          },
        ],
      }),
    );

    expect(content.posts).toEqual([
      {
        id: noteId,
        profileId: me,
        type: 'note',
        visibility: 'public',
        createdAt: at,
        updatedAt: at,
        content: 'hello',
        data: {
          content: 'hello',
          attachments: [
            {
              type: 'image',
              url: 'https://cdn.example/a.png',
              filename: 'a.png',
            },
          ],
        },
        attachments: [
          {
            type: 'image',
            url: 'https://cdn.example/a.png',
            filename: 'a.png',
          },
        ],
      },
    ]);
    expect(content.events).toEqual([
      {
        id: eventId,
        profileId: me,
        type: 'event',
        visibility: 'public',
        createdAt: at,
        updatedAt: at,
        name: 'Standup',
        start: '2026-11-06T15:00:00.000Z',
        wholeDay: false,
        location: 'Hall',
        jam: true,
        data: {
          name: 'Standup',
          start: '2026-11-06T15:00:00.000Z',
          wholeDay: false,
          physicalLocation: { text: 'Hall' },
          jam: { moderators: [them] },
        },
        attachments: [],
      },
    ]);
  });

  it('exports follow relationships without the other member email', () => {
    const content = assembleAccountContent(
      rows({
        followers: [
          {
            id: them,
            handle: 'ada',
            since: '2026-11-02T00:00:00.000Z',
            body: {
              displayName: 'Ada',
              avatar: 'https://cdn.example/ada.png',
              guestData: { email: 'ada@example.com' },
            },
          },
          {
            id: them,
            handle: 'ada',
            since: '2026-11-01T00:00:00.000Z',
            body: { displayName: 'Ada' },
          },
        ],
        following: [
          {
            id: them,
            handle: 'ada',
            since: at,
            body: { displayName: 'Ada' },
          },
        ],
      }),
    );

    expect(content.followers).toEqual([
      {
        id: them,
        handle: 'ada',
        displayName: 'Ada',
        since: '2026-11-01T00:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(content)).not.toContain('ada@example.com');
    expect(content.following[0]?.handle).toBe('ada');
  });

  it('keeps the latest favorite and rsvp, and drops a removed like', () => {
    const content = assembleAccountContent(
      rows({
        entries: [
          {
            postId: savedId,
            createdAt: '2026-11-01T00:00:00.000Z',
            body: { type: 'reaction', data: { reaction: '👍' } },
            post: {
              id: savedId,
              profileId: them,
              type: 'note',
              visibility: 'public',
              createdAt: at,
              updatedAt: at,
              body: { content: 'saved thought' },
              author: {
                id: them,
                handle: 'ada',
                body: {
                  displayName: 'Ada',
                  guestData: { email: 'ada@example.com' },
                },
              },
            },
          },
          {
            postId: noteId,
            createdAt: '2026-11-02T00:00:00.000Z',
            body: { type: 'reaction', data: { reaction: '👍' } },
            post: null,
          },
          {
            postId: noteId,
            createdAt: '2026-11-03T00:00:00.000Z',
            body: { type: 'unreaction', data: { reaction: '👍' } },
            post: null,
          },
          {
            postId: eventId,
            createdAt: '2026-11-01T00:00:00.000Z',
            body: { type: 'rsvp', data: { response: 'yes' } },
            post: null,
          },
          {
            postId: eventId,
            createdAt: '2026-11-03T00:00:00.000Z',
            body: { type: 'rsvp', data: { response: 'no' } },
            post: null,
          },
        ],
      }),
    );

    expect(content.favorites).toEqual([
      {
        postId: savedId,
        reaction: '👍',
        createdAt: '2026-11-01T00:00:00.000Z',
        post: {
          id: savedId,
          profileId: them,
          type: 'note',
          visibility: 'public',
          createdAt: at,
          updatedAt: at,
          content: 'saved thought',
          data: { content: 'saved thought' },
          author: { id: them, handle: 'ada', displayName: 'Ada' },
          attachments: [],
        },
      },
    ]);
    expect(content.rsvps).toEqual([
      {
        eventPostId: eventId,
        response: 'no',
        createdAt: '2026-11-03T00:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(content)).not.toContain('ada@example.com');
  });

  it('keeps a bookmark id when the post is gone', () => {
    const content = assembleAccountContent(
      rows({
        bookmarks: [
          {
            postId: savedId,
            createdAt: at,
            post: null,
          },
        ],
      }),
    );

    expect(content.bookmarks).toEqual([{ postId: savedId, createdAt: at }]);
  });

  it('exports the recording file and leaves infrastructure ids out', () => {
    const content = assembleAccountContent(
      rows({
        jamRecordings: [
          {
            id: recordingId,
            profileId: me,
            eventPostId: eventId,
            createdAt: at,
            body: {
              status: 'completed',
              kind: 'file',
              egressId: 'EG_secret',
              destinationHost: 'livekit.internal',
              attachment: {
                type: 'video',
                url: 'https://cdn.example/jam.mp4',
                filename: 'jam.mp4',
              },
            },
          },
        ],
      }),
    );

    expect(content.jamRecordings).toEqual([
      {
        id: recordingId,
        profileId: me,
        eventPostId: eventId,
        status: 'completed',
        kind: 'file',
        createdAt: at,
        attachment: {
          type: 'video',
          url: 'https://cdn.example/jam.mp4',
          filename: 'jam.mp4',
        },
        data: {
          status: 'completed',
          kind: 'file',
          attachment: {
            type: 'video',
            url: 'https://cdn.example/jam.mp4',
            filename: 'jam.mp4',
          },
        },
      },
    ]);
    expect(JSON.stringify(content)).not.toContain('EG_secret');
    expect(JSON.stringify(content)).not.toContain('livekit.internal');
  });

  it('keeps the stored profile and drops access-token secrets', () => {
    const content = assembleAccountContent(
      rows({
        profiles: [
          {
            id: me,
            handle: 'ada',
            type: 'local',
            createdAt: at,
            updatedAt: at,
            body: {
              displayName: 'Ada',
              bio: 'Hello',
              hideSocialGraph: true,
              guestData: { email: 'ada@example.com' },
            },
            privateKeyPem: 'PRIVATE KEY',
          },
        ],
        settings: [
          { profileId: me, body: { language: 'en', timeZone: 'UTC' } },
        ],
        roles: [
          {
            profileId: me,
            id: them,
            key: 'member',
            body: { displayName: 'Member' },
          },
        ],
        memberships: [
          {
            profileId: me,
            groupId: eventId,
            handle: 'club',
            body: { displayName: 'Club' },
            edgeBody: { roles: ['member'] },
            since: at,
          },
        ],
        followedHashtags: [{ profileId: me, name: 'music' }],
        blocks: [
          {
            id: savedId,
            handle: 'blocked',
            since: at,
            body: { displayName: 'Blocked' },
          },
        ],
        accessTokens: [
          {
            id: noteId,
            createdAt: at,
            updatedAt: at,
            body: { name: 'Phone', signedToken: 'secret-token' },
          },
        ],
        notifications: [
          {
            id: recordingId,
            profileId: me,
            createdAt: at,
            updatedAt: at,
            body: { type: 'follow', read: false },
          },
        ],
      }),
    );

    expect(content.profiles).toEqual([
      {
        id: me,
        handle: 'ada',
        type: 'local',
        createdAt: at,
        updatedAt: at,
        data: {
          displayName: 'Ada',
          bio: 'Hello',
          hideSocialGraph: true,
          guestData: { email: 'ada@example.com' },
        },
        actor: { privateKeyPem: 'PRIVATE KEY' },
        settings: { language: 'en', timeZone: 'UTC' },
        roles: [{ id: them, key: 'member', displayName: 'Member' }],
        memberships: [
          {
            groupId: eventId,
            handle: 'club',
            displayName: 'Club',
            roles: ['member'],
            since: at,
          },
        ],
        followedHashtags: ['music'],
      },
    ]);
    expect(content.blocks[0]?.handle).toBe('blocked');
    expect(content.accessTokens).toEqual([
      {
        id: noteId,
        name: 'Phone',
        createdAt: at,
        updatedAt: at,
      },
    ]);
    expect(content.notifications[0]?.data).toEqual({
      type: 'follow',
      read: false,
    });
    expect(JSON.stringify(content)).not.toContain('secret-token');
  });
});
