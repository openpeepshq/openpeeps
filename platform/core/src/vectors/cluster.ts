/** Tables whose embeddings may feed topic clustering. KB chunks are excluded. */
export const TOPIC_SOURCE_TABLES = [
  'posts',
  'profiles',
  'jam_transcripts',
] as const;

export type TopicSourceTable = (typeof TOPIC_SOURCE_TABLES)[number];

const dot = (left: number[], right: number[]) => {
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += left[index]! * right[index]!;
  }
  return sum;
};

const magnitude = (values: number[]) => Math.sqrt(dot(values, values));

export const cosineSimilarity = (left: number[], right: number[]) => {
  const denom = magnitude(left) * magnitude(right);
  return denom === 0 ? 0 : dot(left, right) / denom;
};

const nearest = (point: number[], centroids: number[][]) => {
  let best = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  centroids.forEach((centroid, index) => {
    const score = cosineSimilarity(point, centroid);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
};

const mean = (points: number[][]): number[] | undefined => {
  const first = points[0];
  if (!first) return undefined;
  const totals = first.map(() => 0);
  points.forEach((point) => {
    point.forEach((value, index) => {
      totals[index] = (totals[index] ?? 0) + value;
    });
  });
  return totals.map((value) => value / points.length);
};

/** Flat K-Means. Deterministic: the first `k` points seed the centroids. */
export const kMeans = (vectors: number[][], requestedK: number) => {
  const points = vectors.filter((vector) => vector.length > 0);
  if (points.length === 0 || requestedK < 1) {
    return { assignments: [] as number[], centroids: [] as number[][] };
  }
  const k = Math.min(requestedK, points.length);
  let centroids = points.slice(0, k).map((point) => [...point]);
  let assignments = points.map(() => 0);
  for (let iteration = 0; iteration < 15; iteration += 1) {
    assignments = points.map((point) => nearest(point, centroids));
    centroids = centroids.map((previous, index) => {
      const members = points.filter(
        (_, pointIndex) => assignments[pointIndex] === index,
      );
      return mean(members) ?? previous;
    });
  }
  return { assignments, centroids };
};
