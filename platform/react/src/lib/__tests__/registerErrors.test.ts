import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import { HANDLE_RESERVED_MESSAGE } from '@openpeepshq/common';
import { registerApiErrorMessage } from '../registerErrors';

const DICT: Record<string, string> = {
  'profile.form.handleReserved':
    'That handle is reserved. Please choose another.',
  'auth.register.error': 'Registration failed',
  'auth.register.signupsClosed': 'Sign-ups are currently closed.',
  'common.errors.networkError': 'Network error. Please check your connection.',
  'error.emailAlreadyTaken': 'That email is already in use.',
};

const i18n = i18next.createInstance();
i18n.init({
  resources: { en: { translation: DICT } },
  lng: 'en',
  fallbackLng: 'en',
  initImmediate: false,
});
const t = i18n.getFixedT('en');

describe('registerApiErrorMessage', () => {
  it('returns the reserved-handle copy for the raw server message', () => {
    expect(
      registerApiErrorMessage({ message: HANDLE_RESERVED_MESSAGE }, t),
    ).toBe('That handle is reserved. Please choose another.');
  });

  it('delegates i18n-key messages to the shared mapper', () => {
    expect(
      registerApiErrorMessage(
        { status: 403, message: 'auth.register.signupsClosed' },
        t,
      ),
    ).toBe('Sign-ups are currently closed.');
  });

  it('uses the status copy for unknown messages that carry a status', () => {
    expect(
      registerApiErrorMessage({ status: 403, message: 'Something else' }, t),
    ).toBe("You don't have permission to perform this action");
  });

  it('pins the server 409 email-already-taken shape', () => {
    // `registerHandler` throws `conflict('error.emailAlreadyTaken')`; Riddl
    // serializes it to `{ status: 409, message: 'error.emailAlreadyTaken' }`
    // (the Playwright auth suite pins the same wire shape end to end). The
    // key must translate, so the register toast shows the localized
    // "already in use" copy.
    expect(
      registerApiErrorMessage(
        { status: 409, message: 'error.emailAlreadyTaken' },
        t,
      ),
    ).toBe('That email is already in use.');
  });

  it('maps a transport failure to the network copy, not raw English', () => {
    // The register path is where a failed fetch surfaces to the user; the
    // mapper's network branch must beat the candidate/status resolution.
    expect(registerApiErrorMessage(new TypeError('Failed to fetch'), t)).toBe(
      'Network error. Please check your connection.',
    );
    // React Native's own transport wording is covered too.
    expect(
      registerApiErrorMessage(new Error('Network request failed'), t),
    ).toBe('Network error. Please check your connection.');
  });

  it('falls back to the registration-failed copy when there is no message or status', () => {
    expect(registerApiErrorMessage({ message: '' }, t)).toBe(
      'Registration failed',
    );
  });
});
