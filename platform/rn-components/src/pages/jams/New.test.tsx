/**
 * RN parity for the community-jam "notify everyone" opt-in in the dedicated
 * New Jam screen (issue #1621, round-13 review suggestion 1): the native
 * `NewJam` screen — the primary jam-creation surface besides the generic event
 * form — must offer the same broadcast opt-in `EventTypeSwitcher` already
 * offers.
 *
 * The screen is a large composite, so every external import is mocked (node
 * jest env, no native modules). The production surface under test is the
 * screen's wiring: it must render the opt-in checkbox only when the shared
 * `useCreateNewJamForm` hook reports `canNotify`, and firing it must call the
 * hook's `setNotifyEveryone` (the checkbox is identified by its
 * `onCheckedChange` identity, since the waiting-room checkbox is always
 * present).
 */
import { type ReactNode } from 'react';

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type CheckboxProps = {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (value: boolean) => void;
};

let checkboxes: CheckboxProps[] = [];
// The shared hook's return surface, driven per test. The mock reads these at
// call time (inside a hoisted jest.mock factory), so mutating the object is
// what changes the render.
const form = {
  canNotify: false,
  notifyEveryone: false,
  notifyCalls: [] as boolean[],
  setNotifyEveryone: (value: boolean) => {
    form.notifyEveryone = value;
    form.notifyCalls.push(value);
  },
};

jest.mock('react-native', () => {
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, props);
  return { View: make('View'), Text: make('Text') };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: (props: { children?: ReactNode }) =>
    React.createElement('KeyboardAwareScrollView', null, props.children),
}));

jest.mock('@openpeepshq/react', () => ({
  useCreateNewJamForm: () => ({
    me: undefined,
    postData: { type: 'event', visibility: 'local', data: { type: 'event' } },
    event: {
      name: 'Test jam',
      jam: { notifyEveryone: form.notifyEveryone },
    },
    isAdmin: false,
    submitting: false,
    error: null,
    visibilityDescription: 'local',
    selectedGroupName: undefined,
    selectedModerators: [],
    directAudience: [],
    canNotify: form.canNotify,
    patchEvent: () => undefined,
    setWaitingRoom: () => undefined,
    setNotifyEveryone: form.setNotifyEveryone,
    handleModeratorsChange: () => undefined,
    applyAudience: () => undefined,
    handleCreate: () => undefined,
    handleSchedule: () => undefined,
  }),
}));

jest.mock('../../components/layout', () => ({
  HeaderActionButton: () => React.createElement('HeaderActionButton'),
  useSetPageHeader: () => undefined,
}));

jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: (props: { children?: ReactNode }) =>
    React.createElement('ThemedView', null, props.children),
}));

jest.mock('../../components/icons/index', () => ({
  EyeOnIcon: () => React.createElement('EyeOnIcon'),
}));

jest.mock('../../components/post/post-form/VisibilitySelector', () => ({
  VisibilitySelector: () => React.createElement('VisibilitySelector'),
}));

jest.mock('../../components/profile/ProfilesInput', () => ({
  ProfilesInput: () => React.createElement('ProfilesInput'),
}));

jest.mock('../../components/ui/button', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    React.createElement('Button', null, children),
}));

jest.mock('../../components/ui/checkbox', () => ({
  Checkbox: (props: CheckboxProps) => {
    checkboxes.push(props);
    return React.createElement('Checkbox', props);
  },
}));

jest.mock('../../components/ui/input', () => ({
  Input: () => React.createElement('Input'),
}));

jest.mock('../../components/ui/label', () => ({
  Label: ({ children }: { children?: unknown }) =>
    React.createElement('Label', null, children),
}));

jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: ({ children }: { children?: unknown }) =>
    React.createElement('ThemedText', null, children),
}));

const { NewJam } = require('./New');

// Renders the screen and returns every checkbox it produced.
const render = () => {
  checkboxes = [];
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      React.createElement(NewJam, { navigation: { goBack: () => undefined } })
    );
  });
};

const notifyCheckbox = () =>
  checkboxes.find((b) => b.onCheckedChange === form.setNotifyEveryone);

describe('NewJam community jam broadcast opt-in (RN parity)', () => {
  beforeEach(() => {
    form.canNotify = false;
    form.notifyEveryone = false;
    form.notifyCalls = [];
  });

  it('shows the opt-in and drives setNotifyEveryone when the hook allows it', () => {
    form.canNotify = true;
    render();

    const box = notifyCheckbox();
    expect(box).toBeTruthy();
    expect(box!.checked).toBe(false);

    ReactTestRenderer.act(() => {
      box!.onCheckedChange?.(true);
    });
    expect(form.notifyEveryone).toBe(true);
    expect(form.notifyCalls).toEqual([true]);
  });

  it('hides the opt-in when the hook reports the creator may not broadcast', () => {
    form.canNotify = false;
    render();
    // The waiting-room checkbox is always present, so exactly one checkbox
    // renders (no opt-in) and none of them is wired to setNotifyEveryone.
    expect(checkboxes.length).toBe(1);
    expect(notifyCheckbox()).toBeFalsy();
  });
});
