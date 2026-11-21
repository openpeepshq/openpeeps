/** @vitest-environment jsdom */
/**
 * Community-jam "notify everyone" opt-in in the dedicated jam-creation modal
 * (issue #1621, round-13 review suggestion 1): the web `CreateNewJam` modal —
 * the primary jam-creation screen besides the generic event-post composer —
 * must offer the same broadcast opt-in `EventTypeSwitcher` already offers.
 *
 * The real `useCreateNewJamForm` hook runs, including the real
 * `canAnnouncePosts` / `isCommunityWideVisibility` gates from
 * `@openpeepshq/common`, the real `eventSanitizer`, and the real persisted
 * jam store (reset before each case). Only the surrounding app environment
 * (API, router, auth, server info, dialog chrome) is stubbed, and the
 * audience selector stub captures `onConfirm` so visibility switches go
 * through the hook's real `applyAudience` path.
 */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostCreationData } from '@openpeepshq/common/types';
import { authDataState, makeAuthDataValue } from '../../test/support/mockAuth';
import { getNewPostStores } from '../../stores';
import { CreateNewJamModal } from './CreateNewJam';

vi.mock('@openpeepshq/react-ui', () => ({
  Button: ({
    children,
    variant,
    disabled,
    action,
  }: {
    children?: ReactNode;
    variant?: string;
    disabled?: boolean;
    action?: () => void;
  }) =>
    createElement(
      'button',
      {
        'data-testid': 'dialog-button',
        'data-variant': variant,
        disabled,
        onClick: action,
      },
      children,
    ),
  Dialog: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'dialog' }, children),
  DialogContent: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => createElement('div', { className }, children),
  DialogFooter: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'dialog-footer' }, children),
  DialogHeader: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
  DialogTitle: ({ children }: { children?: ReactNode }) =>
    createElement('h2', null, children),
  Input: (props: Record<string, unknown>) => createElement('input', props),
  Label: ({ children }: { children?: ReactNode }) =>
    createElement('label', null, children),
}));

vi.mock('lucide-react', () => ({
  Eye: () => createElement('EyeIcon'),
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string) => key,
}));

// The hook imports `useT` from the context module directly (the component
// uses the `../../i18n` barrel), so both module identities need the mock.
vi.mock('../../i18n/context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('../../contexts/router', () => ({
  useNavigate: () => () => undefined,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      createPostAction: () => () => Promise.resolve({ id: 'created-post-id' }),
      useProfiles: () => ({ data: [] }),
    },
  }),
}));

vi.mock('../../components/layout/IdentityContext', () => ({
  useAuthData: makeAuthDataValue,
  useCurrentProfile: () => undefined,
}));

vi.mock('../../components/server-data', () => ({
  useServerInfo: () => ({ publicContent: false }),
}));

vi.mock('../profile', () => ({
  Avatar: () => createElement('Avatar'),
  ProfilesInput: () =>
    createElement('div', { 'data-testid': 'profiles-input' }),
}));

// Captures `onConfirm` so the test drives visibility switches through the
// hook's real `applyAudience` (→ `applyAudienceSetting`) path.
let audienceSelectorOnConfirm:
  | ((settings: {
      visibility: string;
      groupId?: string;
      audience?: unknown[];
    }) => void)
  | undefined;

vi.mock('../post/post-form/PostAudienceSelector', () => ({
  PostAudienceSelector: ({
    onConfirm,
  }: {
    onConfirm?: typeof audienceSelectorOnConfirm;
  }) => {
    audienceSelectorOnConfirm = onConfirm;
    return createElement('div', { 'data-testid': 'audience-selector' });
  },
}));

describe('CreateNewJamModal community jam broadcast opt-in', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    authDataState.roles = [];
    audienceSelectorOnConfirm = undefined;
    getNewPostStores().resetNewJamState();
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

  const render = () => {
    act(() => {
      root?.render(createElement(CreateNewJamModal, { onClose: () => {} }));
    });
  };

  const setDraft = (patch: Partial<PostCreationData>) => {
    const stores = getNewPostStores();
    stores.jam = { ...stores.jam, ...patch };
  };

  // Switch the draft's audience the same way the UI does: through the
  // captured selector `onConfirm` → the hook's `applyAudience`.
  const switchAudience = (settings: {
    visibility: string;
    groupId?: string;
    audience?: unknown[];
  }) => {
    act(() => {
      audienceSelectorOnConfirm?.(settings);
    });
  };

  // The modal labels render the locale keys as text (the `t` mock returns
  // the key), so the opt-in checkbox is the one inside the label whose text
  // is the `jamNotifyEveryone` key.
  const notifyCheckbox = () =>
    container &&
    [...container.querySelectorAll('label')]
      .find((label) =>
        (label.textContent ?? '').includes('events.form.jamNotifyEveryone'),
      )
      ?.querySelector('input[type="checkbox"]');

  it('shows the opt-in for a community-wide jam when the role can announce posts', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    render();
    expect(notifyCheckbox()).toBeTruthy();
  });

  it('hides the opt-in for a group jam even with the announce role', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    render();
    switchAudience({ visibility: 'group', groupId: 'group-1' });
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('hides the opt-in for a public jam without the announce role', () => {
    setDraft({ visibility: 'public' });
    render();
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('shows the opt-in again once the audience switches back to community-wide', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    setDraft({
      visibility: 'group',
      groupId: 'group-1',
    });
    render();
    expect(notifyCheckbox()).toBeFalsy();

    switchAudience({ visibility: 'local' });
    expect(notifyCheckbox()).toBeTruthy();
  });

  it('persists the opt-in into the jam draft when toggled', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    render();
    const checkbox = notifyCheckbox() as HTMLInputElement;
    // Drive the exact React `onChange` the checkbox is wired to (via its fiber
    // props) rather than simulating a DOM change event, so the assertion
    // exercises the real `setNotifyEveryone` → `patchEvent` → store write path
    // without depending on jsdom/React value-tracker quirks.
    const reactPropsKey = Object.keys(checkbox).find((k) =>
      k.startsWith('__reactProps$'),
    );
    const reactProps =
      reactPropsKey &&
      (checkbox as unknown as Record<string, unknown>)[reactPropsKey];
    const onChange =
      reactProps && typeof reactProps === 'object'
        ? (reactProps as { onChange?: (e: unknown) => void }).onChange
        : undefined;
    expect(onChange).toBeTruthy();

    act(() => {
      onChange?.({ target: { checked: true } });
    });
    expect(
      (getNewPostStores().jam.data as { jam?: { notifyEveryone?: boolean } })
        .jam?.notifyEveryone,
    ).toBe(true);

    act(() => {
      onChange?.({ target: { checked: false } });
    });
    expect(
      (getNewPostStores().jam.data as { jam?: { notifyEveryone?: boolean } })
        .jam?.notifyEveryone,
    ).toBe(false);
  });
});
