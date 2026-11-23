import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import {
  apiHeaders,
  createNote,
  currentProfile,
  registerUser,
  requestValidationEmail,
  uniqueHandle,
  validateEmailToken,
} from '../../../helpers/api';
import {
  clearMailpit,
  extractFromMailpitMessage,
  waitForMailpitMessage,
} from '../../../helpers/mailpit';

/**
 * Minimal ZIP reader for the account-export integration test. The tests
 * workspace has no zip dependency (and adding one would churn pnpm-lock), so
 * this walks the central-directory records and inflates the entries it needs
 * (STORED + DEFLATE, no data-descriptor / zip64 support — the export zips are
 * small, flat archives written by `archiver`).
 */
const readZipEntries = (buf: Buffer): Map<string, Buffer> => {
  const little32 = (o: number) => buf.readUInt32LE(o);
  const little16 = (o: number) => buf.readUInt16LE(o);
  // Locate the End Of Central Directory (signature 0x06054b50).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 65557; i--) {
    if (little32(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip: EOCD not found');
  const count = little16(eocd + 10);
  let offset = little32(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (little32(offset) !== 0x02014b50)
      throw new Error('zip: bad central directory signature');
    const method = little16(offset + 10);
    const compSize = little32(offset + 20);
    const nameLen = little16(offset + 28);
    const extraLen = little16(offset + 30);
    const commentLen = little16(offset + 32);
    const localOffset = little32(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);
    // Read the local header to find where the file data begins.
    if (little32(localOffset) !== 0x04034b50)
      throw new Error('zip: bad local file signature');
    const localNameLen = little16(localOffset + 26);
    const localExtraLen = little16(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    out.set(name, method === 8 ? inflateRawSync(comp) : Buffer.from(comp));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return out;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll the status endpoint until the export leaves `building`. */
const pollExportStatus = async (
  request: import('@playwright/test').APIRequestContext,
  token: string,
  jobId: string,
  timeoutMs = 120_000,
) => {
  const deadline = Date.now() + timeoutMs;
  let last: Record<string, unknown> | undefined;
  while (Date.now() < deadline) {
    const res = await request.get(
      `/api/openpeeps/core/v1/accounts/current/export/status?jobId=${jobId}`,
      { headers: apiHeaders(token) },
    );
    last = (await res.json()) as Record<string, unknown>;
    if (
      last.state === 'ready' ||
      last.state === 'error' ||
      last.state === 'expired'
    ) {
      return last;
    }
    await sleep(1500);
  }
  throw new Error(`export did not finish in time: ${JSON.stringify(last)}`);
};

/**
 * #237 — account personal-data export: a DB-backed integration test of the
 * gather (real Postgres hydrate, the real `reply_to` ancestor CTE, the
 * self-scope to the account's own posts, and the soft-deleted-post inclusion
 * contract) plus an end-to-end request -> status -> download round trip
 * through the real Redis/BullMQ worker. The fakes in the unit tests verify
 * the logic; this proves the real drivers accept what the fakes assume
 * (review #237 r13, suggestion 2). Media bundling is covered by the unit
 * tests (fake local storage + real archiver) rather than here, because the
 * CI `web` and `worker` containers do not share a media volume.
 */
// A freshly registered user cannot create posts until the email is validated
// (the member role is granted on validation); mirrors `user-actions/test.ts`.
const promoteToMemberViaEmail = async (
  request: Parameters<typeof registerUser>[0],
  token: string,
  email: string,
) => {
  await clearMailpit();
  await requestValidationEmail(request, token);
  const mail = await waitForMailpitMessage(
    (message) =>
      message.To.some((to) => to.Address === email) &&
      /validate your email/i.test(message.Subject),
    { timeoutMs: 45_000 },
  );
  const validationToken = await extractFromMailpitMessage(
    mail.ID,
    /[?&]token=([^&"'>\s]+)/i,
  );
  const result = await validateEmailToken(request, validationToken);
  expect(result.success).toBe(true);
};

test.describe('account data export (integration)', () => {
  // Two email-validations plus the export worker round trip make this
  // slower than the 120s default.
  test('request -> status -> download round trip, self-scoped, soft-deleted included', async ({
    request,
  }) => {
    test.setTimeout(180_000);
    const run = randomUUID().slice(0, 8);

    const exporter = await registerUser(request, {
      handle: uniqueHandle(`exp${run}`),
      email: `exp${run}@test.com`,
      password: 'testtest',
    });
    const other = await registerUser(request, {
      handle: uniqueHandle(`oth${run}`),
      email: `oth${run}@test.com`,
      password: 'testtest',
    });
    await promoteToMemberViaEmail(
      request,
      exporter.token,
      `exp${run}@test.com`,
    );
    await promoteToMemberViaEmail(request, other.token, `oth${run}@test.com`);

    const exporterProfile = await currentProfile(request, exporter.token);
    const otherProfile = await currentProfile(request, other.token);
    expect(exporterProfile.id).not.toBe(otherProfile.id);

    // 2. A created post by the exporter (no attachment: see the test note on
    // why the CI web/worker containers can't share an uploaded media file).
    const createdPost = await createNote(
      request,
      exporter.token,
      'created post',
    );

    // 3. A reply by the exporter to the other user's post -> thread context.
    const otherRoot = await createNote(
      request,
      other.token,
      'thread root by other',
    );
    const replyPost = await createNote(
      request,
      exporter.token,
      'reply to other',
      {
        inReplyToId: otherRoot.id,
      },
    );

    // 4. A post by the exporter, then soft-deleted -> must still be exported.
    const doomedPost = await createNote(
      request,
      exporter.token,
      'will be deleted',
    );
    const delRes = await request.delete(
      `/api/openpeeps/core/v1/posts/${doomedPost.id}`,
      { headers: apiHeaders(exporter.token) },
    );
    expect(
      delRes.ok(),
      `delete post failed: ${await delRes.text()}`,
    ).toBeTruthy();

    // 5. A net reaction: the exporter reacts to the other user's root post.
    const reactRes = await request.post(
      `/api/openpeeps/core/v1/posts/${otherRoot.id}/react`,
      { headers: apiHeaders(exporter.token), data: { reaction: '👍' } },
    );
    expect(
      reactRes.ok(),
      `react failed: ${await reactRes.text()}`,
    ).toBeTruthy();

    // 6. Start the export and poll to ready (real BullMQ worker assembles it).
    const startRes = await request.post(
      '/api/openpeeps/core/v1/accounts/current/export/request',
      { headers: apiHeaders(exporter.token), data: {} },
    );
    expect(
      startRes.ok(),
      `export request failed: ${await startRes.text()}`,
    ).toBeTruthy();
    const { jobId } = (await startRes.json()) as { jobId: string };

    const status = (await pollExportStatus(request, exporter.token, jobId)) as {
      state: string;
      downloadToken?: string;
      expiresAt?: string;
    };
    expect(status.state, `export not ready: ${JSON.stringify(status)}`).toBe(
      'ready',
    );
    expect(status.downloadToken).toBeTruthy();
    expect(status.expiresAt).toBeTruthy();

    // 7. Download the zip with the one-time token.
    const dl = await request.get(
      `/api/openpeeps/core/v1/accounts/current/export/download?token=${status.downloadToken}`,
    );
    expect(dl.ok(), `download failed: ${await dl.text()}`).toBeTruthy();
    const buf = await dl.body();
    expect(buf.subarray(0, 2).toString('hex')).toBe('504b'); // "PK"

    const entries = readZipEntries(buf);
    const names = [...entries.keys()];

    // meta.json — the manifest counts.
    expect(names).toContain('meta.json');
    const meta = JSON.parse(entries.get('meta.json')!.toString('utf8')) as {
      counts: {
        createdPosts: number;
        contextPosts: number;
        reactedPosts: number;
        media: number;
      };
    };
    // created: `createdPost` + `replyPost` + the soft-deleted `doomedPost`
    // (the export is a complete record, not the live view).
    expect(meta.counts.createdPosts).toBe(3);
    expect(meta.counts.contextPosts).toBe(1); // the other user's thread root
    expect(meta.counts.reactedPosts).toBe(1); // the other root (net reaction)
    expect(meta.counts.media).toBe(0);

    // account.json is the exporting account's own data (its email is in).
    expect(names).toContain('account.json');
    const accountJson = entries.get('account.json')!.toString('utf8');
    expect(accountJson).toContain(`exp${run}@test.com`);
    // Self-scoped: the OTHER account's email is never anywhere in the export.
    for (const n of names) {
      expect(entries.get(n)!.toString('utf8')).not.toContain(
        `oth${run}@test.com`,
      );
    }

    // The created posts (incl. the soft-deleted one) and the thread context.
    expect(names).toContain(`posts/created/${createdPost.id}.json`);
    expect(names).toContain(`posts/created/${replyPost.id}.json`);
    expect(names).toContain(`posts/created/${doomedPost.id}.json`);
    expect(names).toContain(`posts/context/${otherRoot.id}.json`);
    // The other user's post is NOT one of the account's created posts.
    expect(names).not.toContain(`posts/created/${otherRoot.id}.json`);
    // The reacted-to post also lands in its own directory (it carries the
    // account's reaction there, even though it is thread context as well).
    expect(names).toContain(`posts/reacted-to/${otherRoot.id}.json`);
  });
});
