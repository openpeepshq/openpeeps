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
