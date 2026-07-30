/**
 * Drop object keys whose value is exactly `""` so cleared config fields are
 * absent from stored overrides and fall back to defaults on merge.
 * Leaves arrays intact (only recurses into object elements). Drops empty
 * plain objects left after pruning children.
 */
export const pruneEmptyConfigStrings = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) =>
      item !== null && typeof item === 'object'
        ? pruneEmptyConfigStrings(item)
        : item,
    );
  }

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child === '') continue;
    const pruned = pruneEmptyConfigStrings(child);
    if (
      pruned !== null &&
      typeof pruned === 'object' &&
      !Array.isArray(pruned) &&
      Object.keys(pruned as Record<string, unknown>).length === 0
    ) {
      continue;
    }
    result[key] = pruned;
  }
  return result;
};
