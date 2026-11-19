/** @vitest-environment jsdom */
import { act, createElement, type ChangeEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostCreationData } from '@openpeepshq/common/types';
import { NewPostModal } from './NewPostModal';

const { storeState, capturedPost, pollProps } = vi.hoisted(() => ({
  storeState: {
    note: {
      type: 'note',
      visibility: 'public',
      data: { type: 'note', content: '' },
      mentions: [],
    } as PostCreationData,
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
    } as PostCreationData,
  },
  capturedPost: { payload: undefined as PostCreationData | undefined },
  // Last props handed to PollComposerFields on render, so the round-trip test
  // can assert which poll fields the modal actually restored.
  pollProps: {
    options: undefined as string[] | undefined,
    expiresAt: undefined as string | undefined,
    multiple: undefined as boolean | undefined,
    votersVisible: undefined as boolean | undefined,
  },
}));

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
    resetNewQuestionState: () => undefined,
    resetNewNoteState: () => undefined,
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
      createPostAction: () => (payload: PostCreationData) => {
        capturedPost.payload = payload;
        return { id: 'post-1' };
      },
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
  useServerInfo: () => ({ publicContent: true }),
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
  PollComposerFields: (props: {
    options?: string[];
    expiresAt?: string;
    multiple?: boolean;
    votersVisible?: boolean;
  }) => {
    // Record the last rendered poll fields so tests can assert what the modal
    // restored (the real component renders these into inputs).
    pollProps.options = props.options;
    pollProps.expiresAt = props.expiresAt;
    pollProps.multiple = props.multiple;
    pollProps.votersVisible = props.votersVisible;
    return createElement('div', { 'data-testid': 'poll-fields' });
  },
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

  const mediaButton = () =>
    container!.querySelector<HTMLButtonElement>('[title="Add Media"]');

  const publishButton = () =>
    container!.querySelector<HTMLButtonElement>(
      '[data-testid="posts-composer-publish"]',
    );

  const publish = () => {
    act(() => {
      publishButton()!.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    capturedPost.payload = undefined;
    pollProps.options = undefined;
    pollProps.expiresAt = undefined;
    pollProps.multiple = undefined;
    pollProps.votersVisible = undefined;
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

  it('restores the stored note draft when switching back with an empty composer', () => {
    // Reverse of the empty-composer restore above: clear the poll text and
    // switch back to note, which must pick up draftContent('note') instead of
    // keeping the (now empty) poll question.
    render();
    switchType();
    expect(switcher()?.dataset.type).toBe('question');
    expect(contentField()?.value).toBe('Saved poll question');
    typeText('');
    storeState.note.data = { type: 'note', content: 'Stored note draft' };
    switchType();
    expect(switcher()?.dataset.type).toBe('note');
    expect(contentField()?.value).toBe('Stored note draft');
  });

  it('hides the media pickers in poll mode and shows them in note mode', () => {
    render();
    expect(mediaButton()).not.toBeNull();
    switchType();
    expect(switcher()?.dataset.type).toBe('question');
    expect(mediaButton()).toBeNull();
    switchType();
    expect(switcher()?.dataset.type).toBe('note');
    expect(mediaButton()).not.toBeNull();
  });

  it('never ships attachments on a submitted poll, even from a note draft that had some', () => {
    // NewPostModal.publish() builds its payload independently of the persisted
    // draft store (unlike ReplyModal, whose submit reads the store that
    // toQuestion already sanitized), so the poll payload path itself must
    // never carry a note's attachments onto the question.
    storeState.note = {
      type: 'note',
      visibility: 'public',
      data: {
        type: 'note',
        content: '',
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
      mentions: [],
    };
    render();
    typeText('[TEST] which time works best?');
    switchType(); // note -> poll
    expect(switcher()?.dataset.type).toBe('question');
    expect(contentField()?.value).toBe('[TEST] which time works best?');
    publish();
    expect(capturedPost.payload?.type).toBe('question');
    if (capturedPost.payload?.type !== 'question')
      throw new Error('not a question');
    expect('attachments' in capturedPost.payload.data).toBe(false);
  });

  it('submits a carried-over poll question from the new-post path', () => {
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
    switchType(); // note -> poll
    expect(switcher()?.dataset.type).toBe('question');
    publish();
    expect(capturedPost.payload?.type).toBe('question');
    if (capturedPost.payload?.type !== 'question')
      throw new Error('not a question');
    expect(capturedPost.payload.data.content).toBe(
      '[TEST] text typed before adding poll',
    );
    expect('attachments' in capturedPost.payload.data).toBe(false);
  });

  it('restores a populated poll draft (options + expiry + multiple) on the poll -> note -> poll round trip', () => {
    // Seed a stored poll draft with non-empty options, `multiple: true` and a
    // fixed expiry — the round trip (the whole reason the modal persists the
    // active draft) must restore those exact fields, not a fresh blank poll.
    storeState.question.data = {
      type: 'question',
      content: 'Which day works best?',
      options: [
        { type: 'note', content: 'Monday' },
        { type: 'note', content: 'Tuesday' },
      ],
      expiresAt: '2026-12-31T18:00:00.000Z',
      multiple: true,
    };
    render();
    switchType(); // note -> poll: carries the seed into the modal
    expect(switcher()?.dataset.type).toBe('question');
    // Poll fields initialize from the seed on mount.
    expect(pollProps.options).toEqual(['Monday', 'Tuesday']);
    expect(pollProps.multiple).toBe(true);

    // The `datetime-local` value the modal renders for the stored ISO, computed
    // the same way `toDatetimeLocal` does (local wall time) so the assertion is
    // timezone-independent.
    const seededLocal = (() => {
      const d = new Date('2026-12-31T18:00:00.000Z');
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate(),
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    })();
    expect(pollProps.expiresAt).toBe(seededLocal);

    // Switch to note, type new text, then back to poll. The note mode persists
    // nothing about the poll, so the poll draft must still be the seeded one.
    typeText('changed the note body');
    switchType(); // poll -> note
    expect(switcher()?.dataset.type).toBe('note');
    expect(contentField()?.value).toBe('changed the note body');
    switchType(); // note -> poll
    expect(switcher()?.dataset.type).toBe('question');
    // The rendered poll fields come back from the populated stash.
    expect(pollProps.options).toEqual(['Monday', 'Tuesday']);
    expect(pollProps.multiple).toBe(true);
    expect(pollProps.expiresAt).toBe(seededLocal);
    // And the *persisted* store still holds the populated draft (what a fresh
    // mount rehydrates).
    expect(storeState.question.data.type).toBe('question');
    if (storeState.question.data.type !== 'question') throw new Error('q');
    expect(storeState.question.data.options.map((o) => o.content)).toEqual([
      'Monday',
      'Tuesday',
    ]);
    expect(storeState.question.data.multiple).toBe(true);
    expect(storeState.question.data.expiresAt).toBe('2026-12-31T18:00:00.000Z');
  });

  it('never carries a questionDraft into a submitted note payload after poll -> note', () => {
    // Symmetric to the attachments-on-poll test above: when the composer
    // switches poll -> note and then publishes as a note, the submitted
    // payload must be a plain note with no `questionDraft` key leaking through
    // (the modal builds the payload from local state, which has no such field).
    storeState.question.data = {
      type: 'question',
      content: 'Which day works best?',
      options: [
        { type: 'note', content: 'Monday' },
        { type: 'note', content: 'Tuesday' },
      ],
      multiple: true,
    };
    render();
    switchType(); // note -> poll
    expect(switcher()?.dataset.type).toBe('question');
    switchType(); // poll -> note
    expect(switcher()?.dataset.type).toBe('note');
    typeText('final note body');
    publish();
    expect(capturedPost.payload?.type).toBe('note');
    if (capturedPost.payload?.type !== 'note') throw new Error('not a note');
    expect(capturedPost.payload.data.content).toBe('final note body');
    // The poll stash must not leak onto the submitted note in any shape.
    expect(
      'questionDraft' in capturedPost.payload ||
        'questionDraft' in capturedPost.payload.data,
    ).toBe(false);
  });
});
