import { describe, expect, it } from 'vitest';
import type { OpenpeepsError } from '@openpeepshq/common/types';
import { fromOpenpeepsError, rethrowIfOpenpeepsError } from '#lib/errors';

// `fromOpenpeepsError` maps the core OpenpeepsError shape onto Riddl's HTTP
// error. The contract pinned here: the response keeps BOTH the
// human-readable `message` and the machine-readable `key` (the `errorKey`),
// so the client's `errorKey ?? key` mapping works for the rethrow path, not
// only the fresh-throw path (see the guest 401 contract).

const allPeepError = (data: {
  code?: OpenpeepsError['code'];
  errorKey: string;
  message?: string;
}) => ({ __allPeepError__: true, ...data }) as OpenpeepsError;

type HttpError = { status: number; message: string; key?: string };

describe('fromOpenpeepsError', () => {
  it('maps status, message and carries the errorKey as the machine-readable key', () => {
    const httpError = fromOpenpeepsError(
      allPeepError({ code: 401, errorKey: 'authNeeded' }),
    ) as unknown as HttpError;
    expect(httpError.status).toBe(401);
    expect(httpError.message).toBe('authNeeded');
    expect(httpError.key).toBe('authNeeded');
  });

  it('keeps a human-readable message when the OpenpeepsError carries one', () => {
    const httpError = fromOpenpeepsError(
      allPeepError({
        code: 403,
        errorKey: 'error.jamRsvpRequired',
        message: 'You need to RSVP to join this jam',
      }),
    ) as unknown as HttpError;
    expect(httpError.status).toBe(403);
    expect(httpError.message).toBe('You need to RSVP to join this jam');
    expect(httpError.key).toBe('error.jamRsvpRequired');
  });

  it('defaults to 500 when no code is set', () => {
    const httpError = fromOpenpeepsError(
      allPeepError({ errorKey: 'internalError' }),
    ) as unknown as HttpError;
    expect(httpError.status).toBe(500);
    expect(httpError.key).toBe('internalError');
  });

  it('rethrowIfOpenpeepsError re-emits the transformed HTTP error', () => {
    const thrown = (() => {
      try {
        rethrowIfOpenpeepsError(
          allPeepError({ code: 401, errorKey: 'error.jamGuestPassRequired' }),
        );
        return undefined;
      } catch (e) {
        return e;
      }
    })() as unknown as HttpError;
    expect(thrown).toBeDefined();
    expect(thrown.status).toBe(401);
    expect(thrown.key).toBe('error.jamGuestPassRequired');
    expect(thrown.message).toBe('error.jamGuestPassRequired');
  });

  it('rethrowIfOpenpeepsError passes non-Openpeeps errors through untouched', () => {
    const boom = new Error('boom');
    const thrown = (() => {
      try {
        rethrowIfOpenpeepsError(boom);
        return undefined;
      } catch (e) {
        return e;
      }
    })();
    expect(thrown).toBe(boom);
  });
});
