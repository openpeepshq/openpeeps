export const escapeCsvCell = (
  value: string | number | boolean | null | undefined,
): string => {
  if (value == null) {
    return '';
  }

  const str = String(value);

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};

export const toCsvRow = (
  values: Array<string | number | null | undefined | boolean>,
): string => values.map(escapeCsvCell).join(',');

/** Filesystem-safe `<event name>-<export time>-rsvps.csv`. */
export const rsvpExportFilename = (
  eventName: string | undefined,
  exportedAt: Date,
): string => {
  const name =
    (eventName ?? '')
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'event';
  const stamp = exportedAt
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/:/g, '-');
  return `${name}-${stamp}-rsvps.csv`;
};

export const formatMemberExportCustomFields = (
  fields: ReadonlyArray<{ name: string; value: string }> | undefined,
): string => {
  if (!fields?.length) {
    return '';
  }

  return JSON.stringify(fields.map(({ name, value }) => ({ name, value })));
};
