import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureAccount } from '#lib/auth';
import { apiEndpoint } from '../../api/openpeeps/core/v1/accounts/current/export/status/GET';

const { getExportByJob } = vi.hoisted(() => ({ getExportByJob: vi.fn() }));

vi.mock('@openpeepshq/core/accounts', () => ({ getExportByJob }));
vi.mock('#lib/auth', () => ({
  ensureAccount: vi.fn(),
}));

const JOB = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0000';
const MY_ACCOUNT = { id: 'my-account' };
const OTHER_ACCOUNT = { id: 'other-account' };

const call = (event: unknown) =>
  apiEndpoint.handle({ body: {}, query: { jobId: JOB }, param: {}, event });

const eventFor = (accountId: string) => ({
  context: { currentAccount: { id: accountId } },
});

beforeEach(() => {
  getExportByJob.mockReset();
  vi.mocked(ensureAccount).mockImplementation(
    (event) => event.context.currentAccount!,
  );
});

describe('account export status endpoint', () => {
  it('returns not-found for an unknown job', async () => {
    getExportByJob.mockResolvedValue(null);
    const res = (await call(eventFor(MY_ACCOUNT.id))) as {
      state: string;
    };
    expect(res.state).toBe('not-found');
    // A not-found response must not leak a download token.
    expect((res as { downloadToken?: string }).downloadToken).toBeUndefined();
  });

  it('forbids another account from inspecting its job', async () => {
    getExportByJob.mockResolvedValue({
      accountId: OTHER_ACCOUNT.id,
      state: 'building',
    });
    await expect(call(eventFor(MY_ACCOUNT.id))).rejects.toMatchObject({
      status: 403,
    });
  });

  it('exposes the single-use token and expiry once ready', async () => {
    getExportByJob.mockResolvedValue({
      accountId: MY_ACCOUNT.id,
      state: 'ready',
      token: 'tok-123',
      expiresAt: '2026-01-08T00:00:00.000Z',
    });
    const res = (await call(eventFor(MY_ACCOUNT.id))) as {
      state: string;
      downloadToken?: string;
      expiresAt?: string;
    };
    expect(res.state).toBe('ready');
    expect(res.downloadToken).toBe('tok-123');
    expect(res.expiresAt).toBe('2026-01-08T00:00:00.000Z');
  });

  it('does not expose a token while still building', async () => {
    getExportByJob.mockResolvedValue({
      accountId: MY_ACCOUNT.id,
      state: 'building',
    });
    const res = (await call(eventFor(MY_ACCOUNT.id))) as {
      state: string;
      downloadToken?: string;
    };
    expect(res.state).toBe('building');
    expect(res.downloadToken).toBeUndefined();
  });

  it('surfaces the error message for a failed export', async () => {
    getExportByJob.mockResolvedValue({
      accountId: MY_ACCOUNT.id,
      state: 'error',
      error: 'boom',
    });
    const res = (await call(eventFor(MY_ACCOUNT.id))) as {
      state: string;
      error?: string;
    };
    expect(res.state).toBe('error');
    expect(res.error).toBe('boom');
  });
});
