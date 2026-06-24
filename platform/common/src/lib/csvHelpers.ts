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

export const formatMemberExportCustomFields = (
  fields: ReadonlyArray<{ name: string; value: string }> | undefined,
): string => {
  if (!fields?.length) {
    return '';
  }

  return JSON.stringify(
    fields.map(({ name, value }) => ({ name, value })),
  );
};
