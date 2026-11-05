import { HANDLE_RESERVED_MESSAGE } from '@openpeepshq/common';
import type { TFunction } from 'i18next';
import { apiErrorCandidate, apiErrorMessage } from './apiErrorMessage';

/**
 * Maps a failed register call to user-facing copy. The reserved-handle check
 * matches on the raw candidate before the generic mapper runs because the
 * server sends it as plain English, not an i18n key.
 */
export const registerErrorMessage = (err: unknown, t: TFunction): string => {
  const candidate = apiErrorCandidate(err);
  if (candidate === HANDLE_RESERVED_MESSAGE) {
    return t('profile.form.handleReserved', {
      defaultValue: 'That handle is reserved. Please choose another.',
    });
  }
  return apiErrorMessage(
    err,
    t,
    t('auth.register.error', { defaultValue: 'Registration failed' }),
  );
};
