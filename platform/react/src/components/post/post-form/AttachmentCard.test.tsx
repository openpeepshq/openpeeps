/** @vitest-environment jsdom */
/**
 * Web/native parity pin for the web "stalled upload" behavior (issue #2277,
 * round-18 review item #1): when the media-processing SSE feed fails to open
 * (non-2xx, e.g. an auth expiry mid-upload), the web `AttachmentCard` routes
 * the dead feed through `onFailed` — the same path as a byte-upload or
 * server-side failure — instead of spinning forever on the processing overlay.
 * This mirrors the RN `AttachmentCard` / `media-upload-progress` stream-failure
 * tests added in the round-17 rework.
 *
 * Only the shared `useOpenpeeps` hook, the i18n helper, and the non-essential
 * UI children are stubbed; the real `AttachmentCard` is rendered with a
 * `processing` attachment (which subscribes to the progress feed), and its
 * `useMediaProgress` `onError` callback is captured so a test can drive a
 * non-2xx failure directly (a real feed would emit one).
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SseError } from '@openpeepshq/fetch-client';
import { AttachmentCard, type ComposeItem } from './AttachmentCard';

const { useMediaProgress } = vi.hoisted(() => ({
  useMediaProgress: vi.fn(),
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useMediaUpload: () => ({
        state: { uploadPercent: 0, uploadEstimatedRemainingMs: undefined },
        upload: vi.fn(),
        abort: vi.fn(),
      }),
      useMediaProgress,
    },
  }),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

// Non-essential children are stubbed so the real `AttachmentCard` renders in
// jsdom without pulling in the modal / media-preview subtrees.
vi.mock('./DescriptionEditModal', () => ({
  DescriptionEditModal: () => null,
}));
vi.mock('../VideoPlayOverlay', () => ({
  VideoPlayOverlay: () => null,
}));
vi.mock('../pieces/AudioAttachment', () => ({
  AudioAttachment: () => null,
}));

let mockEvent: unknown = undefined;

// The `attachment` slot is typed as the data payload, but the processing path
// reads `id` off it (the real value is a server `MediaAttachment`). Build the
// data payload and merge the id in, then widen to the `ComposeItem` field type.
const processingAttachment = (): NonNullable<ComposeItem['attachment']> =>
  ({
    id: 'att-1',
    type: 'image',
    url: 'https://cdn.example/att-1.jpg',
    previewUrl: null,
    textUrl: null,
    filename: 'att-1.jpg',
    meta: {},
    status: 'processing',
  }) as NonNullable<ComposeItem['attachment']>;

// Renders the real `AttachmentCard` and returns a `rerender` that re-renders
// it with an updated item — modeling the composer marking the item failed in
// response to `onFailed`, which is what blanks `processingId` and stops the
// stream-error path from reporting again.
const renderCard = (
  onFailed: (key: string, error?: string) => void,
  attachment: NonNullable<ComposeItem['attachment']>,
) => {
  const item: ComposeItem = { key: 'k1', usage: 'post-image', attachment };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const rerender = (updated: ComposeItem) => {
    act(() => {
      root.render(
        createElement(AttachmentCard, {
          item: updated,
          onUploaded: vi.fn(),
          onProcessed: vi.fn(),
          onFailed,
          onRemove: vi.fn(),
          onUpdate: vi.fn(),
        }),
      );
    });
  };
  rerender(item);
  return { container, root, rerender };
};

describe('AttachmentCard progress-feed stream failure (web)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockEvent = undefined;
    useMediaProgress.mockClear();
    useMediaProgress.mockImplementation(() => mockEvent);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined as unknown as Root;
    container = undefined as unknown as HTMLDivElement;
  });

  it('routes a dead progress feed through onFailed exactly once', () => {
    const onFailed = vi.fn();
    ({ container, root } = renderCard(onFailed, processingAttachment()));

    // Processing phase: the card subscribes to the feed and wires onError.
    expect(useMediaProgress).toHaveBeenCalledWith(
      'att-1',
      expect.any(Function),
    );
    const onError = useMediaProgress.mock.calls[0]?.[1] as
      | ((e: SseError) => void)
      | undefined;
    expect(typeof onError).toBe('function');

    act(() => {
      onError?.({ status: 401, key: 'error.unauthorized' });
    });

    // The stall is reported once, keyed by the processing attachment id, with
    // no server error text (the feed never delivered a `failed` attachment to
    // carry one) — so the card shows the generic "Upload failed" state.
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith('att-1', undefined);
  });

  it('reports the stream failure only once per attachment', () => {
    const onFailed = vi.fn();
    const { rerender } = renderCard(onFailed, processingAttachment());
    const firstOnError = useMediaProgress.mock.calls.at(-1)?.[1] as
      | ((e: SseError) => void)
      | undefined;
    expect(typeof firstOnError).toBe('function');

    act(() => {
      firstOnError?.({ status: 503 });
    });
    // The composer reacts to `onFailed` by marking the item failed, which
    // blanks `processingId` and re-registers the feed's onError. A stale feed
    // error hitting the re-registered handler must not report again (the real
    // once-guard lives in the composer's `failed` state, not the callback).
    rerender({ key: 'k1', usage: 'post-image', failed: true });
    const secondOnError = useMediaProgress.mock.calls.at(-1)?.[1] as
      | ((e: SseError) => void)
      | undefined;
    expect(typeof secondOnError).toBe('function');

    act(() => {
      secondOnError?.({ status: 503 });
    });

    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it('does not report when there is no processing attachment to key', () => {
    // A `ready` attachment means `processingId` is blank; a stale feed error
    // must not surface as a failure for a non-processing item.
    const onFailed = vi.fn();
    const ready = processingAttachment();
    ({ container, root } = renderCard(onFailed, {
      ...ready,
      status: 'ready',
    }));
    const onError = useMediaProgress.mock.calls[0]?.[1] as
      | ((e: SseError) => void)
      | undefined;
    expect(typeof onError).toBe('function');

    act(() => {
      onError?.({ status: 503 });
    });

    expect(onFailed).not.toHaveBeenCalled();
  });
});
