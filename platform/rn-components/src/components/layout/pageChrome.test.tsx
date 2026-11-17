/**
 * Regression tests for the page-chrome infinite update loop
 * ("Maximum update depth exceeded") that crashed Groups, Jams and Explore
 * (and any other page that registers header or plus actions with fresh,
 * non-memoized values) in @openpeepshq/rn-components 0.3.12.
 *
 * Root cause: useSetPageHeader / useSetPlusButtonActions read their
 * setters from the same context whose value changes whenever the header
 * or plus state changes. A screen that registers a fresh element or
 * object therefore re-renders on every chrome update, re-runs its layout
 * effect and calls setState again.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  PageChromeProvider,
  usePageChrome,
  useSetPageHeader,
  useSetPlusButtonActions,
} from './pageChrome';

// The two rebuilt layout components (HeaderMobile, ContentHeader) pull in
// navigation, i18n, drawer, window and theme hooks plus a few UI primitives.
// Mock that whole dependency surface so the real components can be rendered in
// the node test environment; the real pageChrome scaffolding above is reused
// (the provider is what ContentHeader reads its title / onBack from).
const React = require('react');

let mockServerInfo: unknown;
let mockTheme: unknown;
let mockCurrentProfile: unknown;
const mockNavigate = jest.fn();
const mockOpenDrawer = jest.fn();
const mockGoToParentOrBack = jest.fn();
const mockOnBack = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StatusBar: { currentHeight: 0 },
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  View: (props: { children?: unknown }) =>
    React.createElement('View', props, props.children),
  Pressable: (props: { children?: unknown }) =>
    React.createElement('Pressable', props, props.children),
  useColorScheme: () => 'light',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (props: { children?: unknown }) =>
    React.createElement('SafeAreaView', props, props.children),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ name: 'Test', params: undefined }),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    currentProfile: mockCurrentProfile,
    openpeepsApi: {
      useServerInfo: () => ({ data: mockServerInfo }),
      useCurrentProfileSettings: () => ({ data: undefined }),
    },
  }),
  useCurrentProfile: () => mockCurrentProfile,
}));

jest.mock('@openpeepshq/common', () => ({
  getTheme: () => mockTheme,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../contexts/drawer-context', () => ({
  useDrawer: () => ({ openDrawer: mockOpenDrawer }),
}));

jest.mock('../../hooks/index', () => ({
  useWindowSize: () => ({
    windowWidth: 390,
    windowHeight: 844,
    isMediumScreenOrLarger: false,
  }),
}));

jest.mock('../../lib/constants', () => ({
  BASE_URL: 'https://example.test',
  isProduction: true,
}));

jest.mock('../../lib/media-url', () => ({
  toAbsoluteMediaUrl: (url?: string) => url,
}));

jest.mock('../navigation/parent-back', () => ({
  goToParentOrBack: mockGoToParentOrBack,
}));

jest.mock('../ui/avatar', () => ({
  Avatar: (props: { children?: unknown }) =>
    React.createElement('Avatar', props, props.children),
  AvatarFallback: (props: { children?: unknown }) =>
    React.createElement('AvatarFallback', props, props.children),
  AvatarImage: (props: { children?: unknown }) =>
    React.createElement('AvatarImage', props, props.children),
}));

jest.mock('../ui/button', () => ({
  Button: (props: { children?: unknown }) =>
    React.createElement('Button', props, props.children),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', props, props.children),
}));

jest.mock('../ui/svg-image', () => ({
  SvgImage: (props: { children?: unknown }) =>
    React.createElement('SvgImage', props, props.children),
}));

jest.mock('../icons/index', () => ({
  MenuIcon: (props: Record<string, unknown>) =>
    React.createElement('MenuIcon', props),
  MessageSquareTextIcon: (props: Record<string, unknown>) =>
    React.createElement('MessageSquareTextIcon', props),
  UserIcon: (props: Record<string, unknown>) =>
    React.createElement('UserIcon', props),
  ChevronLeftIcon: (props: Record<string, unknown>) =>
    React.createElement('ChevronLeftIcon', props),
}));

import { ContentHeader } from './ContentHeader';
import { HeaderMobile } from './HeaderMobile';

const MAX_RENDER_GUARD = 20;

const Text = ({ children }: { children?: ReactNode }) => (
  <text>{children}</text>
);

const View = ({ children }: { children?: ReactNode }) => (
  <view>{children}</view>
);

const render = (ui: ReactNode) => {
  const element = <PageChromeProvider>{ui}</PageChromeProvider>;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

const UnstableHeaderScreen = ({ onRender }: { onRender: () => void }) => {
  onRender();
  useSetPageHeader(
    'Jams',
    <View>
      <Text>actions</Text>
    </View>
  );
  return <Text>screen</Text>;
};

const UnstablePlusScreen = ({ onRender }: { onRender: () => void }) => {
  onRender();
  useSetPageHeader('Groups');
  useSetPlusButtonActions({ title: 'New group', action: () => {} });
  return <Text>screen</Text>;
};

const StableScreen = () => {
  useSetPageHeader('Feed');
  return <Text>screen</Text>;
};

const ChromeProbe = ({
  onChrome,
}: {
  onChrome: (title?: string, plusTitle?: string) => void;
}) => {
  const { header, plus } = usePageChrome();
  const plusTitle = Array.isArray(plus) ? plus[0]?.title : plus?.title;
  onChrome(
    typeof header?.title === 'string' ? header.title : undefined,
    plusTitle
  );
  return null;
};

test('unstable header actions do not loop (jams/explore)', () => {
  let renders = 0;
  const tree = render(
    <UnstableHeaderScreen
      onRender={() => {
        renders += 1;
        if (renders > MAX_RENDER_GUARD) {
          throw new Error('Maximum update depth exceeded');
        }
      }}
    />
  );
  expect(renders).toBeLessThanOrEqual(MAX_RENDER_GUARD);
  expect(JSON.stringify(tree.toJSON())).toContain('screen');
  tree.unmount();
});

test('unstable plus actions do not loop (groups)', () => {
  let renders = 0;
  const tree = render(
    <UnstablePlusScreen
      onRender={() => {
        renders += 1;
        if (renders > MAX_RENDER_GUARD) {
          throw new Error('Maximum update depth exceeded');
        }
      }}
    />
  );
  expect(renders).toBeLessThanOrEqual(MAX_RENDER_GUARD);
  expect(JSON.stringify(tree.toJSON())).toContain('screen');
  tree.unmount();
});

test('stable title-only header still works', () => {
  const tree = render(<StableScreen />);
  expect(JSON.stringify(tree.toJSON())).toContain('screen');
  tree.unmount();
});

test('display chrome still sees registered header and plus', () => {
  let title: string | undefined;
  let plusTitle: string | undefined;
  const tree = render(
    <View>
      <UnstablePlusScreen onRender={() => {}} />
      <ChromeProbe
        onChrome={(nextTitle, nextPlusTitle) => {
          title = nextTitle;
          plusTitle = nextPlusTitle;
        }}
      />
    </View>
  );
  expect(title).toBe('Groups');
  expect(plusTitle).toBe('New group');
  tree.unmount();
});

test('page chrome hooks throw outside RootLayout', () => {
  const Bare = () => {
    useSetPageHeader('Feed');
    return null;
  };
  expect(() => {
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Bare />);
    });
  }).toThrow('Page chrome hooks must be used within RootLayout');
});

// The two rebuilt layout components (issue #1971). The existing tests above
// exercise the pageChrome context but never the components that render it;
// these pin their structure and navigation wiring so a regression in the
// consolidated chrome fails CI instead of only typechecking clean.
describe('rebuilt layout components (issue #1971)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockOpenDrawer.mockReset();
    mockGoToParentOrBack.mockReset();
    mockServerInfo = undefined;
    mockTheme = undefined;
    mockCurrentProfile = undefined;
  });

  const renderHeader = () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<HeaderMobile />);
    });
    return tree;
  };

  const RegisterHeader = () => {
    useSetPageHeader('Conversations', undefined, mockOnBack);
    return null;
  };

  test('HeaderMobile: a guest (no current profile) renders the menu-icon trigger', () => {
    const tree = renderHeader();
    // currentProfile is undefined → the guest fallback MenuIcon is the drawer
    // trigger (web renders an avatar for signed-in users, a menu icon for
    // guests); no logo (server info / theme absent) so no navigation logo.
    expect(tree.root.findAllByType('MenuIcon')).toHaveLength(1);
    expect(tree.root.findAllByType('Avatar')).toHaveLength(0);
    expect(tree.root.findAllByType('SvgImage')).toHaveLength(0);
    // The menu trigger button carries the (mocked to its key) label.
    const menuButtons = tree.root
      .findAllByType('Button')
      .filter(
        (node: { props: Record<string, unknown> }) =>
          node.props.accessibilityLabel === 'navigation.openMenu'
      );
    expect(menuButtons).toHaveLength(1);
    tree.unmount();
  });

  test('HeaderMobile: the logo button navigates to Home (guest branch)', () => {
    // A configured theme with a small logo renders the logo button.
    mockServerInfo = { communityConfig: {} };
    mockTheme = { logoSmall: '/logo.svg' };
    const tree = renderHeader();
    const logoButton = tree.root.find(
      (node: { props?: Record<string, unknown> }) =>
        node.props && node.props.accessibilityLabel === 'navigation.home'
    );
    expect(logoButton).toBeDefined();
    ReactTestRenderer.act(() => {
      logoButton.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('TabNavigator', {
      screen: 'Home',
    });
    tree.unmount();
  });

  test('ContentHeader: renders the fixed h-16 bg-background row and the back button', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <PageChromeProvider>
          <ContentHeader />
          <RegisterHeader />
        </PageChromeProvider>
      );
    });
    // The fixed-height background row renders.
    const rows = tree.root.findAll(
      (node: { type?: unknown; props: Record<string, unknown> }) =>
        node.type === 'View' &&
        node.props.className ===
          'bg-background border-border h-16 flex-row items-center justify-between border-b px-4'
    );
    expect(rows).toHaveLength(1);
    // The back button exposes the (mocked to its key) common.actions.back label.
    const backButtons = tree.root
      .findAllByType('Pressable')
      .filter(
        (node: { props: Record<string, unknown> }) =>
          node.props.accessibilityLabel === 'common.actions.back'
      );
    expect(backButtons).toHaveLength(1);
    tree.unmount();
  });
});
