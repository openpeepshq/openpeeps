/**
 * Web/native parity pin for the RN "stalled upload" behavior (issue #2277,
 * round-17 review item #2): when the media-processing SSE feed fails to open
 * (non-2xx, e.g. an auth expiry mid-upload), the RN `MediaUploadProgress`
 * reports the stall through `onFailed` — mirroring the web `AttachmentCard`'s
 * dead-feed → `onFailed` routing — instead of spinning forever on a progress
 * bar that will never update.
 *
 * Only the RN surface (`react-native`, the UI primitives) and the shared
 * `useOpenpeeps` hook are stubbed; the real `MediaUploadProgress` is rendered,
 * and its `useMediaProgress` `onError` callback is captured so a test can
 * drive a non-2xx failure directly (a real feed would emit one).
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

let mockEvent: unknown = undefined;
// The `onError` the component hands its progress feed, per the latest render.
let mockCapturedOnError: ((e: unknown) => void) | undefined;

jest.mock('react-native', () => ({
  View: (props: { children?: unknown; className?: string }) =>
    React.createElement('View', null, props.children),
}));

jest.mock('../../ui/progress', () => ({
  Progress: () => React.createElement('Progress'),
}));

jest.mock('../../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useMediaProgress: (
        _id: string | undefined,
        onError?: (e: unknown) => void
      ) => {
        mockCapturedOnError = onError;
        return mockEvent;
      },
    },
  }),
}));

const { MediaUploadProgress } = require('./media-upload-progress');

const mountProgress = (
  props: Record<string, unknown> = {}
): { onFailed?: jest.Mock } => {
  mockEvent = undefined;
  mockCapturedOnError = undefined;
  const onFailed = props.onFailed as jest.Mock | undefined;
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      React.createElement(MediaUploadProgress, {
        isUploading: false,
        mediaAttachmentId: 'att-1',
        ...props,
      })
    );
  });
  return { onFailed };
};

describe('MediaUploadProgress stream failure (RN)', () => {
  it('reports a dead progress feed through onFailed (stalled upload)', () => {
    const onFailed = jest.fn();
    mountProgress({ onFailed });
    // Processing phase: the component subscribes to the feed and wires onError.
    expect(typeof mockCapturedOnError).toBe('function');

    ReactTestRenderer.act(() => {
      mockCapturedOnError?.({ status: 401, key: 'error.unauthorized' });
    });

    // The stall is surfaced once through onFailed, with no server error text
    // (the feed never delivered a `failed` attachment to carry an error).
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(undefined);
  });

  it('reports the stream failure only once per attachment', () => {
    const onFailed = jest.fn();
    mountProgress({ onFailed });

    ReactTestRenderer.act(() => {
      mockCapturedOnError?.({ status: 503 });
    });
    ReactTestRenderer.act(() => {
      mockCapturedOnError?.({ status: 503 });
    });

    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it('ignores a stream failure while no attachment id is tracked (byte phase)', () => {
    const onFailed = jest.fn();
    mountProgress({
      isUploading: true,
      uploadPercent: 40,
      mediaAttachmentId: undefined,
      onFailed,
    });
    // The feed hook is still wired, but with no `mediaAttachmentId` the
    // guard bails before reporting — a byte-phase failure is the caller's
    // own `onFailed` concern, not a stalled progress feed.
    expect(typeof mockCapturedOnError).toBe('function');

    ReactTestRenderer.act(() => {
      mockCapturedOnError?.({ status: 401 });
    });

    expect(onFailed).not.toHaveBeenCalled();
  });
});
