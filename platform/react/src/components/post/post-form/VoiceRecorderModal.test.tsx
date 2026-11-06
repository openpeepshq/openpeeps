/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOICE_NOTE_MAX_SECONDS } from '@openpeepshq/common';
import { VoiceRecorderModal } from './VoiceRecorderModal';

vi.mock('@openpeepshq/react-ui', () => {
  const passthrough =
    (tag: string) =>
    ({ children }: { children?: ReactNode }) =>
      createElement(tag, null, children);
  return {
    Dialog: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      children?: ReactNode;
    }) =>
      open
        ? createElement(
            'div',
            { 'data-testid': 'voice-dialog' },
            createElement(
              'button',
              {
                type: 'button',
                'data-testid': 'voice-dialog-close',
                onClick: () => onOpenChange(false),
              },
              'close',
            ),
            children,
          )
        : null,
    DialogContent: passthrough('div'),
    DialogHeader: passthrough('div'),
    DialogTitle: passthrough('h2'),
    DialogDescription: passthrough('p'),
    Button: ({
      action,
      title,
      children,
      'data-testid': testId,
    }: {
      action?: () => void;
      title?: string;
      children?: ReactNode;
      'data-testid'?: string;
    }) =>
      createElement(
        'button',
        {
          type: 'button',
          title,
          'data-testid': testId,
          onClick: action,
        },
        children,
      ),
  };
});

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

const recorders: FakeMediaRecorder[] = [];

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor() {
    recorders.push(this);
  }

  start = () => {
    this.state = 'recording';
  };
  stop = () => {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.onstop?.();
  };
  pause = () => {
    this.state = 'paused';
  };
  resume = () => {
    this.state = 'recording';
  };
}

const getUserMediaMock = vi.fn();

const click = (testId: string) => {
  document
    .querySelector(`[data-testid="${testId}"]`)
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

describe('VoiceRecorderModal', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const render = (open: boolean) => {
    root?.render(
      createElement(VoiceRecorderModal, {
        open,
        onClose: () => undefined,
        onConfirm: () => undefined,
      }),
    );
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    recorders.length = 0;
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: getUserMediaMock },
    });
    getUserMediaMock.mockImplementation(async () => ({
      getTracks: () => [{ stop: vi.fn() }],
    }));
    const url = URL as unknown as {
      createObjectURL?: () => string;
      revokeObjectURL?: () => void;
    };
    url.createObjectURL = () => 'blob:fake';
    url.revokeObjectURL = () => undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const setup = (open = true) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      render(open);
    });
  };

  it('shows a mic error when access is denied', async () => {
    getUserMediaMock.mockRejectedValueOnce(new Error('denied'));
    setup();

    await act(async () => {
      click('voice-recorder-start');
    });

    expect(container?.textContent).toContain(
      'Microphone unavailable or access denied.',
    );
  });

  it('stops automatically at the cap', async () => {
    vi.useFakeTimers();
    setup();

    await act(async () => {
      click('voice-recorder-start');
    });
    expect(
      container?.querySelector('[data-testid="voice-recorder-stop"]'),
    ).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(VOICE_NOTE_MAX_SECONDS * 1000 + 1000);
    });

    expect(
      container?.querySelector('[data-testid="voice-recorder-add"]'),
    ).toBeTruthy();
  });

  it('closing while idle does not discard the next recording', async () => {
    setup();

    await act(async () => {
      click('voice-dialog-close');
    });
    act(() => {
      render(true);
    });

    await act(async () => {
      click('voice-recorder-start');
    });
    await act(async () => {
      click('voice-recorder-stop');
    });

    // With the discard flag stuck from the idle close, this onstop would drop
    // the data and the UI would stay in "recording" forever.
    expect(
      container?.querySelector('[data-testid="voice-recorder-add"]'),
    ).toBeTruthy();
  });

  it('cancel while recording discards that take but a new one still works', async () => {
    setup();

    await act(async () => {
      click('voice-recorder-start');
    });
    await act(async () => {
      click('voice-dialog-close');
    });
    act(() => {
      render(true);
    });

    await act(async () => {
      click('voice-recorder-start');
    });
    await act(async () => {
      click('voice-recorder-stop');
    });

    expect(
      container?.querySelector('[data-testid="voice-recorder-add"]'),
    ).toBeTruthy();
  });

  it('hands the recorded file to the composer on confirm', async () => {
    const onConfirm = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        createElement(VoiceRecorderModal, {
          open: true,
          onClose: () => undefined,
          onConfirm,
        }),
      );
    });

    await act(async () => {
      click('voice-recorder-start');
    });
    await act(async () => {
      click('voice-recorder-stop');
    });
    await act(async () => {
      click('voice-recorder-add');
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const file: File | undefined = onConfirm.mock.calls[0]?.[0];
    expect(file?.name).toBe('voice-note.webm');
  });
});
