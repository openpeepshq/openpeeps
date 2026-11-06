/** @vitest-environment jsdom */
import { act, createElement, type ChangeEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostCreationData } from '@openpeepshq/common/types';
import { NewPostModal } from './NewPostModal';

const storeState = vi.hoisted(
  (): {
    note: PostCreationData;
    question: PostCreationData;
  } => ({
    note: {
      type: 'note',
      visibility: 'public',
      data: { type: 'note', content: '' },
      mentions: [],
    },
    question: {
      type: 'question',
      visibility: 'public',
      data: {
        type: 'question',
        content: 'Saved poll question',
        options: [
          { type: 'note', content: 'Saved option' },
          { type: 'note', content: '' },
        ],
      },
      mentions: [],
    },
  }),
);

vi.mock('../../../stores/newPosts', () => ({
  useNewPostStores: () => ({
    get note() {
      return storeState.note;
    },
    set note(v: PostCreationData) {
      storeState.note = v;
    },
    get question() {
      return storeState.question;
    },
    set question(v: PostCreationData) {
      storeState.question = v;
    },
  }),
  defaultNewNote: () => ({
    type: 'note',
    visibility: 'public',
    data: { type: 'note', content: '' },
    mentions: [],
  }),
  defaultNewQuestion: () => ({
    type: 'question',
    visibility: 'public',
    data: {
      type: 'question',
      content: '',
      options: [
        { type: 'note', content: '' },
        { type: 'note', content: '' },
      ],
    },
    mentions: [],
  }),
}));

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

vi.mock('../../server-data', () => ({
  useServerInfo: () => ({ data: { publicContent: true } }),
}));

vi.mock('../visibility', () => ({
  useDefaultVisibility: () => 'public',
}));

vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'me', displayName: 'Me', handle: 'me' }),
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
      'data-testid': props.testId,
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

vi.mock('./PostAudienceSelector', () => ({
  PostAudienceSelector: () => null,
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

vi.mock('../../profile', () => ({
  Avatar: () => null,
  ProfileBadge: () => null,
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

const setNativeValue = (field: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('NewPostModal composer type switch', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const render = () => {
    act(() => {
      root?.render(
        createElement(NewPostModal, {
          onClose: () => undefined,
          onToast: () => undefined,
        }),
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
    storeState.note = {
      type: 'note',
      visibility: 'public',
      data: { type: 'note', content: '' },
      mentions: [],
    };
    storeState.question = {
      type: 'question',
      visibility: 'public',
      data: {
        type: 'question',
        content: 'Saved poll question',
        options: [
          { type: 'note', content: 'Saved option' },
          { type: 'note', content: '' },
        ],
      },
      mentions: [],
    };
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

  it('keeps typed note text when switching to poll with a stored question draft', () => {
    render();
    typeText('[TEST] text typed before adding poll');
    switchType();
    expect(switcher()?.dataset.type).toBe('question');
    expect(contentField()?.value).toBe('[TEST] text typed before adding poll');
  });

  it('keeps typed note text when switching to poll without a stored question draft', () => {
    storeState.question.data = {
      type: 'question',
      content: '',
      options: [
        { type: 'note', content: '' },
        { type: 'note', content: '' },
      ],
    };
    render();
    typeText('[TEST] text typed before adding poll');
    switchType();
    expect(switcher()?.dataset.type).toBe('question');
    expect(contentField()?.value).toBe('[TEST] text typed before adding poll');
  });

  it('restores the stored poll question when switching with an empty composer', () => {
    render();
    switchType();
    expect(switcher()?.dataset.type).toBe('question');
    expect(contentField()?.value).toBe('Saved poll question');
  });
});
