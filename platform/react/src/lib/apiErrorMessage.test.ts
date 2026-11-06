import { describe, expect, it } from 'vitest';
import type { i18n as I18nInstance } from 'i18next';
import { apiErrorMessage } from './apiErrorMessage';

// `t` echoes the key so assertions read as "the mapper picked this key".
const mkI18n = (keys: string[]) =>
  ({
    t: (key: string) => key,
    exists: (key: string) => keys.includes(key),
  }) as unknown as I18nInstance;

describe('apiErrorMessage', () => {
  it('translates a known i18n key carried in the wire message', () => {
    const i18n = mkI18n(['groups.leave.lastOwnerError']);
    const err = {
      __HTTP_ERROR__: true,
      status: 403,
      message: 'groups.leave.lastOwnerError',
    };
    expect(apiErrorMessage(err, i18n)).toBe('groups.leave.lastOwnerError');
  });

  it('prefers a known key over the status copy', () => {
    const i18n = mkI18n(['auth.register.inviteInactive']);
    const err = { status: 403, message: 'auth.register.inviteInactive' };
    expect(apiErrorMessage(err, i18n)).toBe('auth.register.inviteInactive');
  });

  it('uses the wire `key` field when it is a known key', () => {
    const i18n = mkI18n(['some.key']);
    const err = { status: 404, message: 'Not found', key: 'some.key' };
    expect(apiErrorMessage(err, i18n)).toBe('some.key');
  });

  it.each([
    [401, 'common.errors.unauthorized'],
    [403, 'common.errors.forbidden'],
    [404, 'common.errors.notFound'],
    [500, 'common.errors.serverError'],
    [503, 'common.errors.serverError'],
  ])('maps status %i to %s for raw messages', (status, expected) => {
    const i18n = mkI18n([]);
    expect(apiErrorMessage({ status, message: 'raw message' }, i18n)).toBe(
      expected,
    );
  });

  it('maps network failures to the network copy', () => {
    const i18n = mkI18n([]);
    expect(apiErrorMessage(new TypeError('Failed to fetch'), i18n)).toBe(
      'common.errors.networkError',
    );
    expect(apiErrorMessage(new Error('Request timed out'), i18n)).toBe(
      'common.errors.networkError',
    );
  });

  it('translates a known key thrown as an Error (auth flows)', () => {
    const i18n = mkI18n(['auth.login.error']);
    expect(apiErrorMessage(new Error('auth.login.error'), i18n)).toBe(
      'auth.login.error',
    );
  });

  it('accepts bare message strings', () => {
    const i18n = mkI18n(['auth.refresh.invalid-or-expired']);
    expect(apiErrorMessage('auth.refresh.invalid-or-expired', i18n)).toBe(
      'auth.refresh.invalid-or-expired',
    );
    expect(apiErrorMessage('Something went wrong', i18n)).toBe(
      'Something went wrong',
    );
    expect(apiErrorMessage(new Error('Failed to fetch'), mkI18n([]))).toBe(
      'common.errors.networkError',
    );
  });

  it('passes through raw messages without status', () => {
    const i18n = mkI18n([]);
    expect(apiErrorMessage({ message: 'Custom server text' }, i18n)).toBe(
      'Custom server text',
    );
  });

  it('falls back to the provided fallback, then the generic error copy', () => {
    const i18n = mkI18n([]);
    expect(apiErrorMessage(undefined, i18n, 'Custom fallback')).toBe(
      'Custom fallback',
    );
    expect(apiErrorMessage(new Error(''), i18n)).toBe('common.errors.error');
    expect(apiErrorMessage({ status: 409 }, i18n)).toBe('common.errors.error');
  });
});
