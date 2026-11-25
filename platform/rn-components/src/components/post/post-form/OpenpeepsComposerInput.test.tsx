/**
 * Round-15 review (issue #136) item 1: the RN `OpenpeepsComposerInput` toggle
 * routes every RN long-form form and both conversation surfaces, but only the
 * toolbar logic beneath it was tested. This suite pins the routing itself:
 * plain mode is the default and renders no toolbar, pressing "Rich text"
 * mounts the formatting toolbar, pressing "Markdown" removes it, and every
 * typed value still reaches the parent `onChange` unchanged.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  View: (props: Record<string, unknown>) =>
    React.createElement('View', props, props.children),
  Pressable: (props: Record<string, unknown>) =>
    React.createElement('Pressable', props, props.children),
  ScrollView: (props: Record<string, unknown>) =>
    React.createElement('ScrollView', null, props.children),
  Linking: { openURL: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts: { defaultValue?: string } = {}) =>
      opts.defaultValue ?? key,
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    currentProfile: { id: 'me', roles: [] },
    openpeepsApi: { useSearchProfiles: () => ({ data: undefined }) },
  }),
}));
jest.mock('../../../lib/utils', () => ({
  cn: (...a: unknown[]) => a.filter(Boolean).join(' '),
  maxContentLength: 500,
}));
jest.mock('../../../lib/media-url', () => ({
  toAbsoluteMediaUrl: (u?: string) => (u ? `https://x${u}` : undefined),
}));
jest.mock('../../markdown/index', () => ({ OpenpeepsMarkdown: () => null }));
jest.mock('../../profile/Avatar', () => ({ ProfileAvatar: () => null }));
// The toggle finder below locates the two mode toggles by `accessibilityState`,
// so the mock must keep that prop — not just the sibling toolbar tests' bare
// children pass-through.
jest.mock('../../ui/button', () => ({
  Button: (props: Record<string, unknown>) =>
    React.createElement('Button', props, props.children),
}));
jest.mock('../../ui/textarea', () => ({
  Textarea: React.forwardRef(
    (props: Record<string, unknown>, _ref: React.Ref) =>
      React.createElement('Textarea', props)
  ),
}));
jest.mock('../../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

import { OpenpeepsComposerInput } from './OpenpeepsMarkdownInput';

type TestRendererInstance = {
  root: {
    findAllByProps: (p: Record<string, unknown>) => Array<{
      type: unknown;
      props: Record<string, unknown>;
    }>;
  };
};

// The composer renders each toggle as the component's own `Button` (the only
// ones carrying `accessibilityState`) wrapping a `ThemedText` label.
// `findAllByProps({ accessibilityLabel })` cannot match elements whose prop
// values are elements, so the toggles are located by type name + label text.
type ComposerTreeNode = {
  type?: { name?: string };
};

const toggleButton = (root: TestRendererInstance['root'], label: string) => {
  const node = root
    .findAll(
      (n) =>
        (n as unknown as ComposerTreeNode).type?.name === 'Button' &&
        (n as unknown as { props: Record<string, unknown> }).props
          ?.accessibilityState !== undefined
    )
    .find(
      (n) =>
        String(
          (
            React.Children.toArray(
              (n as unknown as { props: { children?: unknown } }).props.children
            )[0] as { props?: { children?: unknown } }
          )?.props?.children
        ) === label
    );
  if (!node) throw new Error(`toggle button "${label}" not rendered`);
  return node;
};

const pressToggle = (root: TestRendererInstance['root'], label: string) => {
  ReactTestRenderer.act(() => {
    (
      toggleButton(root, label) as { props: { onPress: () => void } }
    ).props.onPress();
  });
};

// The component forwards `testId` to the Textarea as `testID`.
const typeInField = (root: TestRendererInstance['root'], text: string) => {
  const field = root
    .findAllByProps({ testID: 'composer' })
    .find((el) => el.type === 'Textarea');
  if (!field) throw new Error('markdown field not rendered');
  ReactTestRenderer.act(() => {
    (
      field as { props: { onChangeText: (t: string) => void } }
    ).props.onChangeText(text);
  });
};

// The toolbar buttons are the only `Pressable` `accessibilityRole="button"`
// elements on the tree (the toggles are `Button`s, not host tags).
const toolbarButtonCount = (root: TestRendererInstance['root']) =>
  root
    .findAllByProps({ accessibilityRole: 'button' })
    .filter((el) => el.type === 'Pressable').length;

describe('OpenpeepsComposerInput mode toggle (RN)', () => {
  // Create inside act, read `.root` after act completes (same shape as the
  // sibling toolbar tests), so the tree is stable.
  const renderComposer = (onChange: jest.Mock) => {
    let tree: TestRendererInstance;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(OpenpeepsComposerInput, {
          value: '',
          onChange,
          testId: 'composer',
        } as never)
      );
    });
    return (tree as TestRendererInstance).root;
  };

  it('defaults to plain markdown mode without the formatting toolbar', () => {
    const root = renderComposer(jest.fn());
    expect(toolbarButtonCount(root)).toBe(0);
  });

  it('mounts the formatting toolbar in rich mode and unmounts it again', () => {
    const onChange = jest.fn();
    const root = renderComposer(onChange);

    pressToggle(root, 'Rich text');
    // Deliberately not a fixed count: a button added to or removed from the
    // toolbar would fail this routing test. Assert the toolbar renders at
    // least one button plus the named bold button.
    expect(toolbarButtonCount(root)).toBeGreaterThan(0);
    const boldButton = root
      .findAllByProps({ accessibilityRole: 'button' })
      .find(
        (el) =>
          el.type === 'Pressable' && el.props.accessibilityLabel === 'Bold'
      );
    expect(boldButton).toBeDefined();

    pressToggle(root, 'Markdown');
    expect(toolbarButtonCount(root)).toBe(0);
  });

  it('keeps pushing typed text to onChange in both modes', () => {
    const onChange = jest.fn();
    const root = renderComposer(onChange);

    typeInField(root, 'plain **text**');
    expect(onChange).toHaveBeenLastCalledWith('plain **text**');

    pressToggle(root, 'Rich text');
    typeInField(root, 'plain **text** and rich');
    expect(onChange).toHaveBeenLastCalledWith('plain **text** and rich');
  });
});
