/**
 * Consumer-pin for the RN Members (directory) screen (issue #211 round-6
 * review S1, native side).
 *
 * The behavioral contract is "the directory list is filtered, pickers are
 * not". The server/SQL layer and the shared hook (`useProfiles(directory)` →
 * `queryParams: { directory: 'true' }`) are already pinned; this pins the
 * consumer wiring: if `platform/rn-components/src/pages/Members.tsx` ever
 * reverts `useProfiles(true)` to plain `useProfiles()`, the directory screen
 * silently falls back to the unfiltered picker list and this test fails.
 *
 * The component's only directory-facing surface is its `useProfiles` call, so
 * the module boundary (`@openpeepshq/react`) is mocked with a `useProfiles`
 * spy that records its argument; the rest of the screen renders for real
 * under `react-test-renderer`.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  View: (props: Record<string, unknown>) =>
    React.createElement('View', props, props.children),
  Pressable: (props: Record<string, unknown>) =>
    React.createElement('Pressable', props, props.children),
  ActivityIndicator: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: (props: { children?: unknown }) =>
    React.createElement('KeyboardAwareScrollView', null, props.children),
}));

jest.mock('../components/ui/themed-view', () => ({
  ThemedView: (props: { children?: unknown }) =>
    React.createElement('ThemedView', null, props.children),
}));

jest.mock('../components/layout', () => ({
  useSetPageHeader: () => undefined,
}));

jest.mock('../components/icons/index', () => ({
  XIcon: () => null,
  SearchIcon: () => null,
  MessageSquareTextIcon: () => null,
}));

jest.mock('../components/ui/input', () => ({
  Input: () => null,
}));

jest.mock('../components/custom/index', () => ({
  EmptyStateContainer: () => null,
}));

jest.mock('../components/profile/index', () => ({
  FollowUnfollowButton: () => null,
  ProfileCard: () => null,
}));

jest.mock('../stores/useNewConversationStore', () => ({
  useNewConversationStore: () => ({
    clearMembers: () => {},
    setContt: () => {},
    setMember: () => {},
  }),
}));

// `../lib/utils` transitively imports `react-native-config` (ESM) via
// `lib/constants`, which jest's CJS runtime cannot parse; the screen only
// uses `profileMatchesQuery` for its (empty) search filter, so a no-op is
// enough for this wiring pin.
jest.mock('../lib/utils', () => ({
  profileMatchesQuery: () => true,
}));

const useProfilesMock = jest.fn(() => ({ data: undefined, isLoading: false }));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: { useProfiles: useProfilesMock },
    currentProfile: undefined,
  }),
}));

import { Members } from './Members';

describe('RN Members directory view consumer wiring (issue #211 S1)', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useProfilesMock.mockClear();
    useProfilesMock.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('requests the profiles list as the directory view (useProfiles(true))', () => {
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        React.createElement(Members, {
          navigation: { navigate: () => {} },
        } as unknown as never)
      );
    });

    expect(useProfilesMock).toHaveBeenCalled();
    // The directory screen must opt into the filtered directory list. A
    // revert to plain `useProfiles()` drops the argument (false) and fails
    // here — the screen would then render the unfiltered picker list.
    expect(useProfilesMock.mock.calls[0]![0]).toBe(true);
  });
});
