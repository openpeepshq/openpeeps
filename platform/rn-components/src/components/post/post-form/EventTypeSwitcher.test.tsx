/**
 * RN parity for the community-jam "notify everyone" opt-in (issue #1621): the
 * native event form must render the opt-in checkbox only when the profile can
 * announce posts (`core-posts-announce`) AND the post visibility is
 * community-wide, mirroring
 * platform/react/src/components/post/post-form/EventTypeSwitcher.tsx.
 *
 * react-native, the UI primitives and the shared `@openpeepshq/react` hooks are
 * stubbed; the two gate predicates come from `@openpeepshq/common` with the
 * exact semantics of `canAnnouncePosts` / `isCommunityWideVisibility`, fed by
 * `state`, so the test pins the gate without depending on the workspace
 * symlink target carrying the role surface.
 *
 * Unlike counting `Checkbox` renders, the tests identify each checkbox by the
 * handler its `onCheckedChange` is wired to. The `@openpeepshq/react` mock
 * mirrors the real `useEventTypeSwitcher` contract: `setWaitingRoom` /
 * `setNotifyEveryone` each spread `event` and write the matching `jam` field,
 * then call the component's `onChange`. So the notify checkbox is recognized by
 * `onCheckedChange === setNotifyEveryone` (not by a render count that the
 * always-present waiting-room checkbox would inflate), and firing it is asserted
 * to drive `onChange` with `jam.notifyEveryone: true`.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Shared `useAuthData` mock surface (same module the web parity test drives
// against `IdentityContext`), so the profile the tree sees is identical on
// both platforms.
const {
  authDataState,
  makeAuthDataValue,
} = require('../../../../../react/src/test/support/mockAuth');

type CheckboxProps = {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (value: boolean) => void;
};

// Every Checkbox the tree renders, in order, with the props it was handed.
let checkboxes: CheckboxProps[] = [];
// Every ProfilesInput the tree renders, in order, with the props it was handed.
let pickerProps: Record<string, unknown>[] = [];
// Handler identities handed to the component this render, used to tell the
// notify checkbox apart from the always-present waiting-room checkbox.
let setWaitingRoom: ((value: boolean) => void) | undefined;
let setNotifyEveryone: ((value: boolean) => void) | undefined;

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  Pressable: (props: { children?: unknown }) =>
    React.createElement('Pressable', null, props.children),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mirrored from platform/common/src/lib — the package entry the test would
// otherwise load through the workspace symlink may not carry the role surface.
jest.mock('@openpeepshq/common', () => ({
  canAnnouncePosts: (roles: { capabilities?: { add?: string[] } }[] = []) =>
    roles.some((r) =>
      (r.capabilities?.add ?? []).includes('core-posts-announce')
    ),
  isCommunityWideVisibility: (visibility?: string) =>
    visibility === 'public' || visibility === 'local',
}));

jest.mock('@openpeepshq/react', () => ({
  useAuthData: makeAuthDataValue,
  // Same profile the tree sees via `useAuthData`, so the picker self-exclusion
  // (banlist) the test asserts is the identity the component reads.
  useCurrentProfile: () => makeAuthDataValue().profile,
  useEventTypeSwitcher: (args: {
    event: { jam?: Record<string, unknown> };
    onChange: (event: unknown) => void;
  }) => {
    // Mirror the real hook (platform/react useEventTypeSwitcher): both setters
    // spread the current event, write their jam field, and call onChange.
    setWaitingRoom = (value: boolean) =>
      args.onChange({
        ...args.event,
        jam: { ...args.event.jam, waitingRoom: value },
      });
    setNotifyEveryone = (value: boolean) =>
      args.onChange({
        ...args.event,
        jam: { ...args.event.jam, notifyEveryone: value },
      });
    return {
      eventFormat: 'jam',
      formats: [{ value: 'jam', label: 'events.form.jamFormat' }],
      livekitEnabled: true,
      switchFormat: () => undefined,
      moderatorProfiles: [],
      setModerators: () => undefined,
      coOrganizerProfiles: [],
      setCoOrganizers: (profiles: unknown[]) =>
        args.onChange({ ...args.event, coOrganizers: profiles }),
      setWaitingRoom,
      setNotifyEveryone,
      setUrl: () => undefined,
      setPhysicalLocation: () => undefined,
    };
  },
  useLocationSearch: () => ({
    text: '',
    setText: () => undefined,
    suggestions: [],
    clearSuggestions: () => undefined,
    search: () => undefined,
  }),
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: (props: CheckboxProps) => {
    checkboxes.push(props);
    return React.createElement('Checkbox', props);
  },
}));
jest.mock('../../ui/input', () => ({
  Input: () => React.createElement('Input'),
}));
jest.mock('../../ui/label', () => ({
  Label: ({ children }: { children?: unknown }) =>
    React.createElement('Label', null, children),
}));
jest.mock('../../ui/radio-group', () => ({
  RadioGroup: ({ children }: { children?: unknown }) =>
    React.createElement('RadioGroup', null, children),
  RadioGroupItem: (props: Record<string, unknown>) =>
    React.createElement('RadioGroupItem', props),
}));
jest.mock('../../ui/themed-text', () => ({
  ThemedText: ({ children }: { children?: unknown }) =>
    React.createElement('ThemedText', null, children),
}));
jest.mock('../../../lib/constants', () => ({ BASE_URL: 'http://localhost' }));
jest.mock('../../profile/ProfilesInput', () => ({
  ProfilesInput: (props: Record<string, unknown>) => {
    pickerProps.push(props);
    return React.createElement('ProfilesInput');
  },
}));

const { EventTypeSwitcher } = require('./EventTypeSwitcher');

const event = { type: 'event', name: 'Standup', jam: {} };

// Renders the tree (driving the gate) and returns every checkbox it produced,
// so callers can pick the one wired to the setter they care about.
const render = (visibility?: string, onChange?: (event: unknown) => void) => {
  checkboxes = [];
  pickerProps = [];
  setWaitingRoom = undefined;
  setNotifyEveryone = undefined;
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      React.createElement(EventTypeSwitcher, {
        event,
        onChange: onChange ?? (() => undefined),
        visibility,
      })
    );
  });
  return checkboxes;
};

// True only when the tree renders exactly one checkbox and it is the
// waiting-room one — i.e. the notify opt-in is absent (the `>= 2` count the
// old render-count assertions relied on would be satisfied by a future third
// toggle; identity is not).
const waitingRoomOnly = (boxes: CheckboxProps[]) =>
  boxes.length === 1 && boxes[0].onCheckedChange === setWaitingRoom;

const notifyCheckbox = (boxes: CheckboxProps[]) =>
  boxes.find((b) => b.onCheckedChange === setNotifyEveryone);

describe('RN EventTypeSwitcher community jam broadcast opt-in', () => {
  beforeEach(() => {
    authDataState.roles = [];
  });

  it('shows the opt-in for a public jam when the role can announce posts', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    const boxes = render('public');
    expect(boxes).toHaveLength(2);
    expect(notifyCheckbox(boxes)).toBeDefined();
  });

  it('shows the opt-in for a local jam with the announce role', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    const boxes = render('local');
    expect(boxes).toHaveLength(2);
    expect(notifyCheckbox(boxes)).toBeDefined();
  });

  it('keeps the waiting-room checkbox as the only checkbox for a group jam', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    expect(waitingRoomOnly(render('group'))).toBe(true);
  });

  it('keeps the waiting-room checkbox as the only checkbox for a direct jam', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    expect(waitingRoomOnly(render('direct'))).toBe(true);
  });

  it('keeps the waiting-room checkbox as the only checkbox without the announce role', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-create'] } }];
    expect(waitingRoomOnly(render('public'))).toBe(true);
  });

  it('keeps the waiting-room checkbox as the only checkbox when no visibility is supplied', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    expect(waitingRoomOnly(render(undefined))).toBe(true);
  });

  it('drives onChange with jam.notifyEveryone: true when the opt-in is toggled on', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    const onChange = jest.fn();
    const boxes = render('public', onChange);
    const notify = notifyCheckbox(boxes);
    expect(notify).toBeDefined();
    expect(notify!.checked).toBe(false);

    notify!.onCheckedChange!(true);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        jam: expect.objectContaining({ notifyEveryone: true }),
      })
    );
  });

  it('drives onChange with jam.waitingRoom: true when the waiting-room toggle is toggled', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-announce'] } }];
    const onChange = jest.fn();
    const boxes = render('public', onChange);
    const waitingRoom = boxes.find((b) => b.onCheckedChange === setWaitingRoom);
    expect(waitingRoom).toBeDefined();

    waitingRoom!.onCheckedChange!(true);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        jam: expect.objectContaining({ waitingRoom: true }),
      })
    );
  });
});

describe('RN EventTypeSwitcher co-organizer picker', () => {
  // The co-organizer picker is the `ProfilesInput` that takes a `filter`
  // (federated profiles can't act); the jam-moderator picker does not.
  const coOrganizerPicker = () =>
    pickerProps.find((props) => typeof props.filter === 'function');

  it('renders the co-organizer picker for every event format', () => {
    render('public');
    expect(coOrganizerPicker()).toBeDefined();
  });

  it('wires the hydrated profiles as the picker value', () => {
    render('public');
    expect(coOrganizerPicker()!.value).toEqual([]);
  });

  it('excludes federated profiles from the candidate list', () => {
    render('public');
    const filter = coOrganizerPicker()!.filter as (p: {
      type: string;
    }) => boolean;
    expect(filter({ type: 'local' })).toBe(true);
    expect(filter({ type: 'federated' })).toBe(false);
  });

  it('drives onChange with the picked co-organizer profiles', () => {
    const onChange = jest.fn();
    render('public', onChange);
    const onChangePicker = coOrganizerPicker()!.onChange as (
      profiles: unknown[]
    ) => void;
    onChangePicker([{ id: '111', handle: 'peep' }]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ coOrganizers: [{ id: '111', handle: 'peep' }] })
    );
  });

  it('excludes the signed-in profile from the picker (banlist)', () => {
    authDataState.roles = [{ capabilities: { add: ['core-posts-create'] } }];
    render('public');
    const banlist = coOrganizerPicker()!.banlist as
      Array<{ id?: string } | string>;
    expect(Array.isArray(banlist)).toBe(true);
    // The picker must hide the caller — the server already skips it, and a
    // picker that offered it would 422 on submit.
    expect(banlist.map((b) => (typeof b === 'string' ? b : b.id))).toContain(
      'u-1'
    );
  });

  it('leaves the banlist empty when signed out', () => {
    authDataState.roles = [];
    render('public');
    expect(coOrganizerPicker()!.banlist).toEqual([]);
  });
});
