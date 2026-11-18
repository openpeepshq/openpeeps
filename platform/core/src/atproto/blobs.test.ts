import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cidForBytes, storeMediaAttachmentBlob } from './blobs';

// The write path the review flagged as "write-only": a note's attachment must
// land in the AT blob store with the CID of its content. Media bytes are read
// from the shared media store (the upload wrote them on disk before
// postCreated fired), so storeMediaAttachmentBlob is what actually uploads.
const mediaData = new TextEncoder().encode('image-bytes-for-blob');
let existingRow: Array<unknown> = [];
const stored: Array<Record<string, unknown>> = [];
const storeMock = vi.fn(async () => 'stored-media-key');
const dataMock = vi.fn(async () => mediaData);

vi.mock('../media', () => ({
  mediaStorage: () =>
    Promise.resolve({
      getData: dataMock,
      store: storeMock,
    }),
}));
vi.mock('../db/pg/client', () => {
  const builder = {
    from: () => builder,
    where: () => builder,
    limit: () => Promise.resolve(existingRow),
  };
  return {
    pgDb: () => ({
      select: () => builder,
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          stored.push(values);
          return Promise.resolve();
        },
      }),
    }),
  };
});

const imageAttachment = {
  url: 'https://media.example.com/allpeep/media-key-1/file',
  filename: 'pic.png',
  meta: { mimetype: 'image/png' },
};

describe('storeMediaAttachmentBlob', () => {
  beforeEach(() => {
    existingRow = [];
    stored.length = 0;
    storeMock.mockClear();
    dataMock.mockClear();
  });

  it('stores the attachment bytes under their content CID', async () => {
    const result = await storeMediaAttachmentBlob(
      'did:plc:alice',
      imageAttachment,
    );

    // The media key is parsed from the /allpeep/<key>/ URL, not invented.
    expect(dataMock).toHaveBeenCalledWith('media-key-1');
    expect(storeMock).toHaveBeenCalledOnce();
    expect(result).not.toBeNull();
    expect(result?.cid).toBe(await cidForBytes(mediaData));
    // The row records the caller's DID, the CID, the media key, and the URL.
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      did: 'did:plc:alice',
      cid: result?.cid,
      mediaId: 'stored-media-key',
      mimeType: 'image/png',
      body: { url: imageAttachment.url },
    });
  });

  it('dedupes to the existing blob when the CID was already stored', async () => {
    const expectedCid = await cidForBytes(mediaData);
    existingRow = [
      { cid: expectedCid, mediaId: 'media-key-1', mimeType: 'image/png' },
    ];

    const result = await storeMediaAttachmentBlob(
      'did:plc:alice',
      imageAttachment,
    );

    expect(result).toEqual({
      cid: expectedCid,
      mediaId: 'media-key-1',
      mimeType: 'image/png',
    });
    expect(storeMock).not.toHaveBeenCalled();
    expect(stored).toHaveLength(0);
  });

  it('returns null for a URL that is not a known media path', async () => {
    const result = await storeMediaAttachmentBlob('did:plc:alice', {
      url: 'https://external.example.com/img.png',
    });
    expect(result).toBeNull();
    expect(dataMock).not.toHaveBeenCalled();
  });

  it('returns null when the media bytes are gone rather than throwing', async () => {
    dataMock.mockRejectedValueOnce(new Error('ENOENT'));
    const result = await storeMediaAttachmentBlob(
      'did:plc:alice',
      imageAttachment,
    );
    expect(result).toBeNull();
    expect(storeMock).not.toHaveBeenCalled();
  });
});
