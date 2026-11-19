import { extractWithNodeStreamZip } from '../backups/extractWithNodeStreamZip';

/**
 * Shared test helper: extract a zip through the *production* node-stream-zip
 * fallback so suites exercise the shipped extraction path instead of a local
 * copy of it.
 */
export const extractZipForTest = (zipPath: string, dir: string) =>
  extractWithNodeStreamZip(zipPath, dir).promise;

// Built once per process instead of per buildStoredZip call — suites build
// many fixtures, and the table is data-independent.
let crc32Table: Int32Array | undefined;
const getCrc32Table = (): Int32Array => {
  if (!crc32Table) {
    crc32Table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32Table[n] = c;
    }
  }
  return crc32Table;
};

/* Minimal stored (uncompressed) zip writer for hostile-archive fixtures.
   Writes only STORED entries with a fixed version tag (u16(20)); deflate
   entries and zip64 are unsupported — pass uncompressed data and keep sizes
   under 4 GiB, or the CRC/length fields will silently mismatch. Sets
   explicit Unix external attributes so symlink entries carry the symlink
   file type in mode bits. */
export const buildStoredZip = (
  entries: Array<{ name: string; data: Buffer; mode: number }>,
): Buffer => {
  const crc32 = (buf: Buffer): number => {
    const table = getCrc32Table();
    let c = -1;
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const u16 = (v: number) => Buffer.from([v & 0xff, (v >> 8) & 0xff]);
  const u32 = (v: number) =>
    Buffer.from([
      v & 0xff,
      (v >> 8) & 0xff,
      (v >> 16) & 0xff,
      (v >>> 24) & 0xff,
    ]);

  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.data.length),
      u32(entry.data.length),
      u16(name.length),
      u16(0),
      name,
      entry.data,
    ]);
    locals.push(local);
    centrals.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(entry.data.length),
        u32(entry.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(entry.mode << 16),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = Buffer.concat(centrals);
  return Buffer.concat([
    ...locals,
    central,
    Buffer.concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(entries.length),
      u16(entries.length),
      u32(central.length),
      u32(offset),
      u16(0),
    ]),
  ]);
};
