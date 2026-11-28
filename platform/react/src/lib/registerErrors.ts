import { HANDLE_RESERVED_MESSAGE } from '@openpeepshq/common';
import type { TFunction } from 'i18next';
import { apiErrorCandidate, apiErrorMessage } from './apiErrorMessage';

/**
 * Maps a failed register call to user-facing copy. The reserved-handle check
 * matches on the raw candidate before the generic mapper runs because the
 * server sends it as plain English, not an i18n key.
 */
export const registerApiErrorMessage = (err: unknown, t: TFunction): string => {
  const candidate = apiErrorCandidate(err);
  if (candidate === HANDLE_RESERVED_MESSAGE) {
    return t('profile.form.handleReserved', {
      defaultValue: 'That handle is reserved. Please choose another.',
    });
  }
  // Intentional divergence from the old per-page copy: the previous
  // `registerErrorCopy` attempted to translate an unknown raw message as a
  // key (`t(raw)`), which leaked untranslated server strings; this mapper
  // uses a static localized fallback instead, so unknown messages surface
  // as the localized "Registration failed" copy, not the raw string.
  return apiErrorMessage(
    err,
    t,
    t('auth.register.error', { defaultValue: 'Registration failed' }),
  );
};
