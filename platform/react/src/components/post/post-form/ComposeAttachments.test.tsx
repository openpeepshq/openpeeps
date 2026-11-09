/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAttachmentData } from '@openpeepshq/common';
import { useComposeAttachments } from './ComposeAttachments';

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
    render({ multipleAudio: false });
    await pickFiles(container, [imageFile('one.png'), imageFile('two.png')]);
    expect(
      container.querySelector('[data-testid="crop-modal"]'),
    ).not.toBeNull();
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
