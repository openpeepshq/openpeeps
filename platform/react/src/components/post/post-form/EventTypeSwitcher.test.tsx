/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultRoles } from '@openpeepshq/common';
import type { Role } from '@openpeepshq/common/types';
import { EventTypeSwitcher } from './EventTypeSwitcher';

// The gate predicates (`canAnnouncePosts` / `isCommunityWideVisibility`) are
// the real implementations from `@openpeepshq/common`, driven by the real
// `defaultRoles` fixtures (the role surface already used by
// capabilitiesHelpers.test). This pins the component gate against the actual
// capability semantics, so a renamed `core-posts-announce` capability or a
// third community-wide visibility surfaces here instead of hiding behind a
// stub.
const state = vi.hoisted(() => ({ roles: [] as Role[] }));
const roles = (key: string): Role[] =>
  defaultRoles.filter((role) => role.key === key) as Role[];

vi.mock('@openpeepshq/react-ui', () => ({
  Input: (props: Record<string, unknown>) => createElement('input', props),
  Label: ({ children, title }: { children?: ReactNode; title?: string }) =>
    createElement('label', { 'data-label': title }, title, children),
}));

vi.mock('lucide-react', () => ({
  Link: () => createElement('LinkIcon'),
  MapPin: () => createElement('MapPinIcon'),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../../hooks/events/useEventTypeSwitcher', () => ({
  useEventTypeSwitcher: () => ({
    eventFormat: 'jam',
    formats: [{ value: 'jam', label: 'Jam' }],
    livekitEnabled: true,
    switchFormat: () => undefined,
    moderatorProfiles: [],
    setModerators: () => undefined,
    setWaitingRoom: () => undefined,
    setNotifyEveryone: () => undefined,
    setUrl: () => undefined,
    setPhysicalLocation: () => undefined,
  }),
}));

vi.mock('../../layout/IdentityContext', () => ({
  useAuthData: () => ({ profile: { roles: state.roles } }),
}));

vi.mock('../../profile', () => ({
  ProfilesInput: () => createElement('ProfilesInput'),
}));

const event = { type: 'event', name: 'Standup', jam: {} } as never;

describe('EventTypeSwitcher community jam broadcast opt-in', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.roles = [];
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

  const render = (visibility?: string) => {
    act(() => {
      root?.render(
        createElement(EventTypeSwitcher, {
          event,
          onChange: () => undefined,
          visibility,
        }),
      );
    });
  };

  // The opt-in checkbox sits inside the <label> whose text is the
  // `jamNotifyEveryone` copy; the waiting-room checkbox uses different copy.
  const notifyCheckbox = () =>
    container &&
    [...container.querySelectorAll('label')]
      .find((label) =>
        (label.textContent ?? '').includes(
          'Notify everyone when the jam starts',
        ),
      )
      ?.querySelector('input[type="checkbox"]');

  it('shows the opt-in for a public jam when the role can announce posts', () => {
    state.roles = roles('moderator');
    render('public');
    expect(notifyCheckbox()).toBeTruthy();
  });

  it('hides the opt-in for a group jam even with the announce role', () => {
    state.roles = roles('moderator');
    render('group');
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('hides the opt-in for a direct jam even with the announce role', () => {
    state.roles = roles('moderator');
    render('direct');
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('hides the opt-in for a public jam without the announce role', () => {
    state.roles = roles('member');
    render('public');
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('shows the opt-in for a local jam with the announce role', () => {
    state.roles = roles('admin');
    render('local');
    expect(notifyCheckbox()).toBeTruthy();
  });

  it('hides the opt-in when no visibility is supplied', () => {
    state.roles = roles('moderator');
    render(undefined);
    expect(notifyCheckbox()).toBeFalsy();
  });
});
