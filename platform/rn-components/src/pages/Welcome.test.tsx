/**
 * Regression coverage for #1600 (RN parity) — the native Onboarding screen
 * (the RN mirror of the web Welcome page) is guest-reachable, so a signed-out
 * visitor must see the markdown welcome plus a Sign In CTA, NOT the signed-in
 * setup checklist. The checklist is the only consumer of the disabled
 * `usePostsByProfile('')` query, which never leaves `isPending` for a guest —
 * rendering it would leave the checklist in a permanent loading spin (the bug
 * fixed on the web side). Nothing else asserted that a guest opening this
 * screen avoided that path.
 *
 * The node jest env has no native modules, so every external import is
 * mocked (mirroring New.carryover.test.tsx); only the real `Welcome` under
 * test renders, with its guest / signed-in branches driven by the mocked
 * `useOpenpeeps`.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

const React = require('react');

let mockCurrentProfile: {
  id: string;
  displayName?: string;
  handle?: string;
} | null = null;
const mockNavigate = jest.fn();

// --- react-native: host elements render as plain host tags, props kept ----
jest.mock('react-native', () => {
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, props);
  return {
    View: make('View'),
    Text: make('Text'),
    ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'),
    Pressable: make('Pressable'),
    ActivityIndicator: make('ActivityIndicator'),
  };
});

// --- shared @openpeepshq/react: drive the branch, capture navigation ------
jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    currentProfile: mockCurrentProfile,
    currentAccount: { emailValidated: true },
    openpeepsApi: {
      useServerInfo: () => ({
        data: {
          communityConfig: {
            info: { name: 'TestCo' },
            content: { welcomePage: 'Welcome to TestCo' },
          },
        },
        isLoading: false,
      }),
      // Disabled for guests (empty profile id) — mirrors the production
      // wiring; only the render gate under test decides whether it is used.
      usePostsByProfile: () => ({ data: { pages: [] }, isLoading: false }),
      validationEmailAction: () => () => Promise.resolve({ success: true }),
    },
  }),
  useRouter: () => ({ navigate: mockNavigate }),
}));

// --- i18n: resolve keys to their defaultValue, or a few known values ------
// (the guest row calls t(key) without a defaultValue, unlike the web page) --
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => {
      const known: Record<string, string> = {
        'welcome.guestSignIn':
          'Sign in to complete your account setup and see the checklist.',
        'auth.register.signIn': 'Sign In',
      };
      return opts?.defaultValue ?? known[_key] ?? _key;
    },
  }),
}));

// --- lucide icons: inert ---------------------------------------------------
jest.mock('lucide-react-native', () => {
  const icon = (name: string) => () => React.createElement(name, null);
  return {
    UserCheckIcon: icon('UserCheckIcon'),
    MailCheckIcon: icon('MailCheckIcon'),
    SquareUserRoundIcon: icon('SquareUserRoundIcon'),
    PencilIcon: icon('PencilIcon'),
    ChevronRightIcon: icon('ChevronRightIcon'),
    CheckIcon: icon('CheckIcon'),
  };
});

// --- local component deps: inert -------------------------------------------
jest.mock('react-native-toast-message', () => {
  const Toast = { show: jest.fn() };
  return { __esModule: true, default: Toast };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));
jest.mock('../components/layout', () => ({
  useSetPageHeader: jest.fn(),
}));
jest.mock('../components/ui/themed-view', () => ({
  ThemedView: ({ children }: { children?: ReactNode }) =>
    React.createElement('View', null, children),
}));
jest.mock('../components/ui/themed-text', () => ({
  ThemedText: ({ children }: { children?: ReactNode }) =>
    React.createElement('Text', null, children),
}));
jest.mock('../components/markdown/index', () => ({
  OpenpeepsMarkdown: ({ source }: { source: string }) =>
    React.createElement('Markdown', null, source),
}));
jest.mock('../theme/useThemeOpacity', () => ({
  useThemeOpacity: () => ({ background: () => 'rgba(0,0,0,0.1)' }),
}));

import { Welcome } from './Welcome';

describe('RN Welcome (Onboarding) guest parity', () => {
  beforeEach(() => {
    mockCurrentProfile = null;
    mockNavigate.mockClear();
  });

  it('shows a Sign In CTA (and no checklist) for a signed-out visitor', () => {
    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(React.createElement(Welcome));
    });

    // The guest CTA is rendered …
    const [cta] = tree.root.findAllByProps({
      testID: 'welcome-guest-sign-in',
    });
    // … and pressing it routes to the auth screen.
    cta.props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith({ type: 'auth', mode: 'login' });

    const json = JSON.stringify(tree.toJSON());
    // The signed-in checklist must be absent — it is the only consumer of
    // the disabled posts query, so rendering it is exactly the spin
    // regression this test guards.
    expect(json).not.toContain('Complete account setup');
    // … while the guest copy and the CTA label are present.
    expect(json).toContain('Sign in to complete your account setup');
    expect(json).toContain('Sign In');
  });

  it('shows the setup checklist (and no guest CTA) when signed in', () => {
    mockCurrentProfile = { id: 'me', displayName: 'Me', handle: 'me' };
    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(React.createElement(Welcome));
    });

    expect(
      tree.root.findAllByProps({ testID: 'welcome-guest-sign-in' })
    ).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('Complete account setup');
  });
});
