/**
 * Regression test for issue #2106 — the side-menu unread badge clipped
 * 3-digit counts and the ∞ glyph in a fixed 20px pill.
 *
 * The fix routes the badge through the shared `UnreadBadge` component, so
 * this suite pins the call-site contract: the Groups row renders the badge
 * when the group unread count is positive, renders nothing at 0, and no
 * inline `size-5` pill markup remains in the menu items.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => {
  const el =
    (tag: string) =>
    (props: Record<string, unknown> & { children?: unknown }) =>
      React.createElement(tag, props, props.children);
  return {
    View: el('View'),
    Text: el('Text'),
    Pressable: el('Pressable'),
    ScrollView: el('ScrollView'),
    TouchableOpacity: el('TouchableOpacity'),
    Linking: { openURL: jest.fn() },
    Platform: { OS: 'android', select: (o: { android: unknown }) => o.android },
    useColorScheme: () => 'light',
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('@openpeepshq/common', () => ({
  getTheme: () => ({}),
  // The real UnreadBadge formats its label through this helper.
  formatBadgeCount: require('../../../../../common/src/lib/text')
    .formatBadgeCount,
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('../../../lib/push-notifications', () => ({
  unregisterPushForLogout: jest.fn(async () => 'ok'),
}));

// Mutable so each case can drive the unseen-counts hook; the mock factory
// reads it lazily per call.
let mockUnseenData: {
  groups: Record<string, number>;
  direct: Record<string, number>;
} = { groups: {}, direct: {} };

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      logoutAction: () => jest.fn(),
      useServerInfo: () => ({ data: undefined }),
      useCurrentProfileSettings: () => ({ data: undefined }),
      useUnseenPostCounts: () => ({ data: mockUnseenData }),
    },
    currentProfile: {
      id: 'me',
      handle: 'me@example',
      displayName: 'Me',
    },
  }),
  buildMainNavItems: require('../../../../../react/src/navigation/menuItems')
    .buildMainNavItems,
}));

jest.mock('../../../hooks/helper', () => ({
  useWindowSize: () => ({
    windowWidth: 400,
    windowHeight: 800,
    isMediumScreenOrLarger: false,
  }),
}));

jest.mock('../../../lib/media-url', () => ({
  toAbsoluteMediaUrl: (u?: string) => u,
}));

jest.mock('../../ui/separator', () => ({
  Separator: (props: Record<string, unknown> & { children?: unknown }) =>
    React.createElement('Separator', props, props.children),
}));

jest.mock('../../ui/button', () => ({
  Button: (props: Record<string, unknown> & { children?: unknown }) =>
    React.createElement('Button', props, props.children),
}));

jest.mock('../../ui/svg-image', () => ({
  SvgImage: (props: Record<string, unknown>) =>
    React.createElement('SvgImage', props),
}));

jest.mock('../../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown> & { children?: unknown }) =>
    React.createElement('ThemedText', props, props.children),
  TextClassContext: {
    Provider: ({ children }: { children?: unknown }) => children,
  },
}));

jest.mock('../../ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: unknown }) => children,
  TooltipTrigger: ({ children }: { children?: unknown }) => children,
  TooltipContent: ({ children }: { children?: unknown }) => children,
}));

jest.mock('../../profile/Avatar', () => ({
  ProfileAvatar: (props: Record<string, unknown>) =>
    React.createElement('ProfileAvatar', props),
}));

jest.mock(
  '../../icons/index',
  () =>
    new Proxy(
      {},
      {
        get: (_t, name: string) => (props: Record<string, unknown>) =>
          React.createElement(name, props),
      }
    )
);

// The real UnreadBadge is rendered, and its `cn` comes from `lib/utils`,
// which imports react-native-config (native module, ESM-only) — mock it
// wholesale with the join helper the components actually use.
jest.mock('../../../lib/utils', () => ({
  cn: (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' '),
}));

import { SideMenu } from './side-menu';

type TreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (string | TreeNode)[];
};

const walk = (node: TreeNode): TreeNode[] => [
  node,
  ...(node.children ?? [])
    .filter((child): child is TreeNode => typeof child !== 'string')
    .flatMap((child) => walk(child)),
];

const render = (ui: React.ReactNode): TreeNode => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(ui);
  });
  expect(tree.toJSON()).not.toBeNull();
  return tree.toJSON() as unknown as TreeNode;
};

const renderSideMenu = (unseen: {
  groups?: Record<string, number>;
  direct?: Record<string, number>;
}) => {
  mockUnseenData = { groups: {}, direct: {}, ...unseen };
  return render(
    <SideMenu
      handleNavigation={() => {}}
      onNotificationPress={() => {}}
      onProfilePress={() => {}}
    />
  );
};

// The real UnreadBadge flattens into a host `View` (function components are
// elided from the rendered tree), so the badge is detected by its pill
// classes + geometry, which pins the call site end-to-end.
const badgeViews = (root: TreeNode): TreeNode[] =>
  walk(root).filter(
    (n) =>
      n.type === 'View' &&
      typeof n.props?.className === 'string' &&
      String(n.props.className).includes('bg-destructive')
  );

describe('SideMenu unread badges (#2106)', () => {
  test('Groups row renders the badge when the group count is positive', () => {
    const root = renderSideMenu({ groups: { 'group-1': 3 } });
    const badges = badgeViews(root);
    expect(badges).toHaveLength(1);
    // The label is the real formatBadgeCount output for 3.
    const texts = walk(badges[0]).filter((n) => n.type === 'ThemedText');
    expect(texts).toHaveLength(1);
    expect(texts[0].children).toContain('3');
    // The geometry contract holds through the call site: minWidth, no width.
    const style = badges[0].props!.style as Record<string, unknown>;
    expect(style.minWidth).toBe(20);
    expect(style).not.toHaveProperty('width');
  });

  test('no badge is rendered when the group count is 0', () => {
    const root = renderSideMenu({});
    expect(badgeViews(root)).toHaveLength(0);
  });

  test('no inline fixed-size pill markup remains in the menu rows', () => {
    const root = renderSideMenu({ groups: { g: 7 }, direct: { c: 2 } });
    const fixedPills = walk(root).filter((n) => {
      if (n.type !== 'View') return false;
      const cls = n.props?.className;
      return typeof cls === 'string' && cls.includes('size-5');
    });
    expect(fixedPills).toHaveLength(0);
  });
});
