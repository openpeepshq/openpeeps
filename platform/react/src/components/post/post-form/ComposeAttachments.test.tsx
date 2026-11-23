/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAttachmentData } from '@openpeepshq/common';
import {
  ComposeAttachments,
  useComposeAttachments,
} from './ComposeAttachments';

const { useMediaUpload } = vi.hoisted(() => ({
  useMediaUpload: vi.fn(),
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useMediaUpload,
      useMediaProgress: () => undefined,
    },
  }),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

// The crop modal is exercised through its presence, not its internals.
vi.mock('../../form/ImageEditModal', () => ({
  ImageEditModal: ({ open }: { open?: boolean }) =>
    open ? createElement('div', { 'data-testid': 'crop-modal' }) : null,
}));

vi.mock('./DescriptionEditModal', () => ({
  DescriptionEditModal: () => null,
}));

// The mic toolbar button opens the VoiceRecorderModal, which imports the
// dialog primitives from react-ui; stub them so the real ComposeAttachments
// renders in jsdom without the full UI dependency.
vi.mock('@openpeepshq/react-ui', () => {
  const passthrough =
    (tag: string) =>
    ({ children }: { children?: ReactNode }) =>
      createElement(tag, null, children);
  return {
    Dialog: ({
      open,
      children,
    }: {
      open: boolean;
      onOpenChange?: (open: boolean) => void;
      children?: ReactNode;
    }) =>
      open
        ? createElement('div', { 'data-testid': 'voice-dialog' }, children)
        : null,
    DialogContent: passthrough('div'),
    DialogHeader: passthrough('div'),
    DialogTitle: passthrough('h2'),
    DialogDescription: passthrough('p'),
    Button: ({
      action,
      title,
      children,
      'data-testid': testId,
    }: {
      action?: () => void;
      title?: string;
      children?: ReactNode;
      'data-testid'?: string;
    }) =>
      createElement(
        'button',
        { type: 'button', title, 'data-testid': testId, onClick: action },
        children,
      ),
  };
});

const uploadMock = vi.fn();

let urlCounter = 0;

const imageFile = (name: string) =>
  new File([new Uint8Array(16)], name, { type: 'image/png' });

const Harness = ({
  multipleAudio,
  onChange,
}: {
  multipleAudio?: boolean;
  onChange: (attachments: MediaAttachmentData[]) => void;
}) => {
  const api = useComposeAttachments({
    attachments: [],
    onChange,
    multipleAudio,
  });
  return createElement('div', null, api.previews, api.inputs);
};

const pickFiles = (container: HTMLElement, files: File[]): Promise<void> =>
  act(async () => {
    const input = container.querySelector('input[accept^="image"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('image input not found');
    }
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe('useComposeAttachments pickers', () => {
  let container: HTMLElement;
  let root: Root | undefined;

  const render = (props: {
    multipleAudio?: boolean;
  }): { onChange: ReturnType<typeof vi.fn> } => {
    const onChange = vi.fn();
    const r = createRoot(container);
    root = r;
    act(() => {
      r.render(createElement(Harness, { ...props, onChange }));
    });
    return { onChange };
  };

  const inputs = () => ({
    image: container.querySelector(
      'input[accept^="image"]',
    ) as HTMLInputElement,
    audio: container.querySelector(
      'input[accept^="audio"]',
    ) as HTMLInputElement,
  });

  beforeEach(() => {
    useMediaUpload.mockReset();
    useMediaUpload.mockReturnValue({
      state: { uploading: false, uploadPercent: 0 },
      upload: uploadMock,
      abort: vi.fn(),
    });
    uploadMock.mockReset();
    uploadMock.mockImplementation(
      async ({ description }: { description?: string }) => {
        urlCounter += 1;
        return {
          id: `attachment-${urlCounter}`,
          type: 'image',
          url: `https://cdn.example.com/images/${urlCounter}.webp`,
          previewUrl: null,
          textUrl: null,
          filename: description ?? 'image',
          meta: { usage: 'post-image', mimetype: 'image/webp', size: 16 },
          status: 'ready',
        };
      },
    );
    urlCounter = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL(): string {
          urlCounter += 1;
          return `blob:mock-${urlCounter}`;
        }
        static revokeObjectURL(): void {}
      },
    );
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('keeps the image picker single-file so every pick gets the crop dialog', () => {
    render({ multipleAudio: false });
    const { image, audio } = inputs();
    expect(image.multiple).toBe(false);
    expect(audio.multiple).toBe(false);
  });

  it('routes a single image pick through the crop modal', async () => {
    render({ multipleAudio: false });
    await pickFiles(container, [imageFile('one.png')]);
    expect(
      container.querySelector('[data-testid="crop-modal"]'),
    ).not.toBeNull();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('ignores extra files from a multi-select and crops the first', async () => {
    // Guard against a regression if someone re-adds `multiple` to the image
    // input: through the UI this input never allows a multi-select (#1789).
    render({ multipleAudio: false });
    await pickFiles(container, [imageFile('one.png'), imageFile('two.png')]);
    expect(
      container.querySelector('[data-testid="crop-modal"]'),
    ).not.toBeNull();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('exposes openVoiceRecorder on the hook api', () => {
    const exposed: Record<string, unknown> = {};
    const ApiProbe = () => {
      const api = useComposeAttachments({
        attachments: [],
        onChange: () => undefined,
      });
      exposed.openVoiceRecorder = api.openVoiceRecorder;
      return null;
    };
    const r = createRoot(container);
    root = r;
    act(() => {
      r.render(createElement(ApiProbe));
    });
    expect(typeof exposed.openVoiceRecorder).toBe('function');
  });

  it('renders the mic button in the shared toolbar', () => {
    const r = createRoot(container);
    root = r;
    act(() => {
      r.render(
        createElement(ComposeAttachments, {
          attachments: [],
          onChange: () => undefined,
        }),
      );
    });
    const mic = container.querySelector('button[title="Record voice note"]');
    expect(mic).not.toBeNull();
  });
});
