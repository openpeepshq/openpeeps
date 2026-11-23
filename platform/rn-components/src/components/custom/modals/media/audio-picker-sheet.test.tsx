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

// `t` resolves through the real locale bundles (mirroring i18next's
// en-fallback) instead of returning the raw key: a key missing from *both*
// bundles then surfaces as the raw key in assertions and fails them, so the
// suite pins resolved copy (a key that i18next would render verbatim to
// screen readers cannot slip in unnoticed). The bundles are required inside
// the factory because jest hoists `jest.mock` above the module's consts.
jest.mock('react-i18next', () => {
  const enBundle = require('../../../../../../i18n/src/locales/en.json');
  const deBundle = require('../../../../../../i18n/src/locales/de.json');
  // Resolve in the base language (en) first — the app's default — then fall
  // back to de, mirroring i18next's `fallbackLng: 'en'` for this locale set.
  const resolveKey = (key: string): string => {
    const path = key.split('.');
    for (const bundle of [enBundle, deBundle]) {
      let node: unknown = bundle;
      for (const part of path) {
        if (typeof node !== 'object' || node === null) break;
        node = (node as Record<string, unknown>)[part];
      }
      if (typeof node === 'string') return node;
    }
    return key;
  };
  return { useTranslation: () => ({ t: resolveKey }) };
});

