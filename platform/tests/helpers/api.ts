import type { APIRequestContext } from '@playwright/test';

export type TokenResponse = { token: string; success?: boolean };

export const apiHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'content-type': 'application/json',
});

const assertOk = async (
  response: {
    ok: () => boolean;
    status: () => number;
    text: () => Promise<string>;
  },
  label: string,
) => {
  if (!response.ok()) {
    throw new Error(
      `${label} failed: ${response.status()} ${await response.text()}`,
    );
  }
};

/** Account handles are limited to 16 alphanumeric/underscore characters. */
export const uniqueHandle = (prefix = 'u') => {
  const suffix = `${Date.now().toString(36).slice(-6)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const maxPrefixLen = Math.max(1, 16 - suffix.length);
  return `${prefix.slice(0, maxPrefixLen)}${suffix}`.slice(0, 16);
};

export const registerUser = async (
  request: APIRequestContext,
  user: {
    handle: string;
    email: string;
    password: string;
    displayName?: string;
    inviteCode?: string;
  },
): Promise<TokenResponse> => {
  const response = await request.post('/api/openpeeps/core/v1/auth/register', {
    data: {
      handle: user.handle,
      displayName: user.displayName ?? user.handle,
      email: user.email,
      password: user.password,
      privacyPolicyAccepted: true,
      inviteCode: user.inviteCode,
    },
  });
  await assertOk(response, 'register');
  return response.json() as Promise<TokenResponse>;
};

export const loginUser = async (
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<TokenResponse> => {
  const response = await request.post('/api/openpeeps/core/v1/auth/login', {
    data: { email, password },
  });
  await assertOk(response, 'login');
  return response.json() as Promise<TokenResponse>;
};

export const currentProfile = async (
  request: APIRequestContext,
  token: string,
) => {
  const response = await request.get(
    '/api/openpeeps/core/v1/profiles/current',
    { headers: apiHeaders(token) },
  );
  await assertOk(response, 'profiles/current');
  return response.json() as Promise<{ id: string; handle: string }>;
};

export const queueTestEmail = async (
  request: APIRequestContext,
  token: string,
  to: string,
) => {
  const response = await request.post(
    '/api/openpeeps/core/v1/admin/diagnostics/email/test',
    {
      headers: apiHeaders(token),
      data: { to },
    },
  );
  await assertOk(response, 'queueTestEmail');
};

export const createWebhookPushSubscription = async (
  request: APIRequestContext,
  token: string,
  url: string,
  publicKey: string,
) => {
  const response = await request.post(
    '/api/openpeeps/core/v1/accounts/current/push-subscriptions',
    {
      headers: apiHeaders(token),
      data: {
        type: 'webhook',
        url,
        publicKey,
      },
    },
  );
  await assertOk(response, 'createWebhookPushSubscription');
  return response.json();
};

export const sendTestPush = async (
  request: APIRequestContext,
  token: string,
  subscriptionKey: string,
) => {
  const response = await request.post(
    '/api/openpeeps/core/v1/accounts/current/push-subscriptions/test',
    {
      headers: apiHeaders(token),
      data: { subscriptionKey },
    },
  );
  await assertOk(response, 'sendTestPush');
  return response.json() as Promise<{ success: boolean; message?: string }>;
};

export const getServerInfo = async (request: APIRequestContext) => {
  const response = await request.get('/api/openpeeps/core/v1/server/info');
  await assertOk(response, 'server info');
  return response.json();
};

export const getAdminConfig = async (
  request: APIRequestContext,
  token: string,
  namespace: string,
  name: string,
) => {
  const response = await request.get(
    `/api/openpeeps/core/v1/admin/config/${namespace}/${name}`,
    { headers: apiHeaders(token) },
  );
  await assertOk(response, 'getAdminConfig');
  return response.json();
};

export const patchAdminConfig = async (
  request: APIRequestContext,
  token: string,
  namespace: string,
  name: string,
  config: unknown,
) => {
  const response = await request.patch(
    `/api/openpeeps/core/v1/admin/config/${namespace}/${name}`,
    {
      headers: apiHeaders(token),
      data: { config },
    },
  );
  await assertOk(response, 'patchAdminConfig');
  return response.json();
};

export const createNote = async (
  request: APIRequestContext,
  token: string,
  content: string,
  extras: Record<string, unknown> = {},
) => {
  const response = await request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'note',
      visibility: 'local',
      data: { type: 'note', content },
      ...extras,
    },
  });
  await assertOk(response, 'createNote');
  return response.json() as Promise<{ id: string }>;
};

export const createQuestion = async (
  request: APIRequestContext,
  token: string,
  content: string,
  options: string[],
) => {
  const response = await request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'question',
      visibility: 'local',
      data: {
        type: 'question',
        content,
        options: options.map((text) => ({ type: 'note', content: text })),
        multiple: false,
      },
    },
  });
  await assertOk(response, 'createQuestion');
  return response.json() as Promise<{ id: string }>;
};

export const createEvent = async (
  request: APIRequestContext,
  token: string,
  name: string,
  extras?: {
    start?: string;
    end?: string;
    recurrence?: { freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' };
  },
) => {
  const start = extras?.start ?? new Date(Date.now() + 60_000).toISOString();
  const end = extras?.end ?? new Date(Date.now() + 3_600_000).toISOString();
  const response = await request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'event',
      visibility: 'local',
      data: {
        type: 'event',
        name,
        content: name,
        start,
        end,
        wholeDay: false,
        ...(extras?.recurrence ? { recurrence: extras.recurrence } : {}),
      },
    },
  });
  await assertOk(response, 'createEvent');
  return response.json() as Promise<{ id: string }>;
};

export const createGroup = async (
  request: APIRequestContext,
  token: string,
  group: { handle: string; displayName: string; capabilities: unknown },
) => {
  const response = await request.post('/api/openpeeps/core/v1/groups', {
    headers: apiHeaders(token),
    data: {
      handle: group.handle,
      displayName: group.displayName,
      discoverable: true,
      capabilities: group.capabilities,
    },
  });
  await assertOk(response, 'createGroup');
  return response.json() as Promise<{ id: string; handle: string }>;
};

export const requestPasswordReset = async (
  request: APIRequestContext,
  email: string,
) => {
  const response = await request.post(
    '/api/openpeeps/core/v1/auth/request-reset-password',
    { data: { email } },
  );
  await assertOk(response, 'requestPasswordReset');
};

export const resetPassword = async (
  request: APIRequestContext,
  token: string,
  password: string,
) => {
  const response = await request.post(
    '/api/openpeeps/core/v1/auth/reset-password',
    {
      headers: apiHeaders(token),
      data: { password, confirmPassword: password },
    },
  );
  await assertOk(response, 'resetPassword');
};

export const requestValidationEmail = async (
  request: APIRequestContext,
  token: string,
) => {
  const response = await request.post(
    '/api/openpeeps/core/v1/accounts/current/validation-email',
    {
      headers: apiHeaders(token),
      // Endpoint has no Input schema but still requires a JSON body.
      data: {},
    },
  );
  await assertOk(response, 'requestValidationEmail');
};

export const validateEmailToken = async (
  request: APIRequestContext,
  token: string,
) => {
  const response = await request.get(
    `/api/openpeeps/core/v1/auth/validate-email?token=${encodeURIComponent(token)}`,
  );
  await assertOk(response, 'validateEmail');
  return response.json() as Promise<{ success: boolean }>;
};

export const getProfileSettings = async (
  request: APIRequestContext,
  token: string,
) => {
  const response = await request.get(
    '/api/openpeeps/core/v1/profiles/current/settings',
    { headers: apiHeaders(token) },
  );
  await assertOk(response, 'getProfileSettings');
  return response.json() as Promise<{
    id: string;
    notifications?: Record<
      string,
      { create: boolean; push: boolean; email: boolean }
    >;
  }>;
};

/** Merge notification channel prefs (used to opt into email-off-by-default types). */
export const enableEmailNotifications = async (
  request: APIRequestContext,
  token: string,
  types: string[],
) => {
  const settings = await getProfileSettings(request, token);
  const notifications = { ...(settings.notifications ?? {}) };
  for (const type of types) {
    notifications[type] = { create: true, push: true, email: true };
  }
  const response = await request.put(
    '/api/openpeeps/core/v1/profiles/current/settings',
    {
      headers: apiHeaders(token),
      data: { ...settings, notifications },
    },
  );
  await assertOk(response, 'enableEmailNotifications');
  return response.json();
};

export const announcePost = async (
  request: APIRequestContext,
  token: string,
  postId: string,
) => {
  const response = await request.post(
    `/api/openpeeps/core/v1/admin/posts/${postId}/announce`,
    {
      headers: apiHeaders(token),
      data: {},
    },
  );
  await assertOk(response, 'announcePost');
};

export const getPublicProfile = async (
  request: APIRequestContext,
  token: string,
  profileId: string,
) => {
  const response = await request.get(
    `/api/openpeeps/core/v1/profiles/${profileId}`,
    { headers: apiHeaders(token) },
  );
  await assertOk(response, 'getPublicProfile');
  return response.json();
};

/** Admin-add: body is a public profile (not just an id). */
export const addGroupMember = async (
  request: APIRequestContext,
  token: string,
  groupId: string,
  profile: unknown,
) => {
  const response = await request.post(
    `/api/openpeeps/core/v1/groups/${groupId}/members`,
    {
      headers: apiHeaders(token),
      data: profile,
    },
  );
  await assertOk(response, 'addGroupMember');
};

export const repostNote = async (
  request: APIRequestContext,
  token: string,
  postId: string,
) => {
  const response = await request.post(
    `/api/openpeeps/core/v1/posts/${postId}/reposts`,
    {
      headers: apiHeaders(token),
      data: {},
    },
  );
  await assertOk(response, 'repostNote');
  return response.json() as Promise<{ id: string }>;
};
