/**
 * Pins the `buildGoto` draft route (#382): `goto({ target: 'drafts' })` must
 * reach the `Drafts` screen (a direct stack push, not a tab), and the
 * `Bookmarks` tab case that shares the surrounding switch keeps its
 * `TabNavigator` routing. The navigation directory had no test at all before
 * this PR, so a rename or reorder of either case would otherwise break the
 * native drawer link silently — the web side of the mirror has
 * `Drafts.test.tsx` for the same contract.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  Pressable: (props: Record<string, unknown> & { children?: unknown }) =>
    React.createElement('Pressable', props, props.children),
}));

import { buildGoto } from './helpers';
import type { GotoHandlerParams } from '../../types/goto';

type NavigationMock = {
  navigate: jest.Mock;
};

// Renders the goto handler as one press per target; the stub screen captures
// every navigate call the handler makes for it.
const runGoto = (
  target: string,
  params?: GotoHandlerParams
): NavigationMock => {
  const navigation = { navigate: jest.fn() } as NavigationMock;
  const Stub = () => {
    const goto = buildGoto(navigation as never);
    return React.createElement('Pressable', {
      onPress: () => goto({ target, params }),
    });
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(Stub));
  });
  ReactTestRenderer.act(() => {
    tree.root.findByType('Pressable').props.onPress();
  });
  ReactTestRenderer.act(() => tree.unmount());
  return navigation;
};

describe('buildGoto draft route (#382)', () => {
  it('drafts pushes the Drafts screen directly', () => {
    const navigation = runGoto('drafts');
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('Drafts');
    // Not a tab: no TabNavigator wrapper screen.
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      'TabNavigator',
      expect.anything()
    );
  });

  it('bookmarks still routes through the TabNavigator (adjacent case not shadowed)', () => {
    const navigation = runGoto('bookmarks');
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('TabNavigator', {
      screen: 'Bookmarks',
      params: undefined,
    });
  });
});
