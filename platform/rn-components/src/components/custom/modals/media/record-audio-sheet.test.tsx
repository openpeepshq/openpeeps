/**
 * Unit tests for the RecordAudioSheet 90s cap and confirmability (#327).
 *
 * The auto-stop must be driven by the wall-clock interval (Date.now() deltas),
 * not the recorder's throttle-racy position callback, and a completed take must
 * be confirmable from the file the stop returns even if a final position event
 * never lands. A still-open (not stopped) recording must not be confirmable.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

let grantPermission = true;
let failStart = false;
const recorderInstances: unknown[] = [];

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
    request: jest.fn(async () => (grantPermission ? 'granted' : 'denied')),
  },
  Platform: { OS: 'android' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@openpeepshq/common', () => ({
  VOICE_NOTE_MAX_SECONDS: 90,
}));

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    // The sheet writes each take to `${CachesDirectoryPath}/voice_…`; the
    // mock keeps the shape so the path-pin below exercises the real join.
    CachesDirectoryPath: '/tmp/caches',
  },
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: 'BottomSheetModal',
}));

jest.mock('react-native-audio-recorder-player', () => {
  class MockRecorder {
    // Mirrors the real native contract: both platforms write a caller-supplied
    // path verbatim and resolve `file://<path>` on start and stop, so the
    // sheet's take URL is the file it actually recorded.
    startRecorder = jest.fn(async (path?: string) => {
      if (failStart) throw new Error('mic unavailable');
      return path ? `file://${path}` : 'file:///rec.m4a';
    });
    stopRecorder = jest.fn(async () => 'file:///rec.m4a');
    addRecordBackListener = jest.fn();
    removeRecordBackListener = jest.fn();
    addPlayBackListener = jest.fn();
    removePlayBackListener = jest.fn();
    pauseRecorder = jest.fn(async () => 'file:///rec.m4a');
    resumeRecorder = jest.fn(async () => 'file:///rec.m4a');
    startPlayer = jest.fn(async () => 'file:///rec.m4a');
    stopPlayer = jest.fn(async () => 'file:///rec.m4a');
    pausePlayer = jest.fn(async () => 'file:///rec.m4a');
    resumePlayer = jest.fn(async () => 'file:///rec.m4a');
    mmss = (s: number) =>
      `00:${String(Math.max(0, Math.floor(s) % 60)).padStart(2, '0')}`;
    constructor() {
      recorderInstances.push(this);
    }
  }
  return { __esModule: true, default: MockRecorder };
});

jest.mock('../common', () => ({
  BaseSheet: (props: { children?: unknown; onDismiss?: () => void }) =>
    React.createElement(
      'BaseSheet',
      { onDismiss: props.onDismiss },
      props.children
    ),
  SheetFooter: (props: {
    disabled?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) =>
    React.createElement('ConfirmButton', {
      'data-disabled': props.disabled,
      'onPress': props.onConfirm,
      'onCancel': props.onCancel,
    }),
}));

jest.mock('../../../ui/button', () => ({
  Button: (props: {
    children?: unknown;
    onPress?: () => void;
    size?: string;
    variant?: string;
    disabled?: boolean;
  }) =>
    React.createElement('Button', { onPress: props.onPress }, props.children),
}));

jest.mock('../../../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown; className?: string }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../../icons/index', () => ({
  CircleIcon: () => React.createElement('CircleIcon'),
  PauseIcon: () => React.createElement('PauseIcon'),
  PlayIcon: () => React.createElement('PlayIcon'),
  SquareIcon: () => React.createElement('SquareIcon'),
  Repeat2Icon: () => React.createElement('Repeat2Icon'),
}));

jest.mock('../../../../lib/bottom-sheet-ref', () => ({
  bottomSheetDismiss: jest.fn(),
}));

import { RecordAudioSheet } from './record-audio-sheet';

const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

const render = (onComplete: (url: string) => void) =>
  ReactTestRenderer.create(
    React.createElement(RecordAudioSheet, {
      ref: { current: null },
      onComplete,
    })
  );

const findButtons = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAll((node) => node.type === 'Button');

const findConfirm = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAll((n) => n.type === 'ConfirmButton')[0];

describe('RecordAudioSheet 90s cap', () => {
  beforeEach(() => {
    grantPermission = true;
    failStart = false;
    recorderInstances.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-stops at the wall-clock cap even if the position callback stalls', async () => {
    const onComplete = jest.fn();
    // Render under real timers, then flip to fake timers so the in-component
    // wall-clock interval is the only thing advancing toward the cap.
    const tree = await ReactTestRenderer.act(async () => {
      jest.useFakeTimers();
      return render(onComplete);
    });

    const start = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });

    const rec = recorderInstances[recorderInstances.length - 1] as {
      startRecorder: jest.Mock;
      stopRecorder: jest.Mock;
    };
    expect(rec.startRecorder).toHaveBeenCalledTimes(1);
    expect(rec.stopRecorder).not.toHaveBeenCalled();

    // The recorder's position callback never reports the cap (throttle-racy);
    // only the wall-clock interval can stop the take.
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(90 * 1000 + 1000);
      await flush();
    });

    expect(rec.stopRecorder).toHaveBeenCalledTimes(1);
    // The completed take is confirmable even though no final position event
    // arrived — confirm is enabled and hands the file over.
    expect(findConfirm(tree).props['data-disabled']).toBe(false);
    await ReactTestRenderer.act(async () => {
      findConfirm(tree).props.onPress();
      await flush();
    });
    expect(onComplete).toHaveBeenCalledWith('file:///rec.m4a');

    // Item 6: the native recorder is created lazily and not re-created on the
    // many re-renders the ticks caused.
    expect(recorderInstances.length).toBe(1);
  });

  it('does not confirm a still-open (not stopped) recording', async () => {
    const onComplete = jest.fn();
    const tree = await ReactTestRenderer.act(async () => {
      jest.useFakeTimers();
      return render(onComplete);
    });

    const start = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });

    // Mid-recording: confirm is disabled and the handler no-ops.
    expect(findConfirm(tree).props['data-disabled']).toBe(true);
    await ReactTestRenderer.act(async () => {
      findConfirm(tree).props.onPress();
      await flush();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows the distinct micFailed copy when startRecorder throws, and Start stays usable for a retry', async () => {
    const onComplete = jest.fn();
    const tree = await ReactTestRenderer.act(async () => {
      return render(onComplete);
    });

    // The copy is the identity-mapped i18n key; searching the rendered tree
    // string is renderer-agnostic.
    const rendered = () => JSON.stringify(tree.toJSON());

    // The failed copy is absent before any start attempt.
    expect(rendered()).not.toContain('posts.form.voiceNote.micFailed');

    // A start whose startRecorder throws surfaces the failed copy (not the
    // denied copy) and leaves the take unconfirmable.
    failStart = true;
    const start = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });
    expect(rendered()).toContain('posts.form.voiceNote.micFailed');
    expect(rendered()).not.toContain('posts.form.voiceNote.micError');
    expect(findConfirm(tree).props['data-disabled']).toBe(true);

    // The failed state does not lock the recorder out: a retry start (now
    // succeeding) produces a take, clears the failed copy, and confirms it.
    failStart = false;
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });
    expect(rendered()).not.toContain('posts.form.voiceNote.micFailed');
    const stop = findButtons(tree).find(
      (b) => b.findAll((d) => d.type === 'SquareIcon').length > 0
    );
    expect(stop).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      stop.props.onPress();
      await flush();
    });
    expect(findConfirm(tree).props['data-disabled']).toBe(false);
    await ReactTestRenderer.act(async () => {
      findConfirm(tree).props.onPress();
      await flush();
    });
    expect(onComplete).toHaveBeenCalledWith('file:///rec.m4a');
  });

  it('shows the distinct mic-denied copy when the permission is refused', async () => {
    const onComplete = jest.fn();
    const tree = await ReactTestRenderer.act(async () => {
      return render(onComplete);
    });

    const rendered = () => JSON.stringify(tree.toJSON());
    expect(rendered()).not.toContain('posts.form.voiceNote.micError');

    grantPermission = false;
    const start = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });

    // The denied copy is shown (not the failed-start copy) and the take is
    // unconfirmable — nothing was ever recorded.
    expect(rendered()).toContain('posts.form.voiceNote.micError');
    expect(rendered()).not.toContain('posts.form.voiceNote.micFailed');
    expect(findConfirm(tree).props['data-disabled']).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();

    // Granting later and starting again records normally.
    grantPermission = true;
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });
    expect(rendered()).not.toContain('posts.form.voiceNote.micError');
    const rec = recorderInstances[recorderInstances.length - 1] as {
      startRecorder: jest.Mock;
    };
    expect(rec.startRecorder).toHaveBeenCalledTimes(1);
  });

  it('stops the in-flight take and cleans up when the sheet is dismissed while recording', async () => {
    const onComplete = jest.fn();
    const tree = await ReactTestRenderer.act(async () => {
      jest.useFakeTimers();
      return render(onComplete);
    });

    const start = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });

    // Swipe/back dismiss mid-take: the recorder must be stopped (mic released)
    // before the state is cleared.
    const baseSheet = tree.root.findAll((n) => n.type === 'BaseSheet')[0];
    await ReactTestRenderer.act(async () => {
      baseSheet.props.onDismiss();
      await flush();
    });

    const rec = recorderInstances[recorderInstances.length - 1] as {
      stopRecorder: jest.Mock;
    };
    expect(rec.stopRecorder).toHaveBeenCalledTimes(1);

    // Back to the idle state: the take is gone, confirm is disabled, and
    // nothing was handed to the composer.
    expect(findConfirm(tree).props['data-disabled']).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();

    // A fresh recording still works after the dismiss-reset.
    const startAgain = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      startAgain.props.onPress();
      await flush();
    });
    const rec2 = recorderInstances[recorderInstances.length - 1] as {
      startRecorder: jest.Mock;
      stopRecorder: jest.Mock;
    };
    expect(rec2.startRecorder).toHaveBeenCalledTimes(2);
  });

  it('writes each take to a distinct output path so a confirmed take cannot be overwritten', async () => {
    const onComplete = jest.fn();
    const tree = await ReactTestRenderer.act(async () => {
      jest.useFakeTimers();
      return render(onComplete);
    });

    const start = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });

    const rec = recorderInstances[recorderInstances.length - 1] as {
      startRecorder: jest.Mock;
      stopRecorder: jest.Mock;
    };
    // Each take gets its own cache file: the library default ("DEFAULT")
    // resolves every take to one fixed name (sound.mp4/sound.m4a), so a
    // second take would overwrite the bytes of a previously confirmed take
    // before the picker's Done uploads them.
    const path1 = rec.startRecorder.mock.calls[0][0];
    expect(typeof path1).toBe('string');
    expect(path1.startsWith('/tmp/caches/voice_')).toBe(true);
    expect(path1.endsWith('.m4a')).toBe(true);

    // Confirm take A, re-record, and start take B in the same sheet session.
    const stop = findButtons(tree).find(
      (b) => b.findAll((d) => d.type === 'SquareIcon').length > 0
    );
    expect(stop).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      stop.props.onPress();
      await flush();
    });
    await ReactTestRenderer.act(async () => {
      findConfirm(tree).props.onPress();
      await flush();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    const reRecord = findButtons(tree).find(
      (b) => b.findAll((d) => d.type === 'Repeat2Icon').length > 0
    );
    expect(reRecord).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      reRecord.props.onPress();
      await flush();
    });
    const startAgain = findButtons(tree)[0];
    await ReactTestRenderer.act(async () => {
      startAgain.props.onPress();
      await flush();
    });

    expect(rec.startRecorder).toHaveBeenCalledTimes(2);
    const path2 = rec.startRecorder.mock.calls[1][0];
    expect(path2).not.toBe(path1);
    expect(path2.startsWith('/tmp/caches/voice_')).toBe(true);
    expect(path2.endsWith('.m4a')).toBe(true);
  });
});
