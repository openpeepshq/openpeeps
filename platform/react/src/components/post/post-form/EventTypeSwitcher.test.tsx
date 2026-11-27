/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultRoles } from '@openpeepshq/common';
import type { Role } from '@openpeepshq/common/types';
import {
  authDataState,
  makeAuthDataValue,
} from '../../../test/support/mockAuth';
import { EventTypeSwitcher } from './EventTypeSwitcher';

// The gate predicates (`canAnnouncePosts` / `isCommunityWideVisibility`) are
// the real implementations from `@openpeepshq/common`, driven by the real
// `defaultRoles` fixtures (the role surface already used by
// capabilitiesHelpers.test). This pins the component gate against the actual
// capability semantics, so a renamed `core-posts-announce` capability or a
// third community-wide visibility surfaces here instead of hiding behind a
// stub. The `useAuthData` value comes from the shared test/support factory —
// the same mock surface the RN parity test uses against the re-export in
// `@openpeepshq/react`.
const roles = (key: string): Role[] =>
  defaultRoles.filter((role) => role.key === key) as Role[];

// The component renders two `ProfilesInput`s (co-organizers + jam
// moderators); the mock records each call's props so tests can assert the
// co-organizer picker is wired with the hydrated profiles + the federated
// filter, and that it reports edits back through `setCoOrganizers`.
const { pickerProps, coOrganizerChange } = vi.hoisted(() => ({
  pickerProps: [] as Array<Record<string, unknown>>,
  coOrganizerChange: [] as Array<unknown[]>,
}));

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
    coOrganizerProfiles: [],
    setCoOrganizers: (profiles: unknown) => {
      coOrganizerChange.push(profiles as unknown[]);
    },
    setWaitingRoom: () => undefined,
    setNotifyEveryone: () => undefined,
    setUrl: () => undefined,
    setPhysicalLocation: () => undefined,
  }),
}));

vi.mock('../../layout/IdentityContext', () => ({
  useAuthData: makeAuthDataValue,
}));

vi.mock('../../profile', () => ({
  ProfilesInput: (props: Record<string, unknown>) => {
    pickerProps.push(props);
    return createElement('ProfilesInput');
  },
}));

const event = { type: 'event', name: 'Standup', jam: {} } as never;

describe('EventTypeSwitcher community jam broadcast opt-in', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    authDataState.roles = [];
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
    authDataState.roles = roles('moderator');
    render('public');
    expect(notifyCheckbox()).toBeTruthy();
  });

  it('hides the opt-in for a group jam even with the announce role', () => {
    authDataState.roles = roles('moderator');
    render('group');
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('hides the opt-in for a direct jam even with the announce role', () => {
    authDataState.roles = roles('moderator');
    render('direct');
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('hides the opt-in for a public jam without the announce role', () => {
    authDataState.roles = roles('member');
    render('public');
    expect(notifyCheckbox()).toBeFalsy();
  });

  it('shows the opt-in for a local jam with the announce role', () => {
    authDataState.roles = roles('admin');
    render('local');
    expect(notifyCheckbox()).toBeTruthy();
  });

  it('hides the opt-in when no visibility is supplied', () => {
    authDataState.roles = roles('moderator');
    render(undefined);
    expect(notifyCheckbox()).toBeFalsy();
  });
});

describe('EventTypeSwitcher co-organizer picker', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    pickerProps.length = 0;
    coOrganizerChange.length = 0;
    authDataState.roles = [];
    authDataState.profileId = 'u-1';
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
      root?.render(
        createElement(EventTypeSwitcher, {
          event,
          onChange: () => undefined,
          visibility: 'public',
        }),
      );
    });
  };

  // The co-organizer picker is the `ProfilesInput` that takes a `filter`
  // (federated profiles can't act); the jam-moderator picker does not.
  const coOrganizerPicker = () =>
    pickerProps.find((props) => typeof props.filter === 'function');

  it('renders the co-organizer picker for every event format', () => {
    render();
    expect(coOrganizerPicker()).toBeTruthy();
  });

  it('wires the hydrated profiles as the picker value', () => {
    render();
    expect(coOrganizerPicker()?.value).toEqual([]);
  });

  it('excludes federated profiles from the candidate list', () => {
    render();
    const filter = coOrganizerPicker()?.filter as
      | ((profile: { type: string }) => boolean)
      | undefined;
    expect(typeof filter).toBe('function');
    expect(filter?.({ type: 'local' })).toBe(true);
    expect(filter?.({ type: 'federated' })).toBe(false);
  });

  it('reports picker edits back through setCoOrganizers', () => {
    render();
    const onChange = coOrganizerPicker()?.onChange as
      | ((profiles: unknown[]) => void)
      | undefined;
    expect(typeof onChange).toBe('function');
    onChange?.([{ id: '111', handle: 'peep' }]);
    expect(coOrganizerChange).toEqual([[{ id: '111', handle: 'peep' }]]);
  });

  it('excludes the signed-in profile from the picker (banlist)', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-create'] } }];
    render();
    const banlist = coOrganizerPicker()?.banlist as
      | Array<{ id?: string } | string>
      | undefined;
    expect(Array.isArray(banlist)).toBe(true);
    // The picker must hide the caller — the server already skips it, and a
    // picker that offered it would 422 on submit.
    const ids = (banlist ?? []).map((b) =>
      typeof b === 'string' ? b : b.id,
    );
    expect(ids).toContain('u-1');
  });

  it('leaves the banlist empty when signed out', () => {
    authDataState.roles = [];
    render();
    const banlist = coOrganizerPicker()?.banlist as unknown[] | undefined;
    expect(banlist).toEqual([]);
  });
});
