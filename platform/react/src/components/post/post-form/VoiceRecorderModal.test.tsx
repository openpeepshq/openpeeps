/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOICE_NOTE_AUTO_STOP_SECONDS } from '@openpeepshq/common';
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
// The `mimeType` option each recorder was constructed with — lets a test
// assert the pickMimeType preference/fallback order without exporting it.
const recorderMimeOptions: (string | undefined)[] = [];

class FakeMediaRecorder {
  static isTypeSupported: (type: string) => boolean = () => true;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(_stream?: unknown, options?: { mimeType?: string }) {
    recorderMimeOptions.push(options?.mimeType);
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
    recorderMimeOptions.length = 0;
    FakeMediaRecorder.isTypeSupported = () => true;
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

    // The auto-stop threshold is half a second *under* the cap: a take that
    // reaches 89.5 s must auto-stop (the 500 ms tick makes the file stay
    // under 90 s so the server's `> VOICE_NOTE_MAX_SECONDS` accepts it),
    // while a take still under the threshold must NOT stop yet. Pinning both
    // sides of the threshold keeps the boundary honest instead of only
    // asserting the Add button eventually appears.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        VOICE_NOTE_AUTO_STOP_SECONDS * 1000 + 1000,
      );
    });
    expect(
      container?.querySelector('[data-testid="voice-recorder-add"]'),
    ).toBeTruthy();

    // A fresh take under the threshold does not auto-stop.
    act(() => {
      root?.unmount();
    });
    setup();
    await act(async () => {
      click('voice-recorder-start');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        VOICE_NOTE_AUTO_STOP_SECONDS * 1000 - 1500,
      );
    });
    expect(
      container?.querySelector('[data-testid="voice-recorder-stop"]'),
    ).toBeTruthy();
    expect(
      container?.querySelector('[data-testid="voice-recorder-add"]'),
    ).toBeFalsy();
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

  it('a cancel in the Stop→onstop gap still discards the pending take (deferred onstop)', async () => {
    // MediaRecorder's `stop` is asynchronous: right after Stop, `state` is
    // already `inactive` but the queued `onstop` has not run. A fake whose
    // `stop()` defers `onstop` by a tick models that window; the default
    // fake fires synchronously and cannot catch the race.
    class DeferredOnstopMediaRecorder extends FakeMediaRecorder {
      stop = () => {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        setTimeout(() => this.onstop?.(), 0);
      };
    }
    vi.stubGlobal('MediaRecorder', DeferredOnstopMediaRecorder);
    setup();

    await act(async () => {
      click('voice-recorder-start');
    });
    // Stop, then cancel (overlay/Esc) before the deferred onstop has run.
    await act(async () => {
      click('voice-recorder-stop');
      click('voice-dialog-close');
    });
    // The queued onstop fires while the dialog is closed.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Reopen: with the discard race, the just-cancelled take would reappear
    // confirmable in the `recorded` phase.
    act(() => render(true));
    expect(
      container?.querySelector('[data-testid="voice-recorder-add"]'),
    ).toBeNull();
    expect(container?.querySelector('audio')).toBeNull();
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
    // Round-20 item 4: the name comes from the `posts.form.voiceNote.filename`
    // locale key (the test's i18n mock resolves it to its defaultValue), not a
    // hardcoded English string — so the base is "Voice note", extension from
    // the recorded format.
    expect(file?.name).toBe('Voice note.webm');
  });

  it('picks the first supported mimeType in preference order and falls back', async () => {
    const start = () =>
      act(async () => {
        click('voice-recorder-start');
      });

    // All supported → the universally-decodable target (audio/mp4) wins.
    setup();
    await start();
    expect(recorderMimeOptions.at(-1)).toBe('audio/mp4');
    act(() => root?.unmount());

    // audio/mp4 unsupported (e.g. Safari) → falls back to webm/opus.
    setup();
    FakeMediaRecorder.isTypeSupported = (t) =>
      t === 'audio/webm;codecs=opus' || t === 'audio/webm';
    await start();
    expect(recorderMimeOptions.at(-1)).toBe('audio/webm;codecs=opus');
    act(() => root?.unmount());

    // Only plain webm supported → falls back one more level.
    setup();
    FakeMediaRecorder.isTypeSupported = (t) => t === 'audio/webm';
    await start();
    expect(recorderMimeOptions.at(-1)).toBe('audio/webm');
    act(() => root?.unmount());
  });

  it('pause/resume: paused wall-clock is excluded from the displayed time and the take survives', async () => {
    vi.useFakeTimers();
    setup();

    await act(async () => {
      click('voice-recorder-start');
    });

    // ~3 s of recording.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    expect(container?.textContent).toContain('0:03');

    // Pause for ~5 s: the interval stops ticking, so the displayed time
    // freezes — the paused span must not count against the take.
    await act(async () => {
      click('voice-recorder-pause');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(container?.textContent).toContain('0:03');

    // Resume and record ~5 s more: the display is 3 + 5 = 8 s, not 13 s.
    await act(async () => {
      click('voice-recorder-resume');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });
    expect(container?.textContent).toContain('0:08');

    // Stopping hands over a single take built from every chunk (pause/resume
    // does not drop the data between the segments).
    await act(async () => {
      click('voice-recorder-stop');
    });
    const rec = recorders.at(-1);
    expect(rec?.state).toBe('inactive');
    expect(rec?.ondataavailable ? 'available' : 'missing').toBe('available');
    expect(
      container?.querySelector('[data-testid="voice-recorder-add"]'),
    ).toBeTruthy();
  });
});
