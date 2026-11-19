/** @vitest-environment jsdom */
import { act, createElement, type ChangeEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostCreationData, PublicPost } from '@openpeepshq/common/types';
import { ReplyModal } from './ReplyModal';

// A single controllable store standing in for useReplyStore. The mock
// useSyncExternalStore subscription below makes set() trigger a re-render, so
// the component re-reads the latest draft just like the real store.
const replyStore = vi.hoisted(
  (): {
    draft: () => PostCreationData | null;
    setDraft: (next: PostCreationData | null) => void;
    set: (
      next: PostCreationData | ((prev: PostCreationData) => PostCreationData),
    ) => void;
    get: () => PostCreationData | null;
    subscribe: (listener: () => void) => () => void;
  } => {
    let value: PostCreationData | null = null;
    const listeners = new Set<() => void>();
    return {
      draft: () => value,
      setDraft: (next: PostCreationData | null) => {
        value = next;
      },
      set(next) {
        value =
          typeof next === 'function'
            ? (next as (p: PostCreationData) => PostCreationData)(value!)
            : next;
        listeners.forEach((l) => l());
      },
      get: () => value,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  },
);

const noteDraft = (content: string): PostCreationData => ({
  type: 'note',
  visibility: 'public',
  data: { type: 'note', content },
  inReplyToId: 'post-1',
  mentions: [],
});

vi.mock('../../../stores/newPosts', async () => {
  const React = await import('react');
  return {
    useReplyStore: () => {
      React.useSyncExternalStore(
        (cb: () => void) => replyStore.subscribe(cb),
        () => replyStore.get(),
        () => replyStore.get(),
      );
      return replyStore;
    },
    resetReplyData: () => undefined,
  };
});

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      createPostAction: () => () => undefined,
      admin: { announcePostAction: () => () => undefined },
      joinGroupAction: () => () => undefined,
    },
  }),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../layout/ToastProvider', () => ({
  useToast: () => ({ success: () => undefined, error: () => undefined }),
}));

vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'me', displayName: 'Me', handle: 'me' }),
}));

vi.mock('../CompactReplyParent', () => ({
  CompactReplyParent: () => null,
}));

vi.mock('../../profile', () => ({
  Avatar: () => null,
}));

vi.mock('./ComposeAttachments', () => ({
  useComposeAttachments: () => ({
    previews: null,
    inputs: null,
    pending: false,
    openImagePicker: () => undefined,
    openAudioPicker: () => undefined,
    openDocumentPicker: () => undefined,
  }),
}));

vi.mock('./ComposePreviewLinks', () => ({
  ComposePreviewLinks: () => null,
}));

vi.mock('./OpenpeepsMarkdownInput', () => ({
  OpenpeepsMarkdownInput: (props: {
    value?: string;
    onChange?: (value: string) => void;
    testId?: string;
    placeholder?: string;
  }) =>
    createElement('textarea', {
      'data-testid': props.testId ?? 'posts-composer-content',
      value: props.value,
      placeholder: props.placeholder,
      onChange: (e: ChangeEvent<HTMLTextAreaElement>) =>
        props.onChange?.(e.target.value),
    }),
}));

vi.mock('./PollComposerFields', () => ({
  PollComposerFields: () =>
    createElement('div', { 'data-testid': 'poll-fields' }),
  pollOptionLabel: (index: number) => `Option ${index + 1}`,
}));

vi.mock('./PostTypeSwitcher', () => ({
  PostTypeSwitcher: (props: {
    type: 'note' | 'question';
    onSelect: (type: 'note' | 'question') => void;
  }) =>
    createElement(
      'button',
      {
        'data-testid': 'type-switcher',
        'data-type': props.type,
        onClick: () =>
          props.onSelect(props.type === 'note' ? 'question' : 'note'),
      },
      'switch type',
    ),
}));

