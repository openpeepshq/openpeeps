import type { OpenpeepsClient } from '@openpeepshq/client';
import type { CredentialsStore } from '../auth/credentials';
import type {
  LoginRequest,
  RegisterRequest,
  RequestResetPasswordRequest,
  ResetPasswordRequest,
  TokenResponse,
} from '@openpeepshq/common';

/**
 * Thin promise unwrapping for endpoints that return
 * `{ data: T } | { error: SuccessFailureResponse }`. Throws on `error`.
 */
const unwrap = async <T>(
  promise: Promise<{ data: T } | { error: { message?: string } }>,
): Promise<T> => {
  const r = await promise;
  if ('error' in r) throw new Error(r.error.message ?? 'Request failed');
  return r.data;
};

export const performLogin = async (
  client: OpenpeepsClient,
  store: CredentialsStore,
  data: LoginRequest,
): Promise<TokenResponse> => {
  const tr = await unwrap(
    client.auth.login(data) as Promise<
      { data: TokenResponse } | { error: { message?: string } }
    >,
  );
  await store.set({ token: tr.token });
  return tr;
};

export const performRegister = async (
  client: OpenpeepsClient,
  store: CredentialsStore,
  data: RegisterRequest,
): Promise<TokenResponse> => {
  const tr = await unwrap(
    client.auth.register(data) as Promise<
      { data: TokenResponse } | { error: { message?: string } }
    >,
  );
  await store.set({ token: tr.token });
  return tr;
};

export const performRequestResetPassword = (
  client: OpenpeepsClient,
  data: RequestResetPasswordRequest,
) =>
  unwrap(
    client.auth.requestResetPassword(data) as Promise<
      { data: unknown } | { error: { message?: string } }
    >,
  );

export const performResetPassword = (
  client: OpenpeepsClient,
  data: ResetPasswordRequest,
  token: string,
) =>
  unwrap(
    client.auth.resetPassword(data, {
      headers: { Authorization: `Bearer ${token}` },
    }) as Promise<{ data: unknown } | { error: { message?: string } }>,
  );

export const performLogout = async (store: CredentialsStore) => {
  await store.clear();
};
