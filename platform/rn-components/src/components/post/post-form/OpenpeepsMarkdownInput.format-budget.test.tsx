/**
 * Round-6 review (issue #136) item 5: the RN formatting toolbar's cap must
 * judge the budget on the *visible* text length (the shared measure the
 * counter and the web rich gate use), not the raw markdown length. A
 * long-link document that is raw-over but visible-under must be able to
 * bold, while a genuinely visible-over document must be refused.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// react-native: host elements render as plain host tags.
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

import { visibleTextLength } from '@openpeepshq/common';
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

const MAX = 500; // matches the '../../../lib/utils' mock's maxContentLength

const renderWith = (value: string, onChange: jest.Mock) => {
  let tree: TestRendererInstance;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(OpenpeepsMarkdownInput, {
        value,
        onChange,
        formattingToolbar: true,
        // Default selection is the end of the text (selectionRef init), so
        // the first word of `value` is the formatting target.
      } as never)
    );
  });
  return (tree as TestRendererInstance).root;
};

const boldButton = (root: TestRendererInstance['root']) =>
  root
    .findAllByProps({ accessibilityRole: 'button' })
    .filter((el) => el.type === 'Pressable')
    .find((el) => el.props.accessibilityLabel === 'Bold');

describe('OpenpeepsMarkdownInput applyFormat budget (RN, item 5)', () => {
  // A markdown link whose URL is the budget eater: `visibleTextLength`
  // counts the link text, not the URL. (A bare URL would count verbatim.)
  // Bold with the default (end-of-text) selection appends `**`, so the raw
  // length grows by two while the visible length is unchanged.
  const longUrl = 'https://example.com/' + 'a'.repeat(550);
  const longLinkValue = `hello world\n[see](${longUrl})`;

  it('allows bold on a raw-over / visible-under document (long link)', () => {
    // Preconditions: raw source is over budget, visible text is well under.
    expect(longLinkValue.length).toBeGreaterThan(MAX);
    expect(visibleTextLength(longLinkValue)).toBeLessThanOrEqual(MAX);

    const onChange = jest.fn();
    const root = renderWith(longLinkValue, onChange);
    ReactTestRenderer.act(() => {
      (boldButton(root) as { props: { onPress: () => void } }).props.onPress();
    });

    // The bold wrap must be accepted (visible text stays under budget).
    // Bolding the default end-of-text (empty) selection inserts the open and
    // close markers together (`****`), so the raw length grows while the
    // visible length does not. The regression this test pins is the
    // *acceptance* itself: a raw-length cap would have refused the insert
    // because `result.length` is over budget here.
    expect(onChange).toHaveBeenCalledTimes(1);
    const result = onChange.mock.calls[0][0] as string;
    expect(result.length).toBeGreaterThan(MAX);
    expect(visibleTextLength(result)).toBeLessThanOrEqual(MAX);
  });

  it('refuses bold on a visible-over document', () => {
    const value = 'hello ' + 'x'.repeat(MAX);
    expect(visibleTextLength(value)).toBeGreaterThan(MAX);

    const onChange = jest.fn();
    const root = renderWith(value, onChange);
    ReactTestRenderer.act(() => {
      (boldButton(root) as { props: { onPress: () => void } }).props.onPress();
    });

    // Refused: the visible result would exceed the budget.
    expect(onChange).not.toHaveBeenCalled();
  });
});