vi.mock('@openpeepshq/react-ui', () => {
  const passthrough =
    (tag: string) =>
    ({ children }: { children?: ReactNode }) =>
      createElement(tag, null, children);
  return {
    Button: ({
      action,
      children,
      disabled,
      'data-testid': testId,
    }: {
      action?: () => void;
      children?: ReactNode;
      disabled?: boolean;
      'data-testid'?: string;
    }) =>
      createElement(
        'button',
        { onClick: action, disabled, 'data-testid': testId },
        children,
      ),
    Dialog: passthrough('div'),
    DialogContent: passthrough('div'),
    DialogFooter: passthrough('div'),
    DialogHeader: passthrough('div'),
    DialogTitle: passthrough('div'),
  };
});

const post = {
  id: 'post-1',
  visibility: 'public',
  groupId: null,
  audience: null,
} as unknown as PublicPost;

const setNativeValue = (field: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('ReplyModal composer type switch', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const render = () => {
    act(() => {
      root?.render(
        createElement(ReplyModal, { post, onClose: () => undefined }),
      );
    });
  };

  const contentField = () =>
    container!.querySelector<HTMLTextAreaElement>(
      '[data-testid="posts-composer-content"]',
    );

  const switcher = () =>
    container!.querySelector<HTMLButtonElement>(
      '[data-testid="type-switcher"]',
    );

  const typeText = (value: string) => {
    act(() => {
      setNativeValue(contentField()!, value);
    });
  };

  const switchType = () => {
    act(() => {
      switcher()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    replyStore.setDraft(noteDraft(''));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    replyStore.setDraft(null);
  });

  it('keeps typed note text and turns it into the poll question', () => {
    render();
    typeText('[TEST] which time works best?');
    switchType();
    expect(switcher()?.dataset.type).toBe('question');
    expect(contentField()?.value).toBe('[TEST] which time works best?');
    const draft = replyStore.get();
    expect(draft?.data.type).toBe('question');
    if (draft?.data.type !== 'question') throw new Error('not a question');
    expect(draft.data.content).toBe('[TEST] which time works best?');
  });

  it('applies the 30-day default expiry when switching to poll', () => {
    render();
    typeText('pick one');
    switchType();
    const draft = replyStore.get();
    if (draft?.data.type !== 'question') throw new Error('not a question');
    const days =
      (new Date(draft.data.expiresAt ?? '').getTime() - Date.now()) /
      86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('drops note attachments when the draft becomes a poll', () => {
    replyStore.setDraft({
      ...noteDraft('with a photo'),
      data: {
        type: 'note',
        content: 'with a photo',
        attachments: [
          {
            type: 'image',
            url: 'https://example.com/image.png',
            previewUrl: null,
            textUrl: null,
            filename: 'image.png',
            meta: {},
          },
        ],
      },
    } as PostCreationData);
    render();
    expect(replyStore.get()?.data.type).toBe('note');
    switchType();
    const draft = replyStore.get();
    if (draft?.data.type !== 'question') throw new Error('not a question');
    expect(draft.data.content).toBe('with a photo');
    expect('attachments' in draft.data).toBe(false);
  });

  it('carries the poll question back into the note when switching back', () => {
    // Single-draft store: the poll->note direction overwrites the note text
    // with the current poll question. Deliberate and documented in the
    // helper; covered here so the round trip is explicit, not incidental.
    render();
    typeText('[TEST] which time works best?');
    switchType(); // note -> poll
    const afterPoll = replyStore.get();
    expect(afterPoll?.data.type).toBe('question');
    expect(contentField()?.value).toBe('[TEST] which time works best?');
    switchType(); // poll -> note
    const afterNote = replyStore.get();
    expect(afterNote?.data.type).toBe('note');
    if (afterNote?.data.type !== 'note') throw new Error('not a note');
    expect(afterNote.data.content).toBe('[TEST] which time works best?');
    expect(contentField()?.value).toBe('[TEST] which time works best?');
  });
});
