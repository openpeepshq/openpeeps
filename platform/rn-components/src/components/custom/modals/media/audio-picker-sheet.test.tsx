/**
 * Integration test for the RN voice-note happy path (#327): the
 * AudioPickerSheet "record" affordance opens the (real) RecordAudioSheet, a
 * take is recorded and confirmed, and the resulting file is uploaded and
 * handed to `onSelect`. `pick`, `uploadMedia`, the native recorder, and the
 * bottom-sheet plumbing are mocked; both sheets are real components.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const pick = jest.fn(async () => []);
const uploadMedia = jest.fn();
// Forward to the sheet's imperative handle, like the real lib — so a
// dismiss actually drives the sheet's `onDismiss` (the record sheet's
// handleDismiss) rather than being a pure no-op that skips the reset path.
const bottomSheetClose = jest.fn((ref: unknown) =>
  (ref as { current: { close: () => void } | null })?.current?.close()
);
const bottomSheetDismiss = jest.fn((ref: unknown) =>
  (ref as { current: { dismiss: () => void } | null })?.current?.dismiss()
);

// The sheet-modal imperative handles, registered in mount order so a test can
// drive the inner record sheet (present/close).
const mockSheetApis: Record<string, jest.Mock>[] = [];
const recorderInstances: unknown[] = [];

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  Text: (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children),
  Dimensions: { get: () => ({ width: 390 }) },
  ScrollView: (props: { children?: unknown }) =>
    React.createElement('ScrollView', null, props.children),
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
    request: jest.fn(async () => 'granted'),
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
    // The (real) record sheet writes each take to `${CachesDirectoryPath}/voice_…`;
    // the mock keeps the shape so the path join resolves. ts-jest does not
    // transform RNFS's TypeScript `FS.common.js`, so it must be stubbed here,
    // mirroring `record-audio-sheet.test.tsx`.
    CachesDirectoryPath: '/tmp/caches',
  },
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      createMediaAttachmentAction: () => jest.fn(),
    },
  }),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: 'BottomSheetModal',
}));

jest.mock('@react-native-documents/picker', () => ({
  pick,
}));

jest.mock('../../../../lib/uploadMedia', () => ({
  uploadMedia,
}));

jest.mock('../../../../lib/bottom-sheet-ref', () => ({
  bottomSheetClose,
  bottomSheetDismiss,
}));

jest.mock('react-native-audio-recorder-player', () => {
  class MockRecorder {
    startRecorder = jest.fn(async () => 'file:///rec.m4a');
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
  BaseSheet: React.forwardRef(
    (props: { children?: unknown; onDismiss?: () => void }, ref: unknown) => {
      // `dismiss` fires the sheet's `onDismiss` — mirroring the real
      // BottomSheetModal, where a user-initiated dismiss unmounts the sheet and
      // runs `onDismiss`. The record sheet wires that to `handleDismiss`, which
      // clears an in-progress take so a fresh recording can start after the
      // sheet is dismissed and reopened. `close` is a plain no-op (a programmatic
      // close does not fire `onDismiss`, so a confirmed take is retained when
      // the sheet is reopened after a confirm).
      const api = {
        present: jest.fn(),
        close: jest.fn(),
        dismiss: jest.fn(() => {
          if (props.onDismiss) props.onDismiss();
        }),
      };
      mockSheetApis.push(api);
      if (typeof ref === 'function') (ref as (a: unknown) => void)(api);
      else if (ref) (ref as { current: unknown }).current = api;
      return React.createElement('BaseSheet', null, props.children);
    }
  ),
  SheetFooter: (props: {
    onConfirm?: () => void;
    onCancel?: () => void;
    disabled?: boolean;
    confirmText?: string;
  }) => {
    return React.createElement('ConfirmButton', {
      'data-disabled': props.disabled,
      'onPress': props.onConfirm,
      'onCancel': props.onCancel,
      'confirmText': props.confirmText,
    });
  },
}));

jest.mock('../../../ui/button', () => ({
  Button: (props: {
    children?: unknown;
    onPress?: () => void;
    size?: string;
    variant?: string;
    disabled?: boolean;
    accessibilityLabel?: string;
  }) =>
    React.createElement(
      'Button',
      {
        onPress: props.onPress,
        disabled: props.disabled,
        accessibilityLabel: props.accessibilityLabel,
      },
      props.children
    ),
}));

jest.mock('../../../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown; className?: string }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../../icons/index', () => ({
  AudioLinesIcon: () => React.createElement('AudioLinesIcon'),
  MicIcon: () => React.createElement('MicIcon'),
  CircleIcon: () => React.createElement('CircleIcon'),
  PauseIcon: () => React.createElement('PauseIcon'),
  PlayIcon: () => React.createElement('PlayIcon'),
  SquareIcon: () => React.createElement('SquareIcon'),
  Repeat2Icon: () => React.createElement('Repeat2Icon'),
}));

import { AudioPickerSheet } from './audio-picker-sheet';

const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

const findButtonBy = (
  tree: ReturnType<typeof ReactTestRenderer.create>,
  match: (props: Record<string, unknown>) => boolean
) => tree.root.findAll((n) => n.type === 'Button' && match(n.props));

// The mocked icon components render a host element whose type is the icon's
// string name, so a Button is identified by that icon appearing in its subtree
// (the Button's `children` prop is the un-rendered element, whose `type` is the
// icon function, not the string).
const findButtonWithIcon = (
  tree: ReturnType<typeof ReactTestRenderer.create>,
  icon: string
) =>
  tree.root.findAll(
    (n) => n.type === 'Button' && n.findAll((d) => d.type === icon).length > 0
  )[0];

const renderSheet = (
  onSelect: (attachments: unknown[]) => void,
  multiple = true
) =>
  ReactTestRenderer.create(
    React.createElement(AudioPickerSheet, {
      ref: { current: null },
      onSelect,
      multiple,
    })
  );

// Both sheets are always mounted, so the live tree has exactly two footers, in
// tree order: the outer AudioPickerSheet's (outermost/first) then the inner
// RecordAudioSheet's. Querying the tree (rather than a per-render capture)
// avoids stale entries from re-renders.
const findFooters = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAll((n) => n.type === 'ConfirmButton');

describe('AudioPickerSheet → RecordAudioSheet → uploadMedia (RN voice note)', () => {
  beforeEach(() => {
    mockSheetApis.length = 0;
    recorderInstances.length = 0;
    pick.mockClear();
    uploadMedia.mockClear();
    bottomSheetClose.mockClear();
    bottomSheetDismiss.mockClear();
  });

  it('records a take and hands the attachment to onSelect (no file pick)', async () => {
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect);
      await flush();
      return t;
    });

    // 1. The record affordance exists and opens the (real) record sheet.
    const mic = findButtonBy(
      tree,
      (p) => p.accessibilityLabel === 'posts.form.voiceNote.recordAudio'
    )[0];
    expect(mic).toBeTruthy();
    // The record sheet is the second BaseSheet (outer picker first, inner
    // record sheet second) — the one whose `present` the Mic button drives.
    const innerApi = mockSheetApis[1];
    expect(innerApi).toBeTruthy(); // the record sheet registered its handle
    await ReactTestRenderer.act(async () => {
      mic.props.onPress();
      await flush();
    });
    expect(innerApi.present).toHaveBeenCalledTimes(1);
    // The file picker must not be involved in the record path.
    expect(pick).not.toHaveBeenCalled();

    // 2. Complete a take through the real record sheet: start, stop, confirm.
    const start = findButtonWithIcon(tree, 'CircleIcon');
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });
    const rec = recorderInstances[recorderInstances.length - 1] as {
      startRecorder: jest.Mock;
      stopRecorder: jest.Mock;
    };
    expect(rec.startRecorder).toHaveBeenCalledTimes(1);

    const stop = findButtonWithIcon(tree, 'SquareIcon');
    await ReactTestRenderer.act(async () => {
      stop.props.onPress();
      await flush();
    });
    expect(rec.stopRecorder).toHaveBeenCalledTimes(1);

    // The inner record sheet is the second footer (tree order: outer Done
    // first, then the record confirm). Before a take is confirmed, the picker's
    // Done is disabled (nothing selected) and the record confirm is enabled.
    const [doneBefore, confirmFooter] = findFooters(tree);
    expect(doneBefore.props['data-disabled']).toBe(true);
    expect(confirmFooter.props['data-disabled']).toBe(false);
    await ReactTestRenderer.act(async () => {
      confirmFooter.props.onPress();
      await flush();
    });
    // Confirming routes the file into the picker's selected list: the picker's
    // Done footer flips from disabled to enabled. It is not uploaded yet.
    expect(uploadMedia).not.toHaveBeenCalled();
    const [doneFooter] = findFooters(tree);
    expect(doneFooter.props['data-disabled']).toBe(false);

    // 4. The picker's Done uploads the recorded file and reports it.
    await ReactTestRenderer.act(async () => {
      doneFooter.props.onPress();
      await flush();
    });
    expect(uploadMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaUri: 'file:///rec.m4a',
        type: 'audio',
      })
    );
    expect(onSelect).toHaveBeenCalledWith([attachment]);
  });

  // --- Round-6 rework helpers: drive one full take through the real record
  // sheet (re-record first if the sheet still holds a confirmed take).
  const openRecordSheet = async (tree) => {
    const mic = findButtonBy(
      tree,
      (p) => p.accessibilityLabel === 'posts.form.voiceNote.recordAudio'
    )[0];
    await ReactTestRenderer.act(async () => {
      mic.props.onPress();
      await flush();
    });
  };

  const recordTake = async (tree, { rerecordFirst = false } = {}) => {
    if (rerecordFirst) {
      const reRecord = findButtonWithIcon(tree, 'Repeat2Icon');
      expect(reRecord).toBeTruthy(); // a confirmed take shows the affordance
      await ReactTestRenderer.act(async () => {
        reRecord.props.onPress();
        await flush();
      });
    }
    const start = findButtonWithIcon(tree, 'CircleIcon');
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });
    const stop = findButtonWithIcon(tree, 'SquareIcon');
    await ReactTestRenderer.act(async () => {
      stop.props.onPress();
      await flush();
    });
    const [, confirmFooter] = findFooters(tree);
    await ReactTestRenderer.act(async () => {
      confirmFooter.props.onPress();
      await flush();
    });
  };

  it('single mode: a second confirmed recording replaces the first (one selection, one upload)', async () => {
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect, false); // multiple=false
      await flush();
      return t;
    });

    // First take.
    await openRecordSheet(tree);
    await recordTake(tree);
    let [doneFooter] = findFooters(tree);
    expect(doneFooter.props['data-disabled']).toBe(false);

    // Second take: the record sheet still holds the confirmed take, so the
    // re-record affordance clears it before the fresh start.
    await openRecordSheet(tree);
    await recordTake(tree, { rerecordFirst: true });

    // Done uploads exactly one file — the second take, not both.
    [doneFooter] = findFooters(tree);
    await ReactTestRenderer.act(async () => {
      doneFooter.props.onPress();
      await flush();
    });
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([attachment]);
  });

  it('keeps the sheet open when every upload fails, so the take can be retried', async () => {
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(null); // e.g. the server rejects it
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect);
      await flush();
      return t;
    });

    await openRecordSheet(tree);
    await recordTake(tree);

    // Done with every upload failing: nothing is handed out, the sheet is not
    // closed, and the selection stays (Done remains enabled for a retry).
    await ReactTestRenderer.act(async () => {
      findFooters(tree)[0].props.onPress();
      await flush();
    });
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(bottomSheetClose).not.toHaveBeenCalled();
    let [doneFooter] = findFooters(tree);
    expect(doneFooter.props['data-disabled']).toBe(false);

    // Retry: the upload now succeeds and the take is handed out.
    uploadMedia.mockResolvedValue(attachment);
    await ReactTestRenderer.act(async () => {
      findFooters(tree)[0].props.onPress();
      await flush();
    });
    expect(onSelect).toHaveBeenCalledWith([attachment]);
    expect(bottomSheetClose).toHaveBeenCalledTimes(1);
  });

  it('re-record: a take can be discarded and re-recorded without dismissing the sheet', async () => {
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect);
      await flush();
      return t;
    });

    await openRecordSheet(tree);
    // Record a take but do NOT confirm it into the picker — the take stays
    // in the record sheet (playback + confirm enabled), which is the state
    // the re-record affordance replaces.
    const start = findButtonWithIcon(tree, 'CircleIcon');
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });
    const stop = findButtonWithIcon(tree, 'SquareIcon');
    await ReactTestRenderer.act(async () => {
      stop.props.onPress();
      await flush();
    });

    // The take is there (confirm enabled) and the re-record affordance sits
    // next to the playback controls.
    expect(findFooters(tree)[1].props['data-disabled']).toBe(false);
    const reRecord = findButtonWithIcon(tree, 'Repeat2Icon');
    expect(reRecord).toBeTruthy();

    // Discard: the take is gone — confirm disabled, start visible again, and
    // nothing was ever handed to the picker.
    await ReactTestRenderer.act(async () => {
      reRecord.props.onPress();
      await flush();
    });
    expect(findFooters(tree)[1].props['data-disabled']).toBe(true);
    expect(findButtonWithIcon(tree, 'CircleIcon')).toBeTruthy();
    expect(uploadMedia).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();

    // A fresh take is recorded, confirmed, and handed out (exactly one).
    await recordTake(tree);
    await ReactTestRenderer.act(async () => {
      findFooters(tree)[0].props.onPress();
      await flush();
    });
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([attachment]);
  });

  it('multi mode with selectMultiple off: record → confirm → Done uploads the take', async () => {
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect, true); // multiple=true (the toggle is shown)
      await flush();
      return t;
    });

    // In multiple mode the selectMultiple toggle is rendered; leave it off
    // (single-select within multiple mode) and drive the record → confirm →
    // Done flow.
    const toggle = tree.root.findAll(
      (n) =>
        n.type === 'Button' &&
        n.findAll(
          (d) =>
            d.type === 'Text' &&
            typeof d.props.children === 'string' &&
            d.props.children.includes('selectMultiple')
        ).length > 0
    )[0];
    expect(toggle).toBeTruthy(); // the selectMultiple toggle exists in multi mode

    await openRecordSheet(tree);
    await recordTake(tree);

    const [doneFooter] = findFooters(tree);
    expect(doneFooter.props['data-disabled']).toBe(false);
    await ReactTestRenderer.act(async () => {
      doneFooter.props.onPress();
      await flush();
    });
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([attachment]);
    expect(bottomSheetClose).toHaveBeenCalledTimes(1);
  });

  it('cancel while recording stops the take and a later fresh recording succeeds', async () => {
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect);
      await flush();
      return t;
    });

    // Open the record sheet and start a take, then cancel (the record sheet's
    // own Cancel footer) while the mic is still hot.
    await openRecordSheet(tree);
    const start = findButtonWithIcon(tree, 'CircleIcon');
    await ReactTestRenderer.act(async () => {
      start.props.onPress();
      await flush();
    });

    // The record sheet is the second footer in tree order; its onCancel is
    // wired to bottomSheetDismiss.
    const [pickerFooter, recordFooter] = findFooters(tree);
    expect(pickerFooter).toBeTruthy();
    expect(recordFooter).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      recordFooter.props.onCancel();
      await flush();
    });
    expect(bottomSheetDismiss).toHaveBeenCalledTimes(1);
    // No upload happened for the cancelled take.
    expect(uploadMedia).not.toHaveBeenCalled();

    // A later fresh recording is recorded, confirmed and uploaded successfully.
    await openRecordSheet(tree);
    await recordTake(tree);
    await ReactTestRenderer.act(async () => {
      findFooters(tree)[0].props.onPress();
      await flush();
    });
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([attachment]);
    expect(bottomSheetClose).toHaveBeenCalledTimes(1);
  });
});
