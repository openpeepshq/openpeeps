/**
 * Unit tests for the SSE `onError` relay and the `onlyNew` id filter in
 * `buildSource`.
 *
 * sse.js performs I/O through a real `XMLHttpRequest`. We keep the **real**
 * sse.js (so its non-2xx gating into `_onStreamFailure` is exercised) and
 * stub only the `XMLHttpRequest` boundary with a fake that records instances
 * and lets a test synchronously deliver a response or an SSE text chunk.
 * That boundary stub is the minimal shim the plan calls for — every line of
 * `buildSource`/`noPayloadEventSource` under test is real code.
 */
/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { noPayloadEventSource } from './index';

const config = { baseUrl: 'http://test.local' };

const xhrs: FakeXHR[] = [];

class FakeXHR extends EventTarget {
  status = 0;
  response = '';
  responseText = '';
  withCredentials = false;
  open = vi.fn();
  setRequestHeader = vi.fn();
  getAllResponseHeaders = () => '';
  send = vi.fn();
  abort = vi.fn(() => this.dispatchEvent(new CustomEvent('abort')));

  constructor() {
    super();
    xhrs.push(this);
  }

  /** Deliver a non-2xx (or 2xx) HTTP response: sse.js routes non-2xx into an `error` event. */
  deliverResponse(status: number, body: string) {
    this.status = status;
    this.response = body;
    this.dispatchEvent(new CustomEvent('progress'));
  }

  /** Deliver an SSE text chunk (one or more `id:`/`data:` events). */
  deliverSse(text: string) {
    this.status = 200;
    this.responseText = text;
    this.dispatchEvent(new CustomEvent('progress'));
  }
}

beforeEach(() => {
  xhrs.length = 0;
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const createSource = () =>
  noPayloadEventSource<{ text: string }>(config)('/test', 'POST', 'message');

const lastXhr = () => {
  const xhr = xhrs[xhrs.length - 1];
  if (!xhr) throw new Error('no FakeXHR was created');
  return xhr;
};

describe('buildSource onError relay', () => {
  it('fires onError once with status and the machine key from a 401 JSON body', async () => {
    const onError = vi.fn();
    const source = await createSource()({
      handler: vi.fn(),
      start: true,
      onError,
    });
    expect(source).toBeDefined();
    lastXhr().deliverResponse(
      401,
      JSON.stringify({ errorKey: 'error.jamGuestPassRequired' }),
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({
      status: 401,
      key: 'error.jamGuestPassRequired',
      message: undefined,
    });
    // Fire-once contract: a second failure must not re-fire.
    lastXhr().deliverResponse(
      401,
      JSON.stringify({ errorKey: 'error.jamGuestPassRequired' }),
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('falls back to the body `key` when there is no `errorKey`', async () => {
    const onError = vi.fn();
    await createSource()({ handler: vi.fn(), start: true, onError });
    lastXhr().deliverResponse(
      403,
      JSON.stringify({ key: 'error.forbidden', message: 'Nope' }),
    );
    expect(onError).toHaveBeenCalledWith({
      status: 403,
      key: 'error.forbidden',
      message: 'Nope',
    });
  });

  it('sets `message` (no key) for a non-JSON body', async () => {
    const onError = vi.fn();
    await createSource()({ handler: vi.fn(), start: true, onError });
    lastXhr().deliverResponse(502, 'bad gateway');
    expect(onError).toHaveBeenCalledWith({
      status: 502,
      key: undefined,
      message: 'bad gateway',
    });
  });

  it('does not throw when onError is omitted', async () => {
    await createSource()({ handler: vi.fn(), start: true });
    expect(() =>
      lastXhr().deliverResponse(500, JSON.stringify({ message: 'boom' })),
    ).not.toThrow();
  });

  it('fires no onError after close() (abort path)', async () => {
    const onError = vi.fn();
    const source = await createSource()({
      handler: vi.fn(),
      start: true,
      onError,
    });
    source.close();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('buildSource onlyNew id filter', () => {
  const runFilter = async (
    lastId: string,
    ids: string[],
  ): Promise<string[]> => {
    const seen: string[] = [];
    await createSource()({
      handler: (event: { text: string }) => seen.push(event.text),
      start: true,
      onlyNew: true,
      lastId,
    });
    const chunk =
      ids
        .map(
          (id) =>
            `id: ${id}\ndata: ${encodeURIComponent(JSON.stringify({ text: id }))}`,
        )
        .join('\n\n') + '\n\n';
    lastXhr().deliverSse(chunk);
    return seen;
  };

  it('compares numeric ids numerically, not lexicographically', async () => {
    expect(await runFilter('9', ['5', '10'])).toEqual(['10']);
  });

  it('compares uuid-shaped ids lexicographically', async () => {
    const a = '0193a000-0000-7000-8000-000000000001';
    const b = '0193a000-0000-7000-8000-000000000002';
    expect(await runFilter(a, [a, b])).toEqual([b]);
  });
});
