import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createWriteStream, statSync } from 'node:fs';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { createPreview, MediaContentError } from './index';

const createTestPdf = (
  outputPath: string,
  opts: { blank?: boolean } = {},
): Promise<void> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = createWriteStream(outputPath);
    doc.pipe(stream);
    if (!opts.blank) {
      doc.text('Test PDF content for preview');
    }
    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

const isValidWebp = async (filePath: string): Promise<boolean> => {
  try {
    const metadata = await sharp(filePath).metadata();
    return metadata.format === 'webp';
  } catch {
    return false;
  }
};

const cleanup = async (paths: string[]) => {
  await Promise.all(
    paths.map((p) => rm(p, { force: true, recursive: true }).catch(() => {})),
  );
};

const hasFfmpeg = (): Promise<boolean> =>
  new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (error) => resolve(!error));
  });

/** Create a 1-second 440 Hz sine wave as a mono PCM WAV (no ffmpeg needed). */
const createTestWav = (outputPath: string): Promise<void> => {
  const sampleRate = 44100;
  const numSamples = sampleRate;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(
      Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5 * 32767,
    );
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return writeFile(outputPath, buffer);
};

/** Create a small solid-color PNG that fits under previewMaxWidth. */
const createTestPng = async (outputPath: string, width = 100, height = 100) => {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 128, b: 64 },
    },
  })
    .png()
    .toFile(outputPath);
};

/** Create a small HEIF/HEIC image (AV1-coded, since HEVC may not be available). */
const createTestHeic = async (
  outputPath: string,
  width = 100,
  height = 100,
) => {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 200, b: 50 },
    },
  })
    .toFormat('heif', { compression: 'av1' })
    .toFile(outputPath);
};

