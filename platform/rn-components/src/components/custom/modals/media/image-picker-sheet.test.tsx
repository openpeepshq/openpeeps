/**
 * Unit tests for the ImagePickerSheet error paths (#1789).
 *
 * The sheet is the single gate for image picks: every library/camera pick
 * must go through the cropper, a crop failure must upload nothing and show
 * the form.imageInput.cropError toast (the sheet closes so the retry
 * surface is clean), and a cancel must be silent.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

let mockTranslations: Record<string, string> = {};

const toastShow = jest.fn();
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: (options: unknown) => toastShow(options) },
}));

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  Text: (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children),
  ActivityIndicator: () => React.createElement('ActivityIndicator'),
  Platform: { OS: 'android' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => mockTranslations[key] ?? key,
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      createMediaAttachmentAction: () => jest.fn(),
    },
  }),
}));

jest.mock('../../../../theme/OpenPeepsThemeProvider', () => ({
  useOpenPeepsTheme: () => ({
    colors: { background: '#fff', foreground: '#000' },
    isDark: false,
  }),
}));

jest.mock('react-native-image-crop-picker', () => ({
  __esModule: true,
  default: {
    openCropper: jest.fn(),
    openCamera: jest.fn(),
    openPicker: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('../../../../lib/uploadMedia', () => ({
  uploadMedia: jest.fn(),
}));

jest.mock('../../../../lib/bottom-sheet-ref', () => ({
  bottomSheetClose: jest.fn(),
}));

jest.mock('../../../../lib/mediaUriHelpers', () => ({
  dismissSheetForNativeModal: jest.fn(async () => {}),
  isPickerCancelled: (error: unknown): boolean =>
    (error as { code?: string })?.code === 'E_PICKER_CANCELLED',
  toCropperPath: jest.fn(async (uri: string) => uri),
}));

jest.mock('../common', () => ({
  BaseSheet: (props: { children?: unknown }) =>
    React.createElement('BaseSheet', null, props.children),
}));

jest.mock('../../../ui/button', () => ({
  Button: (props: {
    children?: unknown;
    onPress?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      'Button',
      { onPress: props.onPress, disabled: props.disabled },
      props.children
    ),
}));

jest.mock('../../../icons/index', () => ({
  CameraIcon: () => React.createElement('CameraIcon'),
  ImageIcon: () => React.createElement('ImageIcon'),
}));

import { ImagePickerSheet } from './image-picker-sheet';

const openCropper = require('react-native-image-crop-picker').default
  .openCropper;
const launchImageLibrary =
  require('react-native-image-picker').launchImageLibrary;
const uploadMedia = require('../../../../lib/uploadMedia').uploadMedia;
const bottomSheetClose =
  require('../../../../lib/bottom-sheet-ref').bottomSheetClose;

const renderSheet = (onSelect: (attachments: unknown[]) => void) => {
  let tree!: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ImagePickerSheet, {
        ref: { current: null },
        onSelect,
      })
    );
  });
  return tree;
};

// The Library button is the second outline Button in the sheet. Drain the
// pick promise chain inside act so the sheet's state updates stay wrapped.
const pressLibrary = async (
  tree: ReturnType<typeof ReactTestRenderer.create>
) => {
  const buttons = tree.root.findAll(
    (node) =>
      typeof node.type === 'string' &&
      node.type === 'Button' &&
      !node.props.disabled
  );
  await ReactTestRenderer.act(async () => {
    buttons[buttons.length - 1].props.onPress();
    for (let i = 0; i < 15; i++) {
      await Promise.resolve();
    }
  });
};

describe('ImagePickerSheet error paths', () => {
  beforeEach(() => {
    mockTranslations = { 'form.imageInput.cropError': 'Crop failed' };
    toastShow.mockClear();
    uploadMedia.mockClear();
    bottomSheetClose.mockClear();
    openCropper.mockReset();
    launchImageLibrary.mockReset();
  });

  it('uploads nothing, toasts, and closes the sheet on a crop failure', async () => {
    launchImageLibrary.mockResolvedValue({
      didCancel: false,
      assets: [{ uri: 'file:///tmp/pick.jpg' }],
    });
    openCropper.mockRejectedValue(new Error('cropper blew up'));

    const tree = renderSheet(jest.fn());
    await pressLibrary(tree);

    expect(uploadMedia).not.toHaveBeenCalled();
    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({ text1: 'Crop failed' })
    );
    expect(bottomSheetClose).toHaveBeenCalled();
  });

  it('stays silent on a cancelled pick', async () => {
    launchImageLibrary.mockResolvedValue({ didCancel: true, assets: [] });

    const tree = renderSheet(jest.fn());
    await pressLibrary(tree);

    expect(toastShow).not.toHaveBeenCalled();
    expect(openCropper).not.toHaveBeenCalled();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('resolves exactly one asset and uploads exactly one attachment', async () => {
    launchImageLibrary.mockResolvedValue({
      didCancel: false,
      assets: [{ uri: 'file:///tmp/pick.jpg' }],
    });
    openCropper.mockResolvedValue({ path: '/tmp/cropped.jpg' });
    uploadMedia.mockResolvedValue({ id: 'att-1', type: 'image' });
    const onSelect = jest.fn();

    const tree = renderSheet(onSelect);
    await pressLibrary(tree);

    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([{ id: 'att-1', type: 'image' }]);
    expect(launchImageLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ selectionLimit: 1 })
    );
  });
});
