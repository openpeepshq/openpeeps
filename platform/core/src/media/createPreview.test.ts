import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPreview } from './index';

describe('createPreview', () => {
  it('generates a webp card for generic files', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'op-preview-'));
    const input = path.join(dir, 'notes.txt');
    await writeFile(input, 'hello');
    const preview = await createPreview(input, 'text/plain', 'notes.txt');
    expect(preview.mimetype).toBe('image/webp');
    expect(preview.path).not.toBe(input);
  });
});
