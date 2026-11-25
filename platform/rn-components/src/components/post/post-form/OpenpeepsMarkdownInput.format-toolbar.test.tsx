/**
 * Round-12 review (issue #136) item 3: a mounted integration test for the RN
 * formatting toolbar — render the real `OpenpeepsMarkdownInput` with
 * `formattingToolbar`, set a selection, apply a format through the rendered
 * buttons, and assert the formatted markdown reaches the parent `onChange`.
 * The web equivalent lives in `OpenpeepsRichMarkdownInput.test.tsx`.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Same mock surface as the sibling toolbar tests: host elements render as
// plain host tags, so the toolbar buttons show up as 'Pressable' elements.
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
jest.mock('../../ui/button', () => ({
  Button: (props: { children?: unknown }) =>
    React.createElement('Button', null, props.children),
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

import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';

// node has no rAF; the accepted-format path schedules one to drop the forced
// selection.
(
  globalThis as { requestAnimationFrame?: (cb: () => void) => number }
).requestAnimationFrame ??= (cb: () => void) => {
  cb();
  return 0;
};

type TestRendererInstance = {
  root: {
    findAllByProps: (p: Record<string, unknown>) => Array<{
      type: unknown;
      props: Record<string, unknown>;
    }>;
  };
};

const toolbarButtons = (root: TestRendererInstance['root']) =>
  root
    .findAllByProps({ accessibilityRole: 'button' })
    .filter((el) => el.type === 'Pressable');

const pressButton = (root: TestRendererInstance['root'], label: string) => {
  const button = toolbarButtons(root).find(
    (el) => el.props.accessibilityLabel === label
  );
  if (!button) throw new Error(`toolbar button "${label}" not rendered`);
  ReactTestRenderer.act(() => {
    (button as { props: { onPress: () => void } }).props.onPress();
  });
};

const select = (
  root: TestRendererInstance['root'],
  selection: { start: number; end: number }
) => {
  // The component forwards `testId` to the Textarea as `testID`.
  const textarea = root
    .findAllByProps({ testID: 'composer' })
    .find((el) => el.type === 'Textarea');
  if (!textarea) throw new Error('Textarea not rendered');
  ReactTestRenderer.act(() => {
    (
      textarea as { props: { onSelectionChange: (e: unknown) => void } }
    ).props.onSelectionChange({ nativeEvent: { selection } });
  });
};

describe('OpenpeepsMarkdownInput formatting toolbar (RN, item 3)', () => {
  // Create inside act, read `.root` after act completes (same shape as the
  // sibling `renderToolbar` / `renderWith` helpers), so the tree is stable.
  const renderToolbar = (value: string, onChange: jest.Mock) => {
    let tree: TestRendererInstance;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(OpenpeepsMarkdownInput, {
          value,
          onChange,
          formattingToolbar: true,
          testId: 'composer',
        } as never)
      );
    });
    return (tree as TestRendererInstance).root;
  };

  it('bolds a selection and pushes the result to the parent onChange', () => {
    const onChange = jest.fn();
    const root = renderToolbar('hello world', onChange);
    // Precondition: the toolbar is rendered, not just wired up in code.
    expect(toolbarButtons(root)).toHaveLength(7);

    select(root, { start: 6, end: 11 }); // "world"
    pressButton(root, 'Bold');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('hello **world**');
  });

  it('prefixes the selected line with the heading marker', () => {
    const onChange = jest.fn();
    const root = renderToolbar('title', onChange);

    select(root, { start: 0, end: 5 });
    // The simple i18n mock returns the defaultValue, so the heading button
    // is labelled "Heading" (the "2" comes from the template, not the key).
    pressButton(root, 'Heading');

    expect(onChange).toHaveBeenCalledWith('## title');
  });

  it('inserts a link at the empty selection using the default label', () => {
    const onChange = jest.fn();
    const root = renderToolbar('see docs', onChange);

    select(root, { start: 8, end: 8 }); // end of text, empty selection
    pressButton(root, 'Link');

    // Empty selection: the `link` label and a bare `https://` href are
    // inserted at the cursor (no space is added — the editor's existing
    // text precedes it directly).
    expect(onChange).toHaveBeenCalledWith('see docs[link](https://)');
  });
});
