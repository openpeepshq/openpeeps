/**
 * Regression tests for the folder-tree collision (issue #2148) and the
 * RN CategoryPathPicker's web-parity semantics.
 *
 * A folder literally named `[TEST] A/B` and a folder `[TEST] A` containing
 * a subfolder `B` used to produce the same `/`-joined identity key, so the
 * two collapsed into one tree node (counts 2 instead of 1/1, shared
 * expand/selection). The picker test locks in the maintainer's ask: typing
 * `A/B` into "Add a folder" must report a single segment, never split.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

let mockTranslations: Record<string, string> = {};
let mockLibrary: Record<string, unknown> = {};

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
      mockTranslations[key] ?? opts?.defaultValue ?? key,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@openpeepshq/common/lib', () => ({
  // Mirrored from platform/common/src/lib/resources.ts — the built
  // package ships ESM which Jest's node transform doesn't cover.
  categoryPathKey: (path: readonly string[]): string => JSON.stringify(path),
  RESOURCE_KINDS: ['video', 'file', 'gallery', 'audio', 'link'],
}));

jest.mock('@openpeepshq/react', () => ({
  useResourceLibrary: () => mockLibrary,
}));

jest.mock('../ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('TextInput', props),
}));

jest.mock('../ui/loading-spinner', () => ({
  LoadingSpinner: () => null,
}));

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

jest.mock('./ResourceCard', () => ({
  ResourceCard: () => null,
}));

import type { CategoryPathPickerProps } from './CategoryPathPicker';
import { CategoryPathPicker } from './CategoryPathPicker';
import type { ResourceLibraryProps } from './ResourceLibrary';
import { ResourceLibrary } from './ResourceLibrary';

const slashPost = {
  id: 'p-slash',
  type: 'resource',
  data: {
    type: 'resource',
    title: 'Slash folder',
    categoryPath: ['[TEST] A/B'],
  },
};

const nestedPost = {
  id: 'p-nested',
  type: 'resource',
  data: {
    type: 'resource',
    title: 'Nested folder',
    categoryPath: ['[TEST] A', 'B'],
  },
};

const libraryFor = (posts: unknown[]) => ({
  posts,
  tree: [
    {
      name: '[TEST] A/B',
      path: ['[TEST] A/B'],
      children: [],
    },
    {
      name: '[TEST] A',
      path: ['[TEST] A'],
      children: [{ name: 'B', path: ['[TEST] A', 'B'], children: [] }],
    },
  ],
  tags: [],
  pathPrefix: [] as string[],
  hierarchy: true,
  setPathPrefix: jest.fn(),
  setHierarchy: jest.fn(),
  query: { isLoading: false },
  search: '',
  setSearch: jest.fn(),
  kind: 'all',
  setKind: jest.fn(),
  view: 'list',
  setView: jest.fn(),
  saved: false,
  setSaved: jest.fn(),
  selectedTags: [] as string[],
  toggleTag: jest.fn(),
  tagsOpen: false,
  setTagsOpen: jest.fn(),
  activeFilterCount: 0,
});

const render = (element: React.ReactElement) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree!;
};

const pressables = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAllByType('Pressable');

const pressLabel = (
  tree: ReturnType<typeof ReactTestRenderer.create>,
  label: string
) => {
  const targets = pressables(tree).filter(
    (node: { props: { accessibilityLabel?: string } }) =>
      node.props.accessibilityLabel === label
  );
  ReactTestRenderer.act(() => {
    targets.forEach((node: { props: { onPress?: () => void } }) =>
      node.props.onPress?.()
    );
  });
};

const textOf = (node: unknown): string => {
  const props = (node as { props?: { children?: unknown } }).props;
  if (!props) return '';
  return React.Children.toArray(props.children ?? [])
    .map((child) =>
      typeof child === 'string'
        ? child
        : textOf(child as unknown as { props?: { children?: unknown } })
    )
    .join('');
};

describe('ResourceLibrary folder tree collision (issue #2148)', () => {
  beforeEach(() => {
    mockTranslations = {};
    mockLibrary = libraryFor([slashPost, nestedPost]);
  });

  it('renders two separate top-level nodes with counts of 1 each', () => {
    const tree = render(
      React.createElement(ResourceLibrary, {
        groupId: 'g1',
      } as ResourceLibraryProps)
    );

    const labels = pressables(tree).map(
      (node: { props: { accessibilityLabel?: string } }) =>
        node.props.accessibilityLabel
    );
    expect(labels).toContain('Hide folder tree');
    expect(labels).toContain('Expand folder');

    // The tree collapses behind an "All folders" root; expand it so the
    // two top-level nodes render.
    pressLabel(tree, 'Expand folder');

    const texts = tree.root
      .findAll((node: { props?: { children?: unknown } }) =>
        Array.isArray(node.props?.children)
      )
      .map(textOf);
    const flat = texts.join('|');
    // The name renders as one leaf ("[TEST] A/B") and the count as another
    // ("(1)"), separated by nested text nodes, so assert them independently.
    expect(flat).toContain('[TEST] A/B');
    expect(flat).toContain('[TEST] A');
    const counts = flat.match(/\(\d+\)/g) ?? [];
    expect(counts).not.toContain('(2)');
  });

  it('selects the slash-named folder without highlighting the nested one', () => {
    const tree = render(
      React.createElement(ResourceLibrary, {
        groupId: 'g1',
      } as ResourceLibraryProps)
    );

    // The tree collapses behind an "All folders" root; expand it so the
    // slash-named top-level node renders.
    pressLabel(tree, 'Expand folder');

    // Selecting is a pathPrefix change; the slash-named folder's path must
    // be passed through as a single segment.
    const slashNode = pressables(tree).find(
      (node: { props: { children?: unknown } }) =>
        textOf(node).startsWith('[TEST] A/B')
    );
    expect(slashNode).toBeTruthy();
    ReactTestRenderer.act(() => {
      slashNode!.props.onPress();
    });

    const setPathPrefix = mockLibrary.setPathPrefix as jest.Mock;
    expect(setPathPrefix).toHaveBeenCalledWith(['[TEST] A/B']);
  });
});

describe('CategoryPathPicker RN parity', () => {
  beforeEach(() => {
    mockTranslations = {};
  });

  it('reports a single segment for a slash-containing folder name (never splits)', () => {
    const onChange = jest.fn();
    const tree = render(
      React.createElement(CategoryPathPicker, {
        path: [],
        tree: [{ name: 'A', path: ['A'], children: [] }],
        onChange,
      } as unknown as CategoryPathPickerProps)
    );

    const input = tree.root.findAllByType('TextInput')[0];
    ReactTestRenderer.act(() => {
      input.props.onChangeText('A/B');
    });

    const add = tree.root
      .findAllByType('Pressable')
      .find(
        (node: { props: { accessibilityLabel?: string } }) =>
          node.props.accessibilityLabel === 'Add'
      );
    expect(add).toBeTruthy();
    ReactTestRenderer.act(() => {
      add!.props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith(['A/B']);
    expect(onChange).not.toHaveBeenCalledWith(['A', 'B']);
  });

  it('ignores blank input and selects an existing folder from the tree', () => {
    const onChange = jest.fn();
    const tree = render(
      React.createElement(CategoryPathPicker, {
        path: [],
        tree: [
          {
            name: '[TEST] A',
            path: ['[TEST] A'],
            children: [{ name: 'B', path: ['[TEST] A', 'B'], children: [] }],
          },
        ],
        onChange,
      } as unknown as CategoryPathPickerProps)
    );

    // Blank Add must not fire.
    const add = tree.root
      .findAllByType('Pressable')
      .find(
        (node: { props: { accessibilityLabel?: string } }) =>
          node.props.accessibilityLabel === 'Add'
      );
    ReactTestRenderer.act(() => {
      add!.props.onPress();
    });
    expect(onChange).not.toHaveBeenCalled();

    // Tapping the nested folder selects its full path.
    const nested = pressables(tree).find(
      (node: { props: { children?: unknown } }) => textOf(node) === 'B'
    );
    expect(nested).toBeTruthy();
    ReactTestRenderer.act(() => {
      nested!.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(['[TEST] A', 'B']);
  });
});

describe('ResourceLibrary category routing through onCategoryChange (issue #1750)', () => {
  const onCategoryChange = jest.fn();

  const renderWithCallback = (onCategoryChange?: (path: string[]) => void) =>
    render(
      React.createElement(ResourceLibrary, {
        onCategoryChange,
      } as ResourceLibraryProps)
    );

  const pressText = (
    tree: ReturnType<typeof ReactTestRenderer.create>,
    text: string
  ) => {
    const node = pressables(tree).find((node: { children?: unknown }) =>
      textOf(node).startsWith(text)
    );
    expect(node).toBeTruthy();
    ReactTestRenderer.act(() => {
      (node as { props: { onPress: () => void } }).props.onPress();
    });
  };

  // Two Pressables render text "All": the kind-filter pill (first) and the
  // breadcrumb "All" (last). The react-native mock drops `className`, so the
  // breadcrumb is selected as the last bare-"All" pressable.
  const pressBreadcrumbAll = (
    tree: ReturnType<typeof ReactTestRenderer.create>
  ) => {
    const alls = pressables(tree).filter(
      (n: { children?: unknown }) => textOf(n) === 'All'
    );
    const node = alls[alls.length - 1];
    expect(node).toBeTruthy();
    ReactTestRenderer.act(() => {
      (node as { props: { onPress: () => void } }).props.onPress();
    });
  };

  beforeEach(() => {
    mockTranslations = {};
    mockLibrary = libraryFor([]);
    (mockLibrary.setPathPrefix as jest.Mock).mockClear();
  });

  afterEach(() => {
    onCategoryChange.mockClear();
  });

  // The "All" breadcrumb used to call `library.setPathPrefix([])` directly,
  // bypassing the params mirror, so the entry page's seed went stale and a
  // later navigation with the same folder silently did not re-apply.
  it('routes the real "All" breadcrumb press through onCategoryChange', () => {
    const tree = renderWithCallback(onCategoryChange);
    pressBreadcrumbAll(tree);
    const setPathPrefix = mockLibrary.setPathPrefix as jest.Mock;
    expect(setPathPrefix).toHaveBeenCalledWith([]);
    expect(onCategoryChange).toHaveBeenCalledWith([]);
    tree.unmount();
  });

  // The folder tree used to call `library.setPathPrefix` directly; selecting
  // a folder now also mirrors into the params so a re-navigation re-applies.
  it('routes a real folder-tree press through onCategoryChange', () => {
    const tree = renderWithCallback(onCategoryChange);
    pressLabel(tree, 'Expand folder');
    pressText(tree, '[TEST] A/B');
    const setPathPrefix = mockLibrary.setPathPrefix as jest.Mock;
    expect(setPathPrefix).toHaveBeenCalledWith(['[TEST] A/B']);
    expect(onCategoryChange).toHaveBeenCalledWith(['[TEST] A/B']);
    tree.unmount();
  });
});
