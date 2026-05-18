import { ProcessingStats } from '@openpeeps/common/types';
import { processingStatsMapping } from './mapping';
import { allpeepDb } from '../db';

const HISTORY_SAMPLE_SIZE = 50;

const FILETYPE_DEFAULTS_MS: Record<string, number> = {
  image: 2_000,
  audio: 8_000,
  video: 30_000,
  document: 1_500,
};
const GENERIC_DEFAULT_MS = 5_000;

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const findRecent = async (
  filter: Record<string, unknown>,
): Promise<ProcessingStats[]> => {
  const db = await allpeepDb().then((db) => db.db);
  return processingStatsMapping
    .filter({ matches: filter })
    .sort([['DOC.createdAt', 'DESC']])
    .limit(HISTORY_SAMPLE_SIZE)
    .all(db);
};

export const estimateProcessingDuration = async ({
  filetype,
  filesize,
}: {
  filetype: string;
  filesize: number;
}): Promise<number> => {
  const lower = filesize * 0.5;
  const upper = filesize * 2;

  const sized = await findRecent({ filetype })
    .then((rows) =>
      rows.filter((r) => r.filesize >= lower && r.filesize <= upper),
    )
    .catch(() => [] as ProcessingStats[]);

  if (sized.length >= 3) {
    return median(sized.map((r) => r.durationMs));
  }

  const allByType = await findRecent({ filetype }).catch(
    () => [] as ProcessingStats[],
  );
  if (allByType.length) {
    const scaledMedian = median(
      allByType.map(
        (r) => (r.durationMs / Math.max(1, r.filesize)) * filesize,
      ),
    );
    if (scaledMedian > 0) return scaledMedian;
  }

  return FILETYPE_DEFAULTS_MS[filetype] ?? GENERIC_DEFAULT_MS;
};
