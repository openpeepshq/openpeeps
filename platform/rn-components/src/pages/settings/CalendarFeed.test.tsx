/**
 * Coverage for the native CalendarFeedSettings screen (issue #408 fast-rework
 * review, item 1). The web counterpart is covered by
 * `platform/react/src/pages/settings/CalendarFeed.test.tsx`; this pins the RN
 * mirror: the same feedUrl/busy/toast surface rendered through the RN
 * primitives (Button, ThemedText, Toast.show, Clipboard.setString), the
 * state-specific busy labels, and the create/delete wiring to the shared
 * `useCalendarFeedLink` hook.
 *
 * The node jest env has no native modules, so react-native, toast, clipboard,
 * i18n, the page-chrome barrel and the shared hook are mocked (mirroring
 * Welcome.test.tsx / Members.test.tsx); the screen itself renders for real
 * under react-test-renderer. The Button mock synthesizes a testID from the
 * variant/size props so the copy (ghost icon), delete (outline) and create
 * (default) buttons are queryable without asserting on style props.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');
const { act } = React;

let mockHook: {
  feedUrl: string | undefined;
  creating: boolean;
  revoking: boolean;
  status: { type: 'success' | 'error'; message: string } | null;
  createLink: () => Promise<unknown>;
  revokeLink: () => Promise<unknown>;
};

const toastShowMock = jest.fn();
const setStringMock = jest.fn();
const setPageHeaderSpy = jest.fn();

jest.mock('react-native', () => ({
  View: (props: { className?: string; children?: unknown }) =>
    React.createElement('View', { className: props.className }, props.children),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: setStringMock },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: toastShowMock },
}));

// The screen calls t(key) without defaultValue — resolve keys verbatim.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../components/layout', () => ({
  useSetPageHeader: (...args: unknown[]) => setPageHeaderSpy(...args),
}));

jest.mock('../../components/icons/index', () => ({
  CopyIcon: () => React.createElement('CopyIcon'),
}));

jest.mock('../../components/ui/button', () => ({
  Button: (props: {
    children?: unknown;
    onPress?: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
    variant?: string;
    size?: string;
  }) =>
    React.createElement(
      'Button',
      {
        'testID':
          props.variant === 'outline'
            ? 'delete-button'
            : props.size === 'icon'
              ? 'copy-button'
              : 'action-button',
        'onPress': props.onPress,
        'disabled': props.disabled,
        'aria-label': props.accessibilityLabel,
      },
      props.children
    ),
}));

jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown; selectable?: boolean }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: (props: { children?: unknown }) =>
    React.createElement('ThemedView', null, props.children),
}));

jest.mock('@openpeepshq/react', () => ({
  useCalendarFeedLink: () => mockHook,
}));

import { CalendarFeedSettings } from './CalendarFeed';

const FEED_URL =
  'https://ap.social/api/openpeeps/core/v1/events/feed?token=abc123';

const resetHook = () => {
  mockHook = {
    feedUrl: undefined,
    creating: false,
    revoking: false,
    status: null,
    createLink: jest.fn(() => Promise.resolve({ token: 'abc123' })),
    revokeLink: jest.fn(() => Promise.resolve({})),
  };
};

const screenElement = () =>
  React.createElement(CalendarFeedSettings, {
    navigation: { navigate: () => {} },
  } as unknown as never);

const renderScreen = () => {
  let renderer: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(screenElement());
  });
  return renderer as ReturnType<typeof ReactTestRenderer.create>;
};

const updateScreen = (
  renderer: ReturnType<typeof ReactTestRenderer.create>
) => {
  ReactTestRenderer.act(() => {
    renderer.update(screenElement());
  });
};

describe('RN CalendarFeedSettings screen', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    resetHook();
    toastShowMock.mockClear();
    setStringMock.mockClear();
    setPageHeaderSpy.mockClear();
  });

  it('renders the create action and sets the page header', () => {
    const renderer = renderScreen();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('settings.calendarFeed.introTitle');
    expect(json).toContain('settings.calendarFeed.create');
    // No link box before a link exists.
    expect(json).not.toContain(FEED_URL);
    expect(setPageHeaderSpy).toHaveBeenCalledWith(
      'settings.calendarFeed.title'
    );
    // No toast before any action.
    expect(toastShowMock).not.toHaveBeenCalled();
  });

  it('shows the state-specific creating copy and disables the action while creating', () => {
    mockHook.creating = true;
    const renderer = renderScreen();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('settings.calendarFeed.creating');
    expect(json).not.toContain('settings.calendarFeed.create"');
    const button = renderer.root.findAllByProps({ testID: 'action-button' })[0];
    expect(button.props.disabled).toBe(true);
  });

  it('create flow: pressing create calls the hook; the URL renders and the copy button is wired to the clipboard', async () => {
    const renderer = renderScreen();
    const createButton = renderer.root.findAllByProps({
      testID: 'action-button',
    })[0];
    expect(createButton.props.disabled).toBe(false);
    await act(async () => {
      createButton.props.onPress();
    });
    expect(mockHook.createLink).toHaveBeenCalledTimes(1);

    // The hook resolved the feed URL — re-render with it.
    mockHook.feedUrl = FEED_URL;
    updateScreen(renderer);
    const json = JSON.stringify(renderer.toJSON());
    // The URL is rendered in the link box.
    expect(json).toContain(FEED_URL);
    // Copy button (icon size, ghost variant) is wired to the clipboard.
    const copyButton = renderer.root.findAllByProps({
      testID: 'copy-button',
    })[0];
    expect(copyButton.props['aria-label']).toBe('settings.calendarFeed.copy');
    act(() => {
      copyButton.props.onPress();
    });
    expect(setStringMock).toHaveBeenCalledWith(FEED_URL);
    // The delete action is present and enabled.
    const deleteButton = renderer.root.findAllByProps({
      testID: 'delete-button',
    })[0];
    expect(deleteButton.props.disabled).toBe(false);
    expect(json).toContain('settings.calendarFeed.delete');
  });

  it('shows the state-specific deleting copy and disables the delete action while revoking', () => {
    mockHook.feedUrl = FEED_URL;
    mockHook.revoking = true;
    const renderer = renderScreen();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('settings.calendarFeed.deleting');
    expect(json).not.toContain('settings.calendarFeed.delete"');
    const deleteButton = renderer.root.findAllByProps({
      testID: 'delete-button',
    })[0];
    expect(deleteButton.props.disabled).toBe(true);
  });

  it('revoke flow: pressing delete calls the hook; the toast carries the hook status and the screen returns to create', async () => {
    const renderer = renderScreen();
    mockHook.feedUrl = FEED_URL;
    updateScreen(renderer);
    const deleteButton = renderer.root.findAllByProps({
      testID: 'delete-button',
    })[0];
    await act(async () => {
      deleteButton.props.onPress();
    });
    expect(mockHook.revokeLink).toHaveBeenCalledTimes(1);

    // The hook revoked the link — re-render with the cleared feed and the
    // success status the real hook sets.
    mockHook.feedUrl = undefined;
    mockHook.status = {
      type: 'success',
      message: 'settings.calendarFeed.revokeSuccess',
    };
    updateScreen(renderer);
    // Toast.show received the hook's status type and message.
    expect(toastShowMock).toHaveBeenCalledWith({
      type: 'success',
      text1: 'settings.calendarFeed.revokeSuccess',
    });
    // Back to the create action, no link box.
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain(FEED_URL);
    expect(json).toContain('settings.calendarFeed.create');
    expect(
      renderer.root.findAllByProps({ testID: 'delete-button' })
    ).toHaveLength(0);
  });

  it('renders an error status as an error toast', () => {
    const renderer = renderScreen();
    mockHook.status = {
      type: 'error',
      message: 'Could not create the calendar link.',
    };
    updateScreen(renderer);
    // Toast.show received the hook's error status — the native branch that
    // maps a failed create/revoke to the error (destructive) toast layout.
    expect(toastShowMock).toHaveBeenCalledWith({
      type: 'error',
      text1: 'Could not create the calendar link.',
    });
  });
});
