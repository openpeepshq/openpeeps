/**
 * Pins the `useMediaProgress` hook-level `onError` forwarding (issue #2277,
 * round-17 review item #2): the caller's `onError` is handed to the progress
 * feed, and a blank attachment id maps to a blank path parameter (the
 * stream's `.last` guard then skips opening a broken `/media//progress` URL
 * during the byte-upload phase).
 *
 * `noPayloadStream` is stubbed so its `.last` is a plain recorder (not a React
 * hook); the real `otherHooks` is built from a stub client, so the assertions
 * exercise the actual `useMediaProgress` wiring.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenpeepsClient } from '@openpeepshq/client';
import { otherHooks } from './other';

const { lastSpy } = vi.hoisted(() => ({ lastSpy: vi.fn(() => undefined) }));

vi.mock('../helpers', () => ({
  apiHook: () => () => undefined,
  noPayloadMutation: () => () => undefined,
  payloadMutation: () => () => undefined,
  payloadProgressMutation: () => () => undefined,
  noPayloadStream: () => ({ last: lastSpy, all: vi.fn(() => undefined) }),
}));

const makeClient = (): OpenpeepsClient =>
  ({
    mediaAttachment: {
      create: () => ({}),
      createWithProgress: () => ({}),
      progress: { listen: () => () => ({}) },
    },
    server: { info: () => ({}) },
    sso: { generic: { authenticate: () => ({}) } },
    previewLink: () => ({}),
    location: { geocode: () => ({}) },
    i18n: { translations: () => ({}), languages: () => ({}) },
    reports: { list: () => ({}), findById: () => ({}), create: () => ({}) },
    streaming: { vod: { create: () => ({}), status: () => ({}) } },
  }) as unknown as OpenpeepsClient;

const hooks = otherHooks(makeClient());

describe('useMediaProgress stream wiring', () => {
  beforeEach(() => {
    lastSpy.mockClear();
  });

  it('forwards the caller onError to the progress feed', () => {
    const onError = vi.fn();
    hooks.useMediaProgress('att-1', onError);
    expect(lastSpy).toHaveBeenCalledTimes(1);
    expect(lastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: { id: 'att-1' },
        onError,
      }),
    );
  });

  it('maps a blank id to a blank path parameter (no feed opened)', () => {
    hooks.useMediaProgress(undefined);
    expect(lastSpy).toHaveBeenCalledTimes(1);
    // Blank id → the stream's `.last` guard skips opening the feed; the
    // forwarding still hands the feed a blank param (not a missing one).
    expect(lastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ pathParameters: { id: '' } }),
    );
    expect(lastSpy.mock.calls[0][0].onError).toBeUndefined();
  });
});
