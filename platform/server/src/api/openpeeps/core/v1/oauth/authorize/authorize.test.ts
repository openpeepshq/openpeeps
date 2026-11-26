import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureLocalProfile: vi.fn(async () => ({ id: 'p1' })),
  describeOAuthAuthorization: vi.fn(),
  decideOAuthAuthorization: vi.fn(),
}));

vi.mock('#lib/auth', () => ({ ensureLocalProfile: mocks.ensureLocalProfile }));
vi.mock('@openpeepshq/core/oauth', () => ({
  describeOAuthAuthorization: mocks.describeOAuthAuthorization,
  decideOAuthAuthorization: mocks.decideOAuthAuthorization,
  isOAuthError: (e: unknown) => e instanceof Error && 'oauthError' in e,
}));

import * as Get from './GET';
import * as Post from './POST';

const request = {
  response_type: 'code',
  client_id: 'c1',
  redirect_uri: 'org.example.app:/cb',
  code_challenge: 'c'.repeat(43),
  code_challenge_method: 'S256',
};
const event = {
  context: { authorization: { iat: 1700 }, currentAccount: { id: 'a1' } },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /oauth/authorize', () => {
  it('describes the request for the signed-in profile', async () => {
    mocks.describeOAuthAuthorization.mockResolvedValue({ status: 'consent' });
    await expect(
      Get.apiEndpoint.handle({ body: {}, query: request, param: {}, event }),
    ).resolves.toEqual({ status: 'consent' });
    expect(mocks.ensureLocalProfile).toHaveBeenCalledWith(event, false);
    expect(mocks.describeOAuthAuthorization).toHaveBeenCalledWith(
      request,
      'p1',
    );
  });

  it('turns OAuth validation errors into 400s', async () => {
    mocks.describeOAuthAuthorization.mockRejectedValue(
      Object.assign(new Error('Unknown client'), {
        oauthError: 'invalid_client',
      }),
    );
    await expect(
      Get.apiEndpoint.handle({ body: {}, query: request, param: {}, event }),
    ).rejects.toMatchObject({ status: 400, message: 'Unknown client' });
  });
});

describe('POST /oauth/authorize', () => {
  it('passes the decision, account and login time to core', async () => {
    mocks.decideOAuthAuthorization.mockResolvedValue(
      'org.example.app:/cb?code=x',
    );
    await expect(
      Post.apiEndpoint.handle({
        body: { ...request, approve: true },
        query: {},
        param: {},
        event,
      }),
    ).resolves.toEqual({ redirectUrl: 'org.example.app:/cb?code=x' });
    expect(mocks.decideOAuthAuthorization).toHaveBeenCalledWith({
      request,
      approve: true,
      profileId: 'p1',
      accountId: 'a1',
      authTime: 1700,
    });
  });

  it('requires an approve flag', () => {
    expect(Post.Input.safeParse(request).success).toBe(false);
    expect(Post.Input.safeParse({ ...request, approve: false }).success).toBe(
      true,
    );
  });
});
