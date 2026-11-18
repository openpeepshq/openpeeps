/**
 * End-to-end category-seed re-apply contract for the RN resource library
 * (issue #1750, review round-7 item 3).
 *
 * The stale-seed defect (round-6 item 6): pressing "All" in the RN library did
 * not clear the entry page's param mirror, so a later navigation back to the
 * *same* folder was a no-op and the library showed everything instead of the
 * folder. The fix routes every in-library folder change through
 * `onCategoryChange` (the mirror), so the seed clears and a re-navigation
 * re-applies.
 *
 * This pins the contract at the seam where the bug lived, using the REAL
 * `ResourceLibrary` (its "All" breadcrumb calls `changeCategory`) and the REAL
 * `useResourceLibrary` (its re-apply effect), mocked only at the network
 * layer. The two pieces are cross-referenced:
 *   - the hook's re-apply direction is unit-tested in the react package
 *     (`platform/react/src/hooks/resources/useResourceLibrary.test.ts`);
 *   - the entry page's `setParams` mirror is covered by
 *     `pages/resources/Index.test.tsx`; here the `categoryPath` prop is driven
 *     the same way that page drives it from `route.params.category`.
 *
 * `@openpeepshq/react` is mocked to expose ONLY the real hook (the barrel
 * re-exports native-only deps that jest cannot load); the hook's own internal
 * deps are mocked at the network layer below. The common-lib helpers are the
 * real implementations (copied verbatim) so the filter/tree behave as in
 * production — importing the file directly would pull zod through RN jest's
 * CommonJS transform, which the repo avoids.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Real common/lib helpers, copied verbatim from platform/common/src/lib/resources.ts.
const pathStartsWith = (
  path: readonly string[],
  prefix: readonly string[]
): boolean =>
  prefix.length <= path.length &&
  prefix.every((segment, index) => path[index] === segment);

const categoryPathKey = (path: readonly string[]): string =>
  JSON.stringify(path);

const normalizeResourceTags = (
  tags: readonly string[] | undefined
): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const tag = raw.replace(/^#/, '').trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
};

type CategoryTreeNode = {
  name: string;
  path: string[];
  children: CategoryTreeNode[];
};

const categoryTreeFromPaths = (
  paths: readonly (readonly string[])[]
): CategoryTreeNode[] => {
  const root: CategoryTreeNode[] = [];
  for (const path of paths) {
    let level = root;
    const acc: string[] = [];
    for (const name of path) {
      const segment = name.trim();
      if (!segment) continue;
      acc.push(segment);
      let node = level.find((entry) => entry.name === segment);
      if (!node) {
        node = { name: segment, path: [...acc], children: [] };
        level.push(node);
      }
      level = node.children;
    }
  }
  return root;
};

const RESOURCE_KINDS = ['video', 'file', 'gallery', 'audio', 'link'];

// Network-layer mocks for the real hook's internal deps.
jest.mock('../../../../react/src/contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePostsByType: () => ({ data: { pages: [[]] }, isPending: false }),
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
    },
  }),
}));
jest.mock('../../../../react/src/hooks/useResolvedFeedFormat', () => ({
  useFeedListParams: () => ({ format: 'linear' }),
}));
jest.mock('@openpeepshq/common/lib', () => ({
  categoryTreeFromPaths,
  normalizeResourceTags,
  pathStartsWith,
  categoryPathKey,
  RESOURCE_KINDS,
}));
// Expose ONLY the real hook; the @openpeepshq/react barrel re-exports native
// deps that jest cannot load.
jest.mock('@openpeepshq/react', () => ({
  useResourceLibrary: jest.requireActual(
    '../../../../react/src/hooks/resources/useResourceLibrary'
  ).useResourceLibrary,
}));

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  Pressable: (props: {
    children?: unknown;
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
  }) =>
    React.createElement(
      'Pressable',
      {
        onPress: props.onPress,
        accessibilityLabel: props.accessibilityLabel,
        accessibilityRole: props.accessibilityRole,
      },
      props.children
    ),
  ScrollView: (props: { children?: unknown }) =>
    React.createElement('ScrollView', null, props.children),
  TextInput: (props: {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
  }) =>
    React.createElement('TextInput', {
      value: props.value,
      onChangeText: props.onChangeText,
      placeholder: props.placeholder,
    }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn() }),
}));

jest.mock('../ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('TextInput', props),
}));
jest.mock('../ui/loading-spinner', () => ({ LoadingSpinner: () => null }));
jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));
jest.mock('../icons', () => ({
  LayoutGridIcon: () => null,
  LayoutListIcon: () => null,
  BookmarkIcon: () => null,
  ChevronDownIcon: () => null,
  ChevronRightIcon: () => null,
}));
jest.mock('./ResourceCard', () => ({ ResourceCard: () => null }));

import type { ResourceLibraryProps } from './ResourceLibrary';
import { ResourceLibrary } from './ResourceLibrary';

const flatText = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root
    .findAll((node: { props?: { children?: unknown } }) =>
      Array.isArray(node.props?.children)
    )
    .map((node) =>
      React.Children.toArray((node.props?.children ?? []) as React.ReactNode[])
        .map((child) =>
          typeof child === 'string' ? child : textOf(child as unknown)
        )
        .join('')
    )
    .join('|');

const textOf = (node: unknown): string => {
  const props = (node as { props?: { children?: unknown } }).props;
  if (!props) return '';
  return React.Children.toArray(props.children ?? [])
    .map((child) =>
      typeof child === 'string' ? child : textOf(child as unknown)
    )
    .join('');
};

describe('ResourceLibrary category seed re-apply (issue #1750)', () => {
  let onCategoryChange: jest.Mock;
  let tree: ReturnType<typeof ReactTestRenderer.create>;

  const element = (categoryPath?: string[]) =>
    React.createElement(ResourceLibrary, {
      categoryPath,
      onCategoryChange,
    } as ResourceLibraryProps);

  const render = (categoryPath?: string[]) => {
    onCategoryChange = jest.fn();
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(element(categoryPath));
    });
  };

  const rerender = (categoryPath?: string[]) => {
    ReactTestRenderer.act(() => {
      tree.update(element(categoryPath));
    });
  };

  // The "All" breadcrumb is the last bare-"All" Pressable (the kind-filter
  // pill "All" renders first); the react-native mock drops className.
  const pressAllBreadcrumb = () => {
    const alls = tree.root
      .findAllByType('Pressable')
      .filter((node) => textOf(node) === 'All');
    const node = alls[alls.length - 1];
    expect(node).toBeTruthy();
    ReactTestRenderer.act(() => {
      node.props.onPress?.();
    });
  };

  it('re-applies the same folder after All clears the entry seed (the round-6 fix)', () => {
    // Seed the library to a folder (what the entry page does from route.params).
    render(['Brand', 'Marketing']);
    expect(flatText(tree)).toContain('Brand / Marketing');
    onCategoryChange.mockClear();

    // Press the real "All" breadcrumb. It must mirror the reset into the
    // entry seed via onCategoryChange so the route param clears.
    pressAllBreadcrumb();
    expect(onCategoryChange).toHaveBeenCalledWith([]);

    // The entry page reacts by clearing its seed; re-render without it.
    rerender(undefined);
    expect(flatText(tree)).not.toContain('Brand / Marketing');

    // Re-navigate to the SAME folder. Because the seed was cleared first,
    // the hook's re-apply effect sees a changed seed and re-applies the folder
    // — the exact scenario the stale-seed bug broke.
    rerender(['Brand', 'Marketing']);
    expect(flatText(tree)).toContain('Brand / Marketing');
    tree.unmount();
  });

  it('does not re-apply the same folder while the entry seed is unchanged', () => {
    // Negative control: re-rendering with the unchanged seed (no mirror
    // clear) is a no-op — proving the round-trip above depends on the seed
    // being cleared first, which is the fix.
    render(['Brand', 'Marketing']);
    expect(flatText(tree)).toContain('Brand / Marketing');

    // User resets locally via the real "All" breadcrumb; the seed is NOT
    // cleared here (simulating the pre-fix stale mirror).
    pressAllBreadcrumb();
    expect(flatText(tree)).not.toContain('Brand / Marketing');

    // Same seed again: the hook's re-apply effect sees no change and does
    // not restore the folder.
    rerender(['Brand', 'Marketing']);
    expect(flatText(tree)).not.toContain('Brand / Marketing');
    tree.unmount();
  });
});
