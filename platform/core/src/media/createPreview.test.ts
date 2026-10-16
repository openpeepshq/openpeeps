import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { createPreview } from './index';

const createTestPdf = (outputPath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = createWriteStream(outputPath);
    doc.pipe(stream);
    doc.text('Test PDF content for preview');
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

describe('createPreview', () => {
  it('generates a webp card for generic files', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
    const input = path.join(dir, 'notes.txt');
    await writeFile(input, 'hello');
    const preview = await createPreview(input, 'text/plain', 'notes.txt');
    expect(preview.mimetype).toBe('image/webp');
    expect(preview.path).not.toBe(input);
    expect(await isValidWebp(preview.path)).toBe(true);
  });

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
  });

  it('falls back to card preview for office documents without libreoffice', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
    const input = path.join(dir, 'spreadsheet.xlsx');
    await writeFile(input, Buffer.from('fake excel content'));
    const preview = await createPreview(
      input,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'spreadsheet.xlsx',
    );
    expect(preview.mimetype).toBe('image/webp');
    expect(preview.path).not.toBe(input);
    expect(await isValidWebp(preview.path)).toBe(true);
    await cleanup([preview.path, dir]);
  });
});
