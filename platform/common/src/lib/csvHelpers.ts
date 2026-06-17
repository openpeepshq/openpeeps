export const escapeCsvCell = (
  value: string | number | null | undefined,
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
  values: Array<string | number | null | undefined>,
): string => values.map(escapeCsvCell).join(',');