describe('createPreview', () => {
  describe('images', () => {
    it('always converts to WebP (issue #1774 — small images no longer pass through)', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'avatar.png');
      await createTestPng(input, 100, 100);

      const preview = await createPreview(input, 'image/png', 'avatar.png');

      expect(preview.mimetype).toBe('image/webp');
      expect(preview.path).not.toBe(input);
      expect(await isValidWebp(preview.path)).toBe(true);
      await cleanup([preview.path, dir]);
    });

    it('converts HEIC/HEIF input to WebP (issue #1774)', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'photo.heic');
      try {
        await createTestHeic(input);
      } catch {
        // HEIF encoder not available in this environment — skip
        await cleanup([dir]);
        return;
      }

      const preview = await createPreview(input, 'image/heic', 'photo.heic');

      expect(preview.mimetype).toBe('image/webp');
      expect(preview.path).not.toBe(input);
      expect(await isValidWebp(preview.path)).toBe(true);
      // The output should NOT be the original HEIC file
      const inputStats = statSync(input);
      const outputStats = statSync(preview.path);
      expect(outputStats.size).not.toBe(inputStats.size);
      await cleanup([preview.path, dir]);
    });

    it('throws MediaContentError for a text file renamed to .jpg (issue #1773)', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'fake-image.jpg');
      await writeFile(input, 'this is not an image at all');

      await expect(
        createPreview(input, 'image/jpeg', 'fake-image.jpg'),
      ).rejects.toThrow(MediaContentError);

      await cleanup([dir]);
    });

    it('throws MediaContentError for a zero-byte image file', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'empty.png');
      await writeFile(input, '');

      await expect(
        createPreview(input, 'image/png', 'empty.png'),
      ).rejects.toThrow(MediaContentError);

      await cleanup([dir]);
    });
  });

  describe('PDFs (issue #1754)', () => {
    it('renders a PDF preview from the first page', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'document.pdf');
      await createTestPdf(input);

      const preview = await createPreview(
        input,
        'application/pdf',
        'document.pdf',
      );

      expect(preview.mimetype).toBe('image/webp');
      expect(preview.path).not.toBe(input);
      expect(await isValidWebp(preview.path)).toBe(true);
      await cleanup([preview.path, dir]);
    });

    it('falls back to card preview when PDF rendering produces empty output', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'corrupt.pdf');
      // Garbage bytes that sharp may accept as a PDF header but render to nothing
      await writeFile(input, '%PDF-1.4\n% corrupt pdf with no pages');

      const preview = await createPreview(
        input,
        'application/pdf',
        'corrupt.pdf',
      );

      // Should fall back to the document card preview (still a valid WebP)
      expect(preview.mimetype).toBe('image/webp');
      expect(preview.path).not.toBe(input);
      expect(await isValidWebp(preview.path)).toBe(true);
      await cleanup([preview.path, dir]);
    });

    it('falls back to card preview when sharp cannot decode the PDF at all', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'notreally.pdf');
      await writeFile(input, Buffer.from([0x00, 0x01, 0x02, 0x03]));

      const preview = await createPreview(
        input,
        'application/pdf',
        'notreally.pdf',
      );

      expect(preview.mimetype).toBe('image/webp');
      expect(preview.path).not.toBe(input);
      expect(await isValidWebp(preview.path)).toBe(true);
      await cleanup([preview.path, dir]);
    });

    it('falls back to card preview when the PDF page renders as a blank image', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'blank.pdf');
      // A PDF with a blank first page (no text, no graphics) — sharp renders it
      // to an all-white image; the stats check should detect this and trigger
      // the fallback to the document card preview.
      await createTestPdf(input, { blank: true });

      const preview = await createPreview(
        input,
        'application/pdf',
        'blank.pdf',
      );

      // The card preview shows the filename, not the raw PDF render
      expect(preview.mimetype).toBe('image/webp');
      expect(preview.path).not.toBe(input);
      expect(await isValidWebp(preview.path)).toBe(true);
      await cleanup([preview.path, dir]);
    });
  });

  describe('audio (issue #1791)', () => {
    it('renders a waveform PNG for audio input', async () => {
      // CI unit tests run on node:24-alpine without ffmpeg — skip there.
      if (!(await hasFfmpeg())) return;
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'tone.wav');
      await createTestWav(input);

      const preview = await createPreview(input, 'audio/wav', 'tone.wav');

      expect(preview.mimetype).toBe('image/png');
      expect(preview.path).not.toBe(input);
      const metadata = await sharp(preview.path).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(700);
      expect(metadata.height).toBe(700);
      await cleanup([preview.path, dir]);
    });

    it('rejects when the file is not decodable audio', async () => {
      if (!(await hasFfmpeg())) return;
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'fake.mp3');
      await writeFile(input, 'this is not an audio file');

      await expect(
        createPreview(input, 'audio/mpeg', 'fake.mp3'),
      ).rejects.toThrow('Error generating audio preview');

      await cleanup([dir]);
    });
  });

  describe('other file types', () => {
    it('generates a webp card for generic files', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
      const input = path.join(dir, 'notes.txt');
      await writeFile(input, 'hello');
      const preview = await createPreview(input, 'text/plain', 'notes.txt');
      expect(preview.mimetype).toBe('image/webp');
      expect(preview.path).not.toBe(input);
      expect(await isValidWebp(preview.path)).toBe(true);
      await cleanup([preview.path, dir]);
    });

    // Every office document type listed in OFFICE_DOC_EXTENSIONS should
    // produce a valid WebP card preview (or PDF render) when libreoffice is
    // unavailable.
    const officeTypes: Array<{ filename: string; mimetype: string }> = [
      {
        filename: 'doc.docx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      { filename: 'doc.doc', mimetype: 'application/msword' },
      {
        filename: 'sheet.xlsx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      { filename: 'sheet.xls', mimetype: 'application/vnd.ms-excel' },
      {
        filename: 'slide.pptx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      },
      { filename: 'slide.ppt', mimetype: 'application/vnd.ms-powerpoint' },
      {
        filename: 'doc.odt',
        mimetype: 'application/vnd.oasis.opendocument.text',
      },
      {
        filename: 'sheet.ods',
        mimetype: 'application/vnd.oasis.opendocument.spreadsheet',
      },
      {
        filename: 'slide.odp',
        mimetype: 'application/vnd.oasis.opendocument.presentation',
      },
    ];

    officeTypes.forEach(({ filename, mimetype }) => {
      it(`generates a webp card for ${filename}`, async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
        const input = path.join(dir, filename);
        await writeFile(input, Buffer.from('fake office document content'));
        const preview = await createPreview(input, mimetype, filename);
        expect(preview.mimetype).toBe('image/webp');
        expect(preview.path).not.toBe(input);
        expect(await isValidWebp(preview.path)).toBe(true);
        await cleanup([preview.path, dir]);
      });
    });
  });
});
