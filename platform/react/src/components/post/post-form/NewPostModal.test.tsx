/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MediaAttachmentData,
  PostCreationData,
} from '@openpeepshq/common';
import { NewPostModal } from './NewPostModal';

const { postStores, createPost } = vi.hoisted(() => ({
  postStores: {
    note: {
      visibility: 'public',
      type: 'note',
      data: { type: 'note', content: '' },
      mentions: [],
    } as PostCreationData,
    question: {
      visibility: 'public',
      type: 'question',
      data: {
        type: 'question',
        content: '',
        options: [
          { type: 'note', content: '' },
          { type: 'note', content: '' },
        ],
      },
      mentions: [],
    } as PostCreationData,
    jam: {},
    event: {},
    article: {},
    resource: {},
    resetNewNoteState: vi.fn(),
    resetNewQuestionState: vi.fn(),
  },
  createPost: vi.fn(async (_payload: PostCreationData) => ({
    id: 'post-1',
  })),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      createPostAction: () => createPost,
      admin: { announcePostAction: () => vi.fn() },
      joinGroupAction: () => vi.fn(),
      useSearchProfiles: () => ({ data: undefined }),
    },
  }),
}));

vi.mock('../../server-data', () => ({
  useServerInfo: () => ({ publicContent: true }),
}));

vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({
    id: 'me',
    handle: 'me',
    displayName: 'Me',
    roles: ['member'],
    memberships: [],
  }),
}));

vi.mock('../../../stores/newPosts', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useNewPostStores: () => postStores };
});

vi.mock('./ComposeAttachments', () => ({
  useComposeAttachments: () => ({
    pending: false,
    previews: null,
    inputs: null,
    openImagePicker: () => undefined,
    openAudioPicker: () => undefined,
    openDocumentPicker: () => undefined,
  }),
}));

vi.mock('./ComposePreviewLinks', () => ({
  ComposePreviewLinks: () => null,
}));

vi.mock('./PollComposerFields', () => ({
  PollComposerFields: () => null,
  pollOptionLabel: (index: number, _t: unknown) => `Option ${index + 1}`,
}));

vi.mock('./PostAudienceSelector', () => ({
  PostAudienceSelector: () => null,
}));

vi.mock('./PostTypeSwitcher', () => ({
  PostTypeSwitcher: () => null,
}));

vi.mock('../../profile', () => ({
  Avatar: () => null,
  ProfileBadge: () => null,
  ProfileCard: () => null,
}));

vi.mock('../../markdown', () => ({
  OpenpeepsMarkdown: () => null,
}));

const imageAttachment: MediaAttachmentData = {
  type: 'image',
  url: 'https://cdn.example.com/image.png',
  previewUrl: null,
  textUrl: null,
  filename: 'image.png',
  meta: {},
};

const setNoteDraft = (content: string, attachments?: MediaAttachmentData[]) => {
  postStores.note = {
    visibility: 'public',
    type: 'note',
    data: {
      type: 'note',
      content,
      attachments: attachments?.length ? attachments : undefined,
    },
    mentions: [],
  };
};

describe('NewPostModal submit gating', () => {
  let container: HTMLElement;
  let root: Root | undefined;

  const publishButton = () =>
    document.querySelector<HTMLButtonElement>(
      '[data-testid="posts-composer-publish"]',
    );

  const render = () => {
    const r = createRoot(container);
    root = r;
    act(() => {
      r.render(
        createElement(NewPostModal, {
          onClose: () => undefined,
          onToast: () => undefined,
        }),
      );
    });
  };

  beforeEach(() => {
    createPost.mockClear();
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = undefined;
  });

  it('enables posting an attachment-only note', () => {
    setNoteDraft('', [imageAttachment]);
    render();
    expect(publishButton()?.disabled).toBe(false);
  });

  it('blocks an empty note without attachments', () => {
    setNoteDraft('');
    render();
    expect(publishButton()?.disabled).toBe(true);
  });

  it('blocks over-limit visible text even with an attachment', () => {
    setNoteDraft('x'.repeat(501), [imageAttachment]);
    render();
    expect(publishButton()?.disabled).toBe(true);
  });

  it('enables a long link whose visible text fits the budget', () => {
    setNoteDraft('[see](https://example.com/' + 'y'.repeat(490) + ')');
    render();
    expect(publishButton()?.disabled).toBe(false);
  });

  it('posts the attachment-only note on submit', async () => {
    setNoteDraft('', [imageAttachment]);
    render();
    const button = publishButton();
    expect(button?.disabled).toBe(false);
    await act(async () => {
      button?.click();
    });
    expect(createPost).toHaveBeenCalledTimes(1);
    const payload = createPost.mock.calls[0]?.[0];
    expect(payload?.data.type).toBe('note');
    if (payload?.data.type === 'note') {
      expect(payload.data.attachments).toHaveLength(1);
    }
  });
});
