/**
 * Regression coverage for the auth-stack mirror of the web /welcome status
 * lines (PR for #394, review round-2 suggestion 3): the login/signup Welcome
 * screen gained the same two community-status lines (federated? public?) as the
 * Onboarding Welcome, via the same `welcome.*` keys. It is a separate render
 * path, reachable mid-login/signup, and was previously untested — these cases
 * pin the positive and negative branches of both ternaries (mirroring the web
 * Welcome.test.tsx pattern), plus the `!isLoading` gate.
 *
 * The node jest env has no native modules, so every external import is
 * mocked (mirroring ../Welcome.test.tsx); only the real `AuthWelcome` under
 * test renders.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

const React = require('react');

// Drives the two status lines per test (mirrors the ../Welcome.test.tsx
// module-level mockServerInfo pattern).
let mockServer: {
  communityConfig?: {
    info?: { tagLine?: string };
    settings?: { openRegistrations?: boolean };
  };
  federation?: { active: boolean };
  publicContent?: boolean;
} = {
  communityConfig: { info: { tagLine: 'Tagline' } },
  federation: { active: true },
  publicContent: true,
};
let mockIsLoading = false;

// --- react-native: host elements render as plain host tags, props kept ----
jest.mock('react-native', () => {
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, props);
  return {
    View: make('View'),
    Text: make('Text'),
    TouchableWithoutFeedback: make('TouchableWithoutFeedback'),
  };
});

// --- shared @openpeepshq/react: drive the status lines --------------------
jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    currentProfile: null,
    currentAccount: null,
    openpeepsApi: {
      useServerInfo: () => ({ data: mockServer, isLoading: mockIsLoading }),
    },
  }),
}));

// --- navigation: AUTH_ROUTES is the only runtime value the screen needs ----
jest.mock('../../components/navigation/types/index', () => ({
  AUTH_ROUTES: {
    LOGIN: 'Login',
    SIGNUP: 'Signup',
    SIGNUP_INVITATION: 'SignupInvitation',
    VALIDATE_EMAIL: 'ValidateEmail',
    WELCOME: 'Welcome',
    SUCCESS: 'Success',
    FORGOT_PASSWORD: 'ForgotPassword',
    RESET_PASSWORD: 'ResetPassword',
  },
}));

// --- i18n: resolve keys to known values (same keys as the web block) ------
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => {
      const known: Record<string, string> = {
        'welcome.federated': 'Federated with other communities',
        'welcome.notFederated': 'Not federated',
        'welcome.public': 'Public — visitors can read public posts',
        'welcome.private': 'Private — only members can read posts',
        'auth.register.title': 'Create your account',
        'auth.login.title': 'Sign In',
      };
      return opts?.defaultValue ?? known[_key] ?? _key;
    },
  }),
}));

// --- local component deps: inert -------------------------------------------
jest.mock('../../components/ui/button', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    React.createElement('Button', null, children),
}));
jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: ({ children }: { children?: ReactNode }) =>
    React.createElement('Text', null, children),
}));

import { AuthWelcome } from './Welcome';

describe('Auth Welcome (auth-stack) community status lines', () => {
  beforeEach(() => {
    mockServer = {
      communityConfig: { info: { tagLine: 'Tagline' } },
      federation: { active: true },
      publicContent: true,
    };
    mockIsLoading = false;
  });

  const renderScreen = () => {
    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(AuthWelcome, {
          navigation: { navigate: jest.fn() },
        })
      );
    });
    return JSON.stringify(tree.toJSON());
  };

  it('shows the federated/public status lines when the server is federated and public', () => {
    const json = renderScreen();
    expect(json).toContain('Federated with other communities');
    expect(json).toContain('Public — visitors can read public posts');
    // … and never the opposite wording at the same time.
    expect(json).not.toContain('Not federated');
    expect(json).not.toContain('Private — only members can read posts');
  });

  it('shows the not-federated/private status lines when the server is not federated and private', () => {
    mockServer = {
      communityConfig: { info: { tagLine: 'Tagline' } },
      federation: { active: false },
      publicContent: false,
    };
    const json = renderScreen();
    expect(json).toContain('Not federated');
    expect(json).toContain('Private — only members can read posts');
    // … and never the opposite wording at the same time.
    expect(json).not.toContain('Federated with other communities');
    expect(json).not.toContain('Public — visitors can read public posts');
  });

  it('shows no status lines while the server info is still loading', () => {
    mockIsLoading = true;
    const json = renderScreen();
    expect(json).not.toContain('Federated with other communities');
    expect(json).not.toContain('Not federated');
    expect(json).not.toContain('Public — visitors can read public posts');
    expect(json).not.toContain('Private — only members can read posts');
  });
});
