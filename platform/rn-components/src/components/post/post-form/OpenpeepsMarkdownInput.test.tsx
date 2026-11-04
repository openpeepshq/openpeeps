/**
 * Regression test for the round-3 review on issue #136: the RN formatting
 * toolbar's heading button uses the locale key
 * `form.richMarkdown.toolbar.blockTypes.heading`, whose template is
 * "Heading {{level}}". It must pass a `level` so screen readers hear
 * "Heading 2" instead of the uninterpolated literal "Heading {{level}}".
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// --- react-native: host elements render as plain host tags ----------------
jest.mock('react-native', () => ({
  View: (props: Record<string, unknown>) =>
    React.createElement('View', props, props.children),
  Pressable: (props: Record<string, unknown>) =>
    React.createElement('Pressable', props, props.children),
  ScrollView: (props: Record<string, unknown>) =>
    React.createElement('ScrollView', null, props.children),
  Linking: { openURL: jest.fn() },
}));

// --- i18n: resolve keys with a minimal i18next-style interpolation ---------
// The heading key maps to the real template so the test proves the button
// passes `level` and the template interpolates (not a literal `{{level}}`).
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      opts: Record<string, unknown> & { defaultValue?: string } = {}
    ) => {
      const templates: Record<string, string> = {
        'form.richMarkdown.toolbar.blockTypes.heading': 'Heading {{level}}',
      };
      const base = templates[key] ?? opts.defaultValue ?? key;
      return base.replace(/\{\{(\w+)\}\}/g, (m, name: string) =>
        name in opts ? String(opts[name]) : m
      );
    },
  }),
}));

// --- shared + local deps: inert or pure -----------------------------------
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

type TestRendererInstance = {
  root: {
    findAllByProps: (p: Record<string, unknown>) => Array<{
      type: unknown;
      props: Record<string, unknown>;
    }>;
  };
};

const renderToolbar = () => {
  let tree: TestRendererInstance;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(OpenpeepsMarkdownInput, {
        value: 'hi',
        onChange: jest.fn(),
        formattingToolbar: true,
      } as never)
    );
  });
  return (tree as TestRendererInstance).root;
};

// The react-native mock spreads props into a host tag, so each button shows
// up once as the (host) element and once as its component fiber; keep the
// host elements only (`type === 'Pressable'`).
const toolbarButtons = (root: TestRendererInstance['root']) =>
  root
    .findAllByProps({ accessibilityRole: 'button' })
    .filter((el) => el.type === 'Pressable');

describe('OpenpeepsMarkdownInput formatting toolbar (RN)', () => {
  it('renders all seven formatting buttons', () => {
    const buttons = toolbarButtons(renderToolbar());
    expect(buttons).toHaveLength(7);
  });

  it('interpolates the heading label to "Heading 2", not a literal {{level}}', () => {
    const labels = toolbarButtons(renderToolbar()).map(
      (el) => el.props.accessibilityLabel as string
    );
    expect(labels).toContain('Heading 2');
    // The regression: an uninterpolated placeholder must never reach a11y.
    for (const label of labels) {
      expect(label).not.toContain('{{');
      expect(label).not.toContain('}}');
    }
  });
});
