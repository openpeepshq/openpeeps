/**
 * Smoke test for the resource category param pass-through and the params
 * mirror write-back (issue #1750, review round 3).
 *
 * `navigate('TabNavigator', { screen: 'Resources', params: { category } })`
 * must reach `route.params.category` in `ResourcesIndex` and seed the
 * `ResourceLibrary` — React Navigation plumbing that silently drops values
 * when navigating to an already-mounted tab.
 */
import React from 'react';
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { beforeEach } from '@jest/globals';
import { ResourcesIndex } from './Index';

let mockRouteParams: { category?: string[] } | undefined;
const setParams = jest.fn();

jest.mock('react-native-config', () => ({ __esModule: true, default: {} }));

jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, null, props.children);
  return { View: make('view'), Pressable: make('pressable') };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ setParams }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; count?: number }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useCurrentProfile: () => undefined,
  useDefaultVisibility: () => 'public',
}));

jest.mock('../../components/layout', () => ({
  useSetPageHeader: () => {},
}));

jest.mock('../../components/post/index', () => ({
  NewResourceButton: () => null,
}));

let mockCategoryPath: string[] | undefined;
jest.mock('../../components/resources/index', () => ({
  ResourceLibrary: (props: {
    categoryPath?: string[];
    onCategoryChange?: (path: string[]) => void;
  }) => {
    mockCategoryPath = props.categoryPath;
    mockOnCategoryChange = props.onCategoryChange;
    return null;
  },
}));

let mockOnCategoryChange: ((path: string[]) => void) | undefined;

jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: ({ children }: { children?: ReactNode }) => (
    <view>{children}</view>
  ),
}));

const render = (ui: ReactNode) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(ui);
  });
  return tree;
};

describe('ResourcesIndex category param pass-through', () => {
  beforeEach(() => {
    setParams.mockClear();
  });

  afterEach(() => {
    mockRouteParams = undefined;
    mockCategoryPath = undefined;
    mockOnCategoryChange = undefined;
  });

  it('seeds the library from route.params.category', () => {
    mockRouteParams = { category: ['Brand', 'Marketing'] };
    const tree = render(<ResourcesIndex />);
    expect(mockCategoryPath).toEqual(['Brand', 'Marketing']);
    tree.unmount();
  });

  it('leaves the library unfiltered when the param is absent', () => {
    mockRouteParams = undefined;
    const tree = render(<ResourcesIndex />);
    expect(mockCategoryPath).toBeUndefined();
    tree.unmount();
  });

  it('mirrors an in-library folder change into the route params', () => {
    mockRouteParams = undefined;
    const tree = render(<ResourcesIndex />);
    ReactTestRenderer.act(() => {
      mockOnCategoryChange?.(['Docs', 'Q3']);
    });
    expect(setParams).toHaveBeenCalledWith({
      category: ['Docs', 'Q3'],
    });
    tree.unmount();
  });

  it('clears the params when the library resets to All folders', () => {
    mockRouteParams = { category: ['Docs'] };
    const tree = render(<ResourcesIndex />);
    ReactTestRenderer.act(() => {
      mockOnCategoryChange?.([]);
    });
    expect(setParams).toHaveBeenCalledWith({ category: undefined });
    tree.unmount();
  });
});
