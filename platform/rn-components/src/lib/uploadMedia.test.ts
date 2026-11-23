/**
 * Focused unit coverage for the `uploadMedia` audio branch (#327, review item
 * 1). The rest of the feature leans on this branch's honest name/mimetype logic
 * (recorded → trusted .m4a/audio/mp4; picked → keep the real container), but it
 * was previously only exercised through a mocked-away `uploadMedia`. Here the
 * real `uploadMedia` runs; only the native modules it touches (RNFS, the asset
 * converter, Toast) are mocked.
 */
const fsExists = jest.fn(async () => false);
const fsStat = jest.fn(async () => ({ size: 4096 }));
const fsCopyFile = jest.fn(async () => undefined);
const copyAssetsFileIOS = jest.fn(async () => undefined);

jest.mock('react-native-fs', () => ({
  TemporaryDirectoryPath: '/tmp/',
  CachesDirectoryPath: '/cache/',
  exists: (p: string) => fsExists(p),
  stat: (p: string) => fsStat(p),
  copyFile: (a: string, b: string) => fsCopyFile(a, b),
  copyAssetsFileIOS: (...a: unknown[]) => copyAssetsFileIOS(...a),
  readFile: jest.fn(async () => ''),
  writeFile: jest.fn(async () => undefined),
}));

jest.mock('react-native-convert-ph-asset', () => ({
  __esModule: true,
  default: { convertVideoFromUrl: jest.fn() },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

// `uploadMedia` pulls in `../i18n/index`, whose load-time `initI18nOnce()`
// references the RN `__DEV__` global — so the i18n module is mocked (it is only
// touched in the error path, which these tests do not exercise).
jest.mock('../i18n/index', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

// `mediaUriHelpers` (react-native) is the only other RN-specific runtime —
// mocked so the native runtime is never required under Jest's Node environment.
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  InteractionManager: {
    runAfterInteractions: (cb: () => void) => {
      cb();
      return {
        then: () => undefined,
        done: () => undefined,
        cancel: () => undefined,
      };
    },
  },
}));

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    BASE_URL: '',
    APP_ENV: 'test',
    LOGIN_EMAIL: '',
    LOGIN_PASSWORD: '',
  },
}));

import { uploadMedia, AUDIO_EXTENSION_MIME } from './uploadMedia';

// Web's `ComposeAttachments` gates an uploaded file as "audio" by this
// extension set (AUDIO_NAME). Every container web classifies as audio must be
// covered by RN's picked-file map, or the same upload would carry a
// .bin/octet-stream name+mimetype on RN but a correct audio one on web.
// (RN's map may additionally hold `mp4` — an MPEG-4 audio container — which
// web routes to video; that superset entry is intentional and not checked here.)
const WEB_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'ogg',
  'oga',
  'm4a',
  'aac',
  'flac',
  'opus',
  'weba',
];

const captured = jest.fn();
const createAttachments = jest.fn(async (...args: unknown[]) => {
  captured(args[0]);
  return {
    id: 'att-1',
    type: 'audio',
    url: 'https://cdn/att',
    previewUrl: null,
    filename: null,
    meta: { usage: 'attachment', mimetype: 'x' },
    description: 'audio',
    blurhash: null,
    status: 'ready',
  };
});

const callUpload = (
  mediaUri: string,
  opts: {
    name?: string | null;
    mimeType?: string | null;
    isRecordedAudio?: boolean;
  } = {}
) =>
  uploadMedia({
    mediaUri,
    createAttachments,
    type: 'audio',
    usage: 'attachment',
    alt: 'audio',
    name: opts.name ?? null,
    mimeType: opts.mimeType ?? null,
    isRecordedAudio: opts.isRecordedAudio,
  });

const sentFile = () => (captured as unknown as jest.Mock).mock.calls[0][0].file;
const sentName = () => sentFile().name as string;
const sentMime = () => sentFile().type as string;

beforeEach(() => {
  captured.mockClear();
  createAttachments.mockClear();
  fsExists.mockClear();
  fsStat.mockClear();
});

describe('uploadMedia audio branch', () => {
  it('records a voice note as a trusted .m4a / audio/mp4 (no extension guess)', async () => {
    await callUpload('file:///tmp/rec_123.m4a', { isRecordedAudio: true });
    expect(sentName()).toMatch(/\.m4a$/);
    expect(sentMime()).toBe('audio/mp4');
  });

  it.each([
    ['mp3', 'audio/mpeg'],
    ['ogg', 'audio/ogg'],
    ['wav', 'audio/wav'],
    ['flac', 'audio/flac'],
    ['m4a', 'audio/mp4'],
    ['aac', 'audio/aac'],
  ])(
    'a picked .%s file keeps its extension and honest mime',
    async (ext, mime) => {
      await callUpload(`file:///tmp/pick_${Date.now()}.${ext}`);
      expect(sentName()).toMatch(new RegExp(`\\.${ext}$`));
      expect(sentMime()).toBe(mime);
    }
  );

  it('degrades a content:// URI with no extension to .bin / octet-stream', async () => {
    await callUpload('content://media/external/audio/media/123');
    expect(sentName()).toMatch(/\.bin$/);
    expect(sentMime()).toBe('application/octet-stream');
  });

  it('lets an explicit mime override the extension inference for picked files', async () => {
    await callUpload('file:///tmp/pick.ogg', { mimeType: 'audio/ogg' });
    expect(sentName()).toMatch(/\.ogg$/);
    expect(sentMime()).toBe('audio/ogg');
  });

  it('classifies an out-of-map container as audio from the picker-reported name+mime (no .bin fallthrough)', async () => {
    // Round-18 item 2: an opaque content:// URI whose container is not in
    // AUDIO_EXTENSION_MIME (audio .webm) used to degrade to .bin/
    // application/octet-stream on RN — which the server classifies as a
    // document — while the same file picked on web (file.type audio/webm)
    // becomes a post-audio attachment. The document picker's authoritative
    // name/type now carry the classification across.
    await callUpload('content://media/external/audio/media/777', {
      name: 'track.webm',
      mimeType: 'audio/webm',
    });
    expect(sentName()).toMatch(/\.webm$/);
    expect(sentMime()).toBe('audio/webm');
  });

  it('covers every web-audio extension in AUDIO_EXTENSION_MIME', () => {
    for (const ext of WEB_AUDIO_EXTENSIONS) {
      expect(AUDIO_EXTENSION_MIME[ext]).toMatch(/^audio\//);
    }
  });
});
