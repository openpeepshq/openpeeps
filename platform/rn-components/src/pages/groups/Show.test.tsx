/**
 * Regression tests for the Group screen's tab/category params (issue #1750,
 * review round 2): a stack `navigate` to an already-mounted Group route
 * replaces the params, so a later navigation that omits `tab`/`category`
 * must not inherit the previous visit's resources-tab folder filter.
 */
import React, { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GroupShow } from './Show';

type GroupParams = {
  id?: string;
  handle?: string;
  tab?: 'resources' | 'posts' | 'events' | 'description';
  category?: string[];
};

let mockParams: GroupParams;
const setParams = jest.fn();

jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, null, props.children);
  return {
    View: make('view'),
    Pressable: make('pressable'),
    ActivityIndicator: make('activity-indicator'),
    RefreshControl: make('refresh-control'),
    ScrollView: make('scroll-view'),
  };
});

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: (props: { children?: ReactNode }) =>
    React.createElement('scroll-view', null, props.children),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({}));

jest.mock('@openpeepshq/common/lib', () => ({
  groupName: () => 'Group',
  groupSectionFromHash: (hash: string) =>
    (hash.replace('#', '') || 'posts') as
      | 'resources'
      | 'posts'
      | 'events'
      | 'description',
}));

jest.mock('@openpeepshq/react', () => ({
  useCurrentProfile: () => undefined,
  useOpenpeeps: () => ({
    openpeepsApi: {
      useGroup: () => ({ data: undefined, isLoading: false }),
      useGroupByHandle: () => ({
        data: { id: 'g1', name: 'Group', handle: 'g' },
        isLoading: false,
      }),
      useGroupUpcomingEventsFeed: () => ({ data: undefined }),
      useGroupPastEventsFeed: () => ({ data: undefined }),
    },
  }),
}));

jest.mock('../../components/layout', () => ({
  useSetPageHeader: () => {},
}));

jest.mock('../../components/groups/index', () => ({
  GroupFeed: () => null,
  GroupHeader: () => null,
}));

jest.mock('../../components/post/index', () => ({
  EventsFeed: () => null,
  EventsView: () => null,
  NewEventButton: () => null,
  NewNoteButton: () => null,
  NewResourceButton: () => null,
}));

let libraryCategoryPath: string[] | undefined;
let libraryOnCategoryChange: ((path: string[]) => void) | undefined;
jest.mock('../../components/resources', () => ({
  ResourceLibrary: (props: {
    groupId?: string;
    categoryPath?: string[];
    onCategoryChange?: (path: string[]) => void;
  }) => {
    libraryCategoryPath = props.categoryPath;
    libraryOnCategoryChange = props.onCategoryChange;
    return null;
  },
}));

jest.mock('../../components/ui/tabs', () => ({
  Tabs: (props: { children?: ReactNode }) =>
    React.createElement('tabs', null, props.children),
  TabsContent: (props: { children?: ReactNode }) =>
    React.createElement('tabs-content', null, props.children),
  TabsList: (props: { children?: ReactNode }) =>
    React.createElement('tabs-list', null, props.children),
  TabsTrigger: (props: { children?: ReactNode }) =>
    React.createElement('tabs-trigger', null, props.children),
}));

jest.mock('../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  truncateText: (text?: string, maxLength?: number) =>
    text && maxLength !== undefined ? text.slice(0, maxLength) : (text ?? ''),
}));

jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: (props: { children?: ReactNode }) =>
    React.createElement('text', null, props.children),
}));

jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: (props: { children?: ReactNode }) =>
    React.createElement('view', null, props.children),
}));

jest.mock('./Info', () => ({
  GroupInfoAsComponent: () => null,
}));

const render = () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <GroupShow
        route={{ params: mockParams } as never}
        navigation={
          {
            setParams,
            addListener: () => () => {},
          } as never
        }
      />
    );
  });
  return tree;
};

describe('GroupShow tab/category params', () => {
  beforeEach(() => {
    setParams.mockClear();
    libraryCategoryPath = undefined;
    libraryOnCategoryChange = undefined;
  });

  it('seeds the resources tab and folder from the params', () => {
    mockParams = { handle: 'g', tab: 'resources', category: ['Docs'] };
    const tree = render();
    expect(libraryCategoryPath).toEqual(['Docs']);
    tree.unmount();
  });

  it('drops stale tab/category params on a later navigation without them', () => {
    mockParams = { handle: 'g' };
    const tree = render();
    expect(libraryCategoryPath).toBeUndefined();
    expect(setParams).toHaveBeenCalledWith({
      tab: undefined,
      category: undefined,
    });
    tree.unmount();
  });

  it('mirrors an in-library folder change into the params', () => {
    mockParams = { handle: 'g', tab: 'resources' };
    const tree = render();
    ReactTestRenderer.act(() => {
      libraryOnCategoryChange?.(['Docs', 'Q3']);
    });
    expect(setParams).toHaveBeenCalledWith({
      category: ['Docs', 'Q3'],
    });
    tree.unmount();
  });
});