jest.mock('@openpeepshq/common', () => ({
  VOICE_NOTE_MAX_SECONDS: 90,
  VOICE_NOTE_AUTO_STOP_SECONDS: 89.5,
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
      (p) => p.accessibilityLabel === 'Record voice note'
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
    // A recorded take is tagged `post-audio` (matching web's usageForFile) and
    // flagged as the recorder's own .m4a output (isRecordedAudio), unlike a
    // picked file.
    await ReactTestRenderer.act(async () => {
      doneFooter.props.onPress();
      await flush();
    });
    expect(uploadMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaUri: 'file:///rec.m4a',
        type: 'audio',
        usage: 'post-audio',
        isRecordedAudio: true,
        // Round-18 item 2: a recording never went through the file picker, so
        // it carries no picker metadata — its .m4a is the trusted recorder
        // output instead.
        name: null,
        mimeType: null,
      })
    );
    expect(onSelect).toHaveBeenCalledWith([attachment]);
  });

  // --- Round-6 rework helpers: drive one full take through the real record
  // sheet (re-record first if the sheet still holds a confirmed take).
  const openRecordSheet = async (tree) => {
    const mic = findButtonBy(
      tree,
      (p) => p.accessibilityLabel === 'Record voice note'
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
            d.props.children.includes('Select multiple')
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

  it('picked audio uploads with its real extension/mimetype, usage post-audio, and isRecordedAudio false', async () => {
    // Round-16 review item 9: the picked-file path (pick() at the audio
    // button) was previously untested. The pick is mocked; `uploadMedia` is
    // the module under observation, so this pins what a picked file is
    // handed to it with.
    const attachment = { id: 'att-pick', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    pick.mockResolvedValueOnce([
      {
        uri: 'file:///tmp/pick_note.mp3',
        name: 'pick_note.mp3',
        type: 'audio/mpeg',
      },
      {
        uri: 'content://media/external/audio/media/777',
        name: 'track.webm',
        type: 'audio/webm',
      },
    ]);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect);
      await flush();
      return t;
    });

    // The picker affordance is the button holding the AudioLinesIcon.
    const pickButton = findButtonWithIcon(tree, 'AudioLinesIcon');
    expect(pickButton).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      pickButton.props.onPress();
      await flush();
    });
    expect(pick).toHaveBeenCalledWith({ type: 'audio', multiple: false });

    const [doneFooter] = findFooters(tree);
    expect(doneFooter.props['data-disabled']).toBe(false);
    await ReactTestRenderer.act(async () => {
      doneFooter.props.onPress();
      await flush();
    });

    // Both picked files upload; each keeps its own URI (uploadMedia is what
    // derives the honest extension/mimetype — the real branch is covered in
    // uploadMedia.test.ts), and a picked file is NOT the recorder's output.
    expect(uploadMedia).toHaveBeenCalledTimes(2);
    const mp3 = uploadMedia.mock.calls[0][0];
    const webm = uploadMedia.mock.calls[1][0];
    expect(mp3.mediaUri).toBe('file:///tmp/pick_note.mp3');
    expect(webm.mediaUri).toBe('content://media/external/audio/media/777');
    for (const call of [mp3, webm]) {
      expect(call.type).toBe('audio');
      expect(call.usage).toBe('post-audio');
      expect(call.isRecordedAudio).toBe(false);
    }
    // Round-18 item 2: the picker's authoritative name/type are threaded to
    // uploadMedia — including for the opaque content:// URI whose extension
    // cannot be guessed from the URI. Without them the out-of-map .webm
    // container degrades to .bin/octet-stream and the server classifies the
    // attachment as a document, while the same file picked on web (mime
    // audio/webm) becomes a post-audio attachment — the cross-platform
    // divergence the pin closes.
    expect(mp3.name).toBe('pick_note.mp3');
    expect(mp3.mimeType).toBe('audio/mpeg');
    expect(webm.name).toBe('track.webm');
    expect(webm.mimeType).toBe('audio/webm');
    expect(onSelect).toHaveBeenCalledWith([attachment, attachment]);
  });

  it('single mode: a re-recorded (replaced) take is not left flagged as a recording', async () => {
    // Round-16 review item 10: in single mode a confirmed take is replaced by
    // the next one. The replaced take's URI must not keep a stale "recorded"
    // flag — so if the recorder re-emits the same URI (same fixed default, or
    // an identical fresh path), the second upload must not be marked
    // isRecordedAudio based on a stale entry.
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect, false); // multiple=false
      await flush();
      return t;
    });

    await openRecordSheet(tree);
    await recordTake(tree); // take A confirmed (flagged as recorded)

    // Re-open, re-record, and confirm take B (same mock URI). Without the
    // single-mode replacement removing the stale flag, take B would be
    // re-flagged as "recorded" on a URI that is now a fresh take.
    await openRecordSheet(tree);
    await recordTake(tree, { rerecordFirst: true });

    const [doneFooter] = findFooters(tree);
    await ReactTestRenderer.act(async () => {
      doneFooter.props.onPress();
      await flush();
    });

    // Exactly one upload (take B), one selection. This drives the single-mode
    // replace path end-to-end. (The `recordedUrls` Set-dedup from the fix is
    // not observable here: the recorder mock always emits the same URI, so
    // take A and take B share it and `isRecordedAudio` is true either way. The
    // dedup matters when the recorder re-emits a distinct URI; it keeps the
    // Set from growing unbounded and keeps a replaced take from leaking a
    // stale flag.)
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([attachment]);
  });

  it('shows a playable preview (play/pause) for a confirmed take', async () => {
    // Round-16 review item 2: web shows an <audio controls> preview; RN gets
    // a play/pause affordance on the visible take that drives the recorder's
    // player (the "small AudioPlayer instance" parity the review asked for).
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect);
      await flush();
      return t;
    });

    const playLabel = 'Play audio';
    // Round-19 item 1: the suite resolves through the real bundles now, so
    // pin the *resolved* pause copy — if the key were missing from both
    // bundles, the raw key `common.media.audio.pause` would surface here and
    // fail.
    const pauseLabel = 'Pause audio';
    expect(pauseLabel).not.toBe('common.media.audio.pause');
    // No preview before a take exists.
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === playLabel).length
    ).toBe(0);

    await openRecordSheet(tree);
    await recordTake(tree);

    // The preview's play button appears once a take is selected.
    const play = findButtonBy(
      tree,
      (p) => p.accessibilityLabel === playLabel
    )[0];
    expect(play).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      play.props.onPress();
      await flush();
    });

    // The player started with the confirmed take's URI (not a fixed default).
    const rec = recorderInstances[recorderInstances.length - 1] as {
      startPlayer: jest.Mock;
    };
    expect(rec.startPlayer).toHaveBeenCalledWith('file:///rec.m4a');

    // Round-18 item 4: while playing the icon is Pause, so the accessible
    // name must switch to the pause copy too — "Play audio" would
    // misdescribe the control. Pressing it (found by its new pause label)
    // stops the take.
    const pause = findButtonBy(
      tree,
      (p) => p.accessibilityLabel === pauseLabel
    )[0];
    expect(pause).toBeTruthy();
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === playLabel).length
    ).toBe(0);
    await ReactTestRenderer.act(async () => {
      pause.props.onPress();
      await flush();
    });
    expect(rec.stopPlayer).toHaveBeenCalled();
    // Stopped: the label is back to play.
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === playLabel).length
    ).toBe(1);
  });

  it("flips back to play when the take finishes (isFinished), like web's `ended`", async () => {
    // Round-19 item 2: a take that ends on its own must leave the playing
    // state (label and icon back to play) instead of a stuck Pause that
    // needs a manual stop-then-play. Web gets this from <audio>'s `ended`;
    // RN drives the same transition off the player's `isFinished` event.
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect);
      await flush();
      return t;
    });

    await openRecordSheet(tree);
    await recordTake(tree);

    const play = findButtonBy(
      tree,
      (p) => p.accessibilityLabel === 'Play audio'
    )[0];
    expect(play).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      play.props.onPress();
      await flush();
    });
    const rec = recorderInstances[recorderInstances.length - 1] as {
      startPlayer: jest.Mock;
      stopPlayer: jest.Mock;
      addPlayBackListener: jest.Mock;
    };
    expect(rec.startPlayer).toHaveBeenCalledWith('file:///rec.m4a');
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === 'Pause audio').length
    ).toBe(1);

    // The natural end of the take: the player reports `isFinished`.
    expect(rec.addPlayBackListener).toHaveBeenCalled();
    const playListener = rec.addPlayBackListener.mock.calls.at(-1)![0] as (e: {
      isFinished: boolean;
      currentPosition: number;
      duration: number;
    }) => void;
    await ReactTestRenderer.act(async () => {
      playListener({
        isFinished: true,
        currentPosition: 10000,
        duration: 10000,
      });
      await flush();
    });

    // The take stopped and the control re-describes itself as play again —
    // one tap replays it, without the stop-then-play round trip.
    expect(rec.stopPlayer).toHaveBeenCalled();
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === 'Pause audio').length
    ).toBe(0);
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === 'Play audio').length
    ).toBe(1);
    // A fresh play starts the player again (on a new instance, since the
    // finished one was torn down by the transition).
    await ReactTestRenderer.act(async () => {
      findButtonBy(
        tree,
        (p) => p.accessibilityLabel === 'Play audio'
      )[0].props.onPress();
      await flush();
    });
    const replay = recorderInstances[recorderInstances.length - 1] as {
      startPlayer: jest.Mock;
    };
    expect(replay.startPlayer).toHaveBeenCalledWith('file:///rec.m4a');
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === 'Pause audio').length
    ).toBe(1);
  });

  it('single mode: confirming a re-record stops a playing preview of the replaced take', async () => {
    // Round-20 item 1: the record path replaces the visible take (single mode)
    // but did not stop the preview that was playing the *replaced* take — the
    // pick path does. Unique per-take paths mean the discarded file still
    // exists, so the player would keep it audible while `visibleUri` already
    // points at the new take. This pins the mirror of the pick path: a
    // re-record confirmed while a preview is playing stops the preview and
    // clears `playingUri` (label back to Play).
    const attachment = { id: 'att-voice', type: 'audio' };
    uploadMedia.mockResolvedValue(attachment);
    const onSelect = jest.fn();

    const tree = await ReactTestRenderer.act(async () => {
      const t = renderSheet(onSelect, false); // single mode
      await flush();
      return t;
    });

    // First take confirmed → selected, preview playable.
    await openRecordSheet(tree);
    await recordTake(tree);

    // Start the picker preview for the confirmed take.
    const play = findButtonBy(
      tree,
      (p) => p.accessibilityLabel === 'Play audio'
    )[0];
    expect(play).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      play.props.onPress();
      await flush();
    });
    // The picker's preview player is the most recently created instance; it
    // is playing the confirmed take, so the control re-describes as Pause.
    const previewPlayer = recorderInstances[recorderInstances.length - 1] as {
      startPlayer: jest.Mock;
      stopPlayer: jest.Mock;
    };
    expect(previewPlayer.startPlayer).toHaveBeenCalledWith('file:///rec.m4a');
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === 'Pause audio').length
    ).toBe(1);

    // Confirm a re-record (single mode replaces the visible take) while the
    // preview of the replaced take is still playing.
    await openRecordSheet(tree);
    await recordTake(tree, { rerecordFirst: true });

    // The discarded take's preview stopped (no ghost sound) and the control is
    // back to Play — `playingUri` no longer holds the old uri.
    expect(previewPlayer.stopPlayer).toHaveBeenCalled();
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === 'Pause audio').length
    ).toBe(0);
    expect(
      findButtonBy(tree, (p) => p.accessibilityLabel === 'Play audio').length
    ).toBe(1);
  });
});
