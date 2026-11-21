/**
 * Regression test for the EditProfileForm discoverable checkbox lifecycle
 * (issue #211 round-3 review S2).
 *
 * The opt-out checkbox is driven by react-hook-form state. `useForm`'s
 * `defaultValues` are only applied at mount, so if the profile fetch completes
 * after mount (the common navigation path: a cached stub renders first, then
 * the real profile resolves), the form keeps the stale `discoverable` value
 * unless the `useEffect` keyed on `profileData` calls `form.reset`. If that
 * reset were removed, a previously opted-out member would see the checkbox
 * re-checked and an unrelated edit could silently flip the opt-out back on.
 *
 * This pins the lifecycle end to end: the component seeds the form from the
 * cached stub at mount, then, when the fresh profile (discoverable: false)
 * resolves after mount, it must call `form.reset` with the fresh flag. The
 * assertion fails if the flag goes stale — i.e. if the post-mount reset is
 * removed or no longer carries the loaded `discoverable`.
 *
 * `react-hook-form` is mocked with a spy `useForm` so the assertions read the
 * actual `defaultValues` (mount seed) and the `reset` calls (post-mount sync)
 * the component makes, without rendering the full native form tree.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  View: (props: Record<string, unknown>) =>
    React.createElement('View', props, props.children),
  Pressable: (props: { children?: unknown }) =>
    React.createElement('Pressable', props, props.children),
  ActivityIndicator: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: (props: { children?: unknown }) =>
    React.createElement('KeyboardAwareScrollView', null, props.children),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: () => null,
}));

// `@openpeepshq/common` is normally mapped to a single module; the component
// pulls value exports (profileSchema, isForbiddenHandle, ...) that live in the
// real barrel, so stub the exact names used here.
jest.mock('@openpeepshq/common', () => ({
  getTheme: () => ({ defaultProfileAvatar: undefined }),
  HANDLE_RESERVED_MESSAGE: 'reserved',
  isForbiddenHandle: () => false,
  profileSchema: {},
}));

// Inert resolver so the form never runs zod validation.
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async () => ({}),
}));

jest.mock('../../lib/media-url', () => ({
  toAbsoluteMediaUrl: (url?: string) => url,
}));

jest.mock('../ui/themed-view', () => ({
  ThemedView: (props: { children?: unknown }) =>
    React.createElement('ThemedView', null, props.children),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../ui/avatar', () => ({
  Avatar: (props: { children?: unknown }) =>
    React.createElement('Avatar', null, props.children),
  AvatarImage: () => null,
}));

jest.mock('../ui/button', () => ({
  Button: (props: { onPress?: () => void; children?: unknown }) =>
    React.createElement('button', { onPress: props.onPress }, props.children),
}));

jest.mock('../custom/index', () => ({
  ImagePickerSheet: () => null,
}));

jest.mock('../custom/common/index', () => ({
  CachedImage: () => null,
}));

jest.mock('../icons/index', () => ({
  CameraIcon: () => null,
  XIcon: () => null,
}));

// Spy form: every `useForm` call returns a fresh object whose `reset` is a
// jest.fn, so the test can read the component's actual `defaultValues` (the
// mount seed) and its `reset` calls (the post-mount sync that keeps the
// discoverable checkbox in step with a freshly loaded profile).
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    control: undefined,
    formState: {},
    reset: jest.fn(),
    getValues: (name?: string) => (name ? formValues[name] : formValues),
    handleSubmit: async () => {},
  })),
  FormProvider: () => null,
  Controller: () => null,
}));

jest.mock('../ui/form', () => ({
  // Renders children so the submit Button (the only exposed trigger of
  // `onSubmit`) is reachable in the submit-path test; the form fields stay
  // inert.
  Form: (props: { children?: unknown }) =>
    React.createElement('Form', null, props.children),
  FormField: () => null,
  FormInput: () => null,
  FormTextarea: () => null,
  FormCheckbox: () => null,
}));

// Controllable profile so the test can resolve the fresh profile after mount.
const profileState = {
  data: undefined as unknown,
  isLoading: false,
};

// Controllable form values so the submit-path test exercises what the native
// app actually persists. `react-hook-form` is mocked, so the zod resolver
// never runs and `getValues` returns this verbatim: a dropped or mangled
// `discoverable` in `onSubmit` surfaces here, not at validation.
const formValues: Record<string, unknown> = {};

// Captures the `updateCurrentProfileAction()` instance the form calls, so the
// submit-path test asserts the exact persisted payload. Stable across renders
// — `useOpenpeeps` returns a stable api (context), and the form re-renders on
// `setIsSubmitting`, so a fresh action per render would let the re-render
// silently swap out the reference the test asserts on.
let updateAction: jest.Mock = jest.fn(async () => ({}));

// Captures every `queryClient.invalidateQueries` call from the save path so
// the round-6 S2 pin can assert the profile-list caches are dropped when
// `discoverable` is toggled (directory view `['profiles', { directory: 'true' }]`
// and pickers `['profiles']` via the `['profiles']` prefix).
const invalidateQueriesSpy = jest.fn(async () => {});

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfileByHandle: () => ({
        data: profileState.data,
        isLoading: profileState.isLoading,
        refetch: jest.fn(async () => {}),
      }),
      useServerInfo: () => ({
        data: { communityConfig: { settings: {}, profiles: {} } },
      }),
      updateCurrentProfileAction: () => updateAction,
    },
    queryClient: { invalidateQueries: invalidateQueriesSpy },
  }),
  useServerInfo: () => ({
    communityConfig: { settings: {}, profiles: {} },
  }),
}));

import * as reactHookForm from 'react-hook-form';
import { EditProfileForm } from './EditProfileForm';

const useFormMock = reactHookForm.useForm as jest.Mock;

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  useFormMock.mockClear();
  Object.keys(formValues).forEach((key) => delete formValues[key]);
  formValues.displayName = 'Me';
  formValues.handle = 'me';
  formValues.fields = [];
  updateAction.mockReset();
  updateAction.mockResolvedValue({});
  invalidateQueriesSpy.mockClear();
});

const baseProfile = (discoverable: boolean | undefined) => ({
  id: 'me',
  handle: 'me',
  displayName: 'Me',
  type: 'local',
  fields: [],
  ...(discoverable === undefined ? {} : { discoverable }),
});

describe('EditProfileForm discoverable checkbox lifecycle (issue #211 S2)', () => {
  it('resets the form to the freshly loaded discoverable flag, not the cached stub', () => {
    // Cached stub: member is listed (discoverable present/truthy).
    profileState.data = baseProfile(true);
    profileState.isLoading = false;

    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(EditProfileForm, { handle: 'me' })
      );
    });

    // Mount seed: the form is initialised from the cached stub's discoverable.
    const mountCall = useFormMock.mock.calls[0][0];
    expect(mountCall.defaultValues.discoverable).toBe(true);

    // Fresh profile resolves after mount with the member opted out.
    ReactTestRenderer.act(() => {
      profileState.data = baseProfile(false);
      (tree as { update: (el: React.ReactElement) => void }).update(
        React.createElement(EditProfileForm, { handle: 'me' })
      );
    });

    // The effect keyed on profileData must call form.reset with the fresh
    // flag. A stale form (reset removed or not carrying discoverable) would
    // never hand the fresh `false` to the form, and this would fail.
    const resetCalls = useFormMock.mock.results.map(
      (r) => r.value.reset as jest.Mock
    );
    const handedFreshFlag = resetCalls.some((spy) =>
      spy.mock.calls.some((call) => call[0]?.discoverable === false)
    );
    expect(handedFreshFlag).toBe(true);
  });
});

describe('EditProfileForm discoverable checkbox submit path (issue #211 S2)', () => {
  const mountForm = () => {
    profileState.data = baseProfile(false);
    profileState.isLoading = false;
    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(EditProfileForm, { handle: 'me' })
      );
    });
    return tree;
  };

  const pressSubmit = async (
    tree: ReturnType<typeof ReactTestRenderer.create>
  ) => {
    const button = tree.root.find((node) => node.type === 'button') as {
      props: { onPress: () => void };
    };
    await ReactTestRenderer.act(async () => {
      button.props.onPress();
    });
  };

  it('persists discoverable: false when an opted-out member saves', async () => {
    const tree = mountForm();
    formValues.discoverable = false;

    await pressSubmit(tree);

    expect(updateAction).toHaveBeenCalledTimes(1);
    // The payload the native app persists must carry the flag verbatim —
    // an absent `discoverable` (or one mangled to truthy) would leave the
    // opt-out silently reverted, which this assertion catches.
    expect(updateAction!.mock.calls[0]![0]).toMatchObject({
      discoverable: false,
    });
  });

  it('persists discoverable: true when a member re-joins the directory', async () => {
    const tree = mountForm();
    formValues.discoverable = true;

    await pressSubmit(tree);

    expect(updateAction).toHaveBeenCalledTimes(1);
    expect(updateAction!.mock.calls[0]![0]).toMatchObject({
      discoverable: true,
    });
  });

  it('drops the profile-list caches on save so the directory refetches (issue #211 round-6 S2)', async () => {
    const tree = mountForm();
    formValues.discoverable = false;

    await pressSubmit(tree);

    // Toggling `discoverable` changes directory membership. Without the
    // `['profiles']` invalidation the RN Members tab (and the profile
    // pickers) would keep showing the member until their next refetch — the
    // screen stays mounted in the tab navigator and the app has no query
    // focusManager wiring. The `['profiles']` prefix matches both the
    // directory query (`['profiles', { directory: 'true' }]`) and the
    // pickers' plain `['profiles']` key. The exact call shape is pinned, not
    // just "some profiles-ish key": the pre-existing `['profile', handle]`
    // call does not satisfy it, so a regression that drops only this
    // invalidation still fails the test.
    expect(invalidateQueriesSpy.mock.calls).toContainEqual([
      { queryKey: ['profiles'] },
    ]);
  });
});
