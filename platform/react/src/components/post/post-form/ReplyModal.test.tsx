/** @vitest-environment jsdom */
import { act, createElement, type ChangeEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { resetReplyData } from '../../../stores/newPosts';
import { ReplyModal } from './ReplyModal';

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      createPostAction: () => () => undefined,
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

vi.mock('./OpenpeepsMarkdownInput', () => ({
  OpenpeepsMarkdownInput: (props: {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
  }) =>
    createElement('textarea', {
      'data-testid': 'reply-content',
      value: props.value,
      placeholder: props.placeholder,
      onChange: (e: ChangeEvent<HTMLTextAreaElement>) =>
        props.onChange?.(e.target.value),
    }),
}));

vi.mock('./ComposePreviewLinks', () => ({
  ComposePreviewLinks: () => null,
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
      title,
      'data-testid': testId,
    }: {
      action?: () => void;
      children?: ReactNode;
      disabled?: boolean;
      title?: string;
      'data-testid'?: string;
    }) =>
      createElement(
        'button',
        { onClick: action, disabled, title, 'data-testid': testId },
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
  audience: [],
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
      '[data-testid="reply-content"]',
    );

  const switcher = () =>
    container!.querySelector<HTMLButtonElement>(
      '[data-testid="type-switcher"]',
    );

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    resetReplyData(post.id);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it('keeps typed reply text when switching to poll', () => {
    render();
    act(() => {
      setNativeValue(contentField()!, '[TEST] reply typed before adding poll');
    });
    act(() => {
      switcher()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(switcher()?.dataset.type).toBe('question');
    expect(contentField()?.value).toBe('[TEST] reply typed before adding poll');
  });

  it('keeps typed poll question when switching back to note', () => {
    render();
    act(() => {
      switcher()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      setNativeValue(contentField()!, '[TEST] poll question');
    });
    act(() => {
      switcher()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(switcher()?.dataset.type).toBe('note');
    expect(contentField()?.value).toBe('[TEST] poll question');
  });
});
