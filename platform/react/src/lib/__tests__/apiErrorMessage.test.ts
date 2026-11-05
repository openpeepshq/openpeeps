import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import { apiErrorCandidate, apiErrorMessage } from '../apiErrorMessage';

const DICT: Record<string, string> = {
  'error.pollClosed': 'This poll has ended.',
  'groups.leave.lastOwnerError':
    'You are the last owner. Assign another owner before leaving.',
  'common.errors.unauthorized': 'Please log in to continue',
  'common.errors.forbidden': "You don't have permission to perform this action",
  'common.errors.notFound': 'Not found',
  'common.errors.serverError': 'Server error. Please try again later.',
  'common.errors.networkError': 'Network error. Please check your connection.',
  'common.errors.error': 'Error',
};

const i18n = i18next.createInstance();
i18n.init({
  resources: { en: { translation: DICT } },
  lng: 'en',
  fallbackLng: 'en',
  initImmediate: false,
});
const t = i18n.getFixedT('en');

describe('apiErrorCandidate', () => {
  it('extracts from the known error shapes', () => {
    expect(apiErrorCandidate({ message: 'boom' })).toBe('boom');
    expect(apiErrorCandidate({ key: 'some.key' })).toBe('some.key');
    expect(apiErrorCandidate({ errorKey: 'error.pollClosed' })).toBe(
      'error.pollClosed',
    );
    expect(apiErrorCandidate({ error: { key: 'some.key' } })).toBe('some.key');
    expect(apiErrorCandidate({ error: { message: 'boom' } })).toBe('boom');
    expect(apiErrorCandidate(new Error('boom'))).toBe('boom');
    expect(apiErrorCandidate('boom')).toBe('boom');
    expect(apiErrorCandidate(null)).toBe('');
    expect(apiErrorCandidate({})).toBe('');
  });
});

describe('apiErrorMessage', () => {
  it('translates server messages that are i18n keys, in any namespace', () => {
    expect(
      apiErrorMessage({ status: 409, message: 'error.pollClosed' }, t),
    ).toBe('This poll has ended.');
    expect(
      apiErrorMessage(
        { status: 409, message: 'groups.leave.lastOwnerError' },
        t,
      ),
    ).toBe('You are the last owner. Assign another owner before leaving.');
  });

  it('passes through human-readable server messages', () => {
    expect(
      apiErrorMessage({ status: 422, message: 'Something specific' }, t),
    ).toBe('Something specific');
  });

  it('maps default HTTP messages to localized copy by status', () => {
    expect(
      apiErrorMessage({ status: 401, message: 'Authentication needed' }, t),
    ).toBe('Please log in to continue');
    expect(apiErrorMessage({ status: 403, message: 'Forbidden' }, t)).toBe(
      "You don't have permission to perform this action",
    );
    expect(apiErrorMessage({ status: 404, message: 'Not found' }, t)).toBe(
      'Not found',
    );
    expect(
      apiErrorMessage({ status: 500, message: 'Internal server error' }, t),
    ).toBe('Server error. Please try again later.');
  });

  it('prefers the status copy over untranslated raw messages', () => {
    expect(apiErrorMessage({ status: 404, message: 'Post not found' }, t)).toBe(
      'Not found',
    );
    expect(
      apiErrorMessage(
        { status: 500, message: 'Missing capabilities: core-posts-react' },
        t,
      ),
    ).toBe('Server error. Please try again later.');
    expect(apiErrorMessage({ status: 503, message: 'raw message' }, t)).toBe(
      'Server error. Please try again later.',
    );
  });

  it('uses a known wire key over the status copy', () => {
    expect(
      apiErrorMessage(
        { status: 404, message: 'Not found', key: 'error.pollClosed' },
        t,
      ),
    ).toBe('This poll has ended.');
  });

  it('passes through raw messages without a status', () => {
    expect(apiErrorMessage({ message: 'Custom server text' }, t)).toBe(
      'Custom server text',
    );
  });

  it('maps status codes without any message', () => {
    expect(apiErrorMessage({ status: 500 }, t)).toBe(
      'Server error. Please try again later.',
    );
    expect(apiErrorMessage({ status: 401 }, t)).toBe(
      'Please log in to continue',
    );
  });

  it('detects transport-level network failures', () => {
    expect(apiErrorMessage(new TypeError('Failed to fetch'), t)).toBe(
      'Network error. Please check your connection.',
    );
    expect(apiErrorMessage(new Error('NetworkRequestFailed'), t)).toBe(
      'Network error. Please check your connection.',
    );
  });

  it('falls back to the provided or default copy', () => {
    expect(apiErrorMessage({ status: 409 }, t, 'Failed to create group')).toBe(
      'Failed to create group',
    );
    expect(apiErrorMessage(new Error(''), t)).toBe('Error');
    expect(apiErrorMessage(undefined, t)).toBe('Error');
  });
});
