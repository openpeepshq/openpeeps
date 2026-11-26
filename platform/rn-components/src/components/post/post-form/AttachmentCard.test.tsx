/**
 * Web/native parity pin for the RN "stalled upload" behavior (issue #2277,
 * round-17 review item #2): when the media-processing SSE feed fails to open
 * (non-2xx, e.g. an auth expiry mid-upload), the RN `ProcessingTracker`
 * reports the attachment `failed` through `onUpdate` — mirroring the web
 * `AttachmentCard`'s dead-feed → `onFailed` routing — instead of spinning
 * forever on the processing overlay.
 *
 * Only the RN surface, the UI primitives, and the shared `useOpenpeeps` hook
 * are stubbed; the real `AttachmentCard` is rendered with a `processing`
 * image attachment (which mounts the `ProcessingTracker`), and its
 * `useMediaProgress` `onError` callback is captured so a test can drive a
 * non-2xx failure directly (a real feed would emit one).
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const ATTACHMENT = {
  id: 'att-1',
  type: 'image',
  status: 'processing',
  url: 'https://cdn.example/att-1.jpg',
  previewUrl: 'https://cdn.example/att-1-preview.jpg',
};

let mockEvent: unknown = undefined;
// The `onError` the ProcessingTracker hands its progress feed.
let mockCapturedOnError: ((e: unknown) => void) | undefined;

jest.mock('react-native', () => ({
  View: (props: { children?: unknown; className?: string }) =>
    React.createElement('View', null, props.children),
  ActivityIndicator: () => React.createElement('ActivityIndicator'),
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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'form.upload.processing' ? 'Processing' : key),
  }),
}));

jest.mock('../../icons/index', () => ({
  VideoIcon: () => React.createElement('VideoIcon'),
}));

jest.mock('../../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../../lib/attachmentHelpers', () => ({
  isImageAttachment: () => true,
}));

jest.mock('../../custom/common/cached-image', () => ({
  CachedImage: () => React.createElement('CachedImage'),
}));

jest.mock('../pieces/DocumentAttachment', () => ({
  DocumentAttachment: () => React.createElement('DocumentAttachment'),
}));

jest.mock('../pieces/gallery/GalleryAudio', () => ({
  GalleryAudio: () => React.createElement('GalleryAudio'),
}));

jest.mock('../VideoPlayOverlay', () => ({
  VideoPlayOverlay: () => React.createElement('VideoPlayOverlay'),
}));

const { AttachmentCard } = require('./AttachmentCard');

const mountCard = (onUpdate: jest.Mock, event: unknown = undefined) => {
  mockEvent = event;
  mockCapturedOnError = undefined;
  let tree: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(AttachmentCard, {
        attachment: ATTACHMENT,
        isActive: true,
        onUpdate,
      })
    );
  });
  return tree;
};

describe('AttachmentCard ProcessingTracker stream failure (RN)', () => {
  it('reports a dead progress feed as a failed attachment', () => {
    const onUpdate = jest.fn();
    mountCard(onUpdate);
    // Processing phase: the tracker subscribes to the feed and wires onError.
    expect(typeof mockCapturedOnError).toBe('function');

    ReactTestRenderer.act(() => {
      mockCapturedOnError?.({ status: 401, key: 'error.unauthorized' });
    });

    // The stall surfaces as the attachment transitioning to `failed`,
    // preserving the rest of the attachment (mirrors the web onFailed path).
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updated = onUpdate.mock.calls[0][0];
    expect(updated.status).toBe('failed');
    expect(updated.id).toBe('att-1');
    expect(updated.type).toBe('image');
  });

  it('reports the stream failure only once per tracker', () => {
    const onUpdate = jest.fn();
    mountCard(onUpdate);

    ReactTestRenderer.act(() => {
      mockCapturedOnError?.({ status: 503 });
    });
    ReactTestRenderer.act(() => {
      mockCapturedOnError?.({ status: 503 });
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('still merges a ready attachment from the feed (happy path)', () => {
    const onUpdate = jest.fn();
    // The feed delivers a ready attachment before any failure.
    mountCard(onUpdate, { mediaAttachment: { id: 'att-1', status: 'ready' } });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0].status).toBe('ready');
  });
});
