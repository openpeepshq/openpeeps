/**
 * Regression tests for the RN account export flow (issue #237 round-8
 * review S1/S3). The page hands the shared `useAccountExport` hook an
 * external `downloadDocument` step; a failed, expired, or handed-off-failed
 * export must not be silent on RN — the hook's `status` has to surface as a
 * toast, and the handoff must receive the resolved download URL.
 *
 * The hook under test is the real react-package implementation (required
 * directly in the `@openpeepshq/react` mock, so the ESM-only transitive deps
 * of the react barrel stay out of Jest's runtime).
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Fake export job client. The status queue mirrors the react-package test:
// each poll pops the next payload, the last repeats when exhausted.
const start = jest.fn(async () => ({ data: { jobId: 'job-1' } }));
const status = jest.fn();
const downloadUrl = jest.fn(async () => 'https://x/export?token=tok');
const statusResults: Array<Record<string, unknown>> = [];
const downloadDocument = jest.fn();
const toastShow = jest.fn();

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  ActivityIndicator: () => null,
  Linking: {
    canOpenURL: jest.fn(async () => true),
    openURL: jest.fn(async () => undefined),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: (props: { children?: unknown }) =>
    React.createElement('KeyboardAwareScrollView', null, props.children),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: toastShow },
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentAccount: () => ({ data: undefined }),
      logoutAction: jest.fn(),
      updateCurrentAccountAction: jest.fn(),
      validationEmailAction: jest.fn(),
    },
    queryClient: { invalidateQueries: jest.fn() },
    client: {
      accounts: {
        current: {
          export: {
            start: () => start(),
            status: (opts: unknown) => {
              status(opts);
              const next = statusResults.shift() ?? statusResults[0];
              return Promise.resolve(next ? { data: next } : undefined);
            },
            downloadUrl: (token: string) => downloadUrl(token),
          },
        },
      },
    },
  }),
  // Real hook, straight from the react package source.
  useAccountExport:
    require('../../../../react/src/hooks/settings/useAccountExport')
      .useAccountExport,
}));

jest.mock('@openpeepshq/common', () => ({
  Account: 'Account',
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    getValues: () => ({
      email: 'a@b.c',
      oldPassword: '',
      newPassword: undefined,
      confirmPassword: undefined,
    }),
    setValue: jest.fn(),
    control: {},
  }),
}));

jest.mock('../../lib/downloadFile', () => ({
  downloadDocument,
}));

jest.mock('../../lib/push-notifications', () => ({
  unregisterPushForLogout: jest.fn(async () => 'ok'),
}));

jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: (props: { children?: unknown }) =>
    React.createElement('ThemedView', null, props.children),
}));

jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../components/ui/form', () => ({
  Form: (props: { children?: unknown }) =>
    React.createElement('Form', null, props.children),
  FormField: (props: {
    render?: (p: { field: { value: string } }) => unknown;
  }) => (props.render ? props.render({ field: { value: '' } }) : null),
  FormInput: () => null,
}));

jest.mock('../../components/ui/button', () => ({
  Button: (props: Record<string, unknown>) =>
    React.createElement('Button', props),
}));

jest.mock('../../components/layout', () => ({
  HeaderActionButton: () => null,
  useSetPageHeader: () => undefined,
}));

import { AccountSettings } from './Account';

type Instance = {
  type?: unknown;
  props?: Record<string, unknown>;
  children?: Array<unknown>;
};

let tree: ReturnType<typeof ReactTestRenderer.create> | undefined;

const renderPage = () => {
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(AccountSettings, { navigation: {} } as never)
    );
  });
};

const advance = async (ms: number) => {
  await ReactTestRenderer.act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

const toasts = () =>
  toastShow.mock.calls.map((c: Array<Record<string, unknown>>) => c[0]);

const textCount = (text: string) =>
  tree!.root.findAll(
    (node: Instance) =>
      node.type === 'ThemedText' && node.children?.includes(text)
  ).length;

// The export button (not the email-verify one): the Button whose subtree
// carries the idle "Download" label.
const downloadButton = (): Instance => {
  const buttons = tree!.root.findAll(
    (node: Instance) =>
      node.type === 'Button' && typeof node.props?.onPress === 'function'
  ) as Array<
    Instance & {
      findAll: (pred: (n: Instance) => boolean) => Instance[];
    }
  >;
  const btn = buttons.find(
    (b) =>
      b.findAll(
        (n: Instance) =>
          n.type === 'ThemedText' && n.children?.includes('Download')
      ).length > 0
  );
  if (!btn) throw new Error('download button not found');
  return btn;
};

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  start.mockClear();
  status.mockClear();
  downloadUrl.mockClear().mockResolvedValue('https://x/export?token=tok');
  statusResults.length = 0;
  downloadDocument.mockClear();
  toastShow.mockClear();
  tree = undefined;
});

afterEach(() => {
  if (tree) {
    ReactTestRenderer.act(() => {
      tree!.unmount();
    });
    tree = undefined;
  }
  jest.useRealTimers();
});

describe('RN account export flow (issue #237 round-8 S1/S3)', () => {
  it('hands the resolved download URL to the external handler', async () => {
    statusResults.push(
      { state: 'building' },
      { state: 'ready', downloadToken: 'tok-1' }
    );
    downloadDocument.mockResolvedValue(true);
    renderPage();

    await ReactTestRenderer.act(async () => {
      await downloadButton().props!.onPress!();
    });

    await advance(2001); // first poll: building
    await advance(2001); // second poll: ready → hand off
    expect(downloadUrl).toHaveBeenCalledWith('tok-1');
    expect(downloadDocument).toHaveBeenCalledWith('https://x/export?token=tok');
    expect(toasts()).toHaveLength(0);
  });

  it('toasts when the export job fails (status error)', async () => {
    statusResults.push({ state: 'error', error: 'boom' });
    renderPage();

    await ReactTestRenderer.act(async () => {
      await downloadButton().props!.onPress!();
    });
    await advance(2001);

    expect(toasts()).toEqual([{ type: 'error', text1: 'Failed: boom' }]);
  });

  it('toasts when the external download handoff fails', async () => {
    statusResults.push({ state: 'ready', downloadToken: 'tok-1' });
    downloadDocument.mockResolvedValue(false);
    renderPage();

    await ReactTestRenderer.act(async () => {
      await downloadButton().props!.onPress!();
    });
    await advance(2001);

    expect(downloadDocument).toHaveBeenCalled();
    expect(toasts()).toEqual([
      {
        type: 'error',
        text1:
          'Failed: No app was found to download the file. Please try again.',
      },
    ]);
  });

  it('toasts when polling outlives the deadline without a result', async () => {
    // Only `building` is ever queued (450 = the polls inside the 15-minute
    // deadline at the 2 s cadence), so the loop runs until the deadline.
    statusResults.push(
      ...Array.from({ length: 450 }, () => ({ state: 'building' }))
    );
    renderPage();

    await ReactTestRenderer.act(async () => {
      await downloadButton().props!.onPress!();
    });
    // One jump past the 15-minute deadline (fake timers make it cheap).
    await advance(15 * 60 * 1000 + 1);

    expect(status).toHaveBeenCalledTimes(450);
    expect(toasts()).toEqual([
      {
        type: 'error',
        text1: 'Failed: The export did not finish in time. Please try again.',
      },
    ]);
    // The button is back to its idle label once polling stopped.
    expect(textCount('Preparing your export…')).toBe(0);
  });

  it('shows the preparing label while the export is running', async () => {
    statusResults.push(
      ...Array.from({ length: 450 }, () => ({ state: 'building' }))
    );
    renderPage();
    expect(textCount('Preparing your export…')).toBe(0);

    await ReactTestRenderer.act(async () => {
      await downloadButton().props!.onPress!();
    });
    expect(textCount('Preparing your export…')).toBe(1);
    await advance(15 * 60 * 1000 + 1); // let the deadline stop polling
    expect(textCount('Preparing your export…')).toBe(0);
  });
});
