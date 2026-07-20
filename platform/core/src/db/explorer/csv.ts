import { toCsvRow } from '@openpeeps/common/lib';

export const rowsToCsv = (
  columns: string[],
  rows: Array<Record<string, unknown>>,
): string => {
  const header = toCsvRow(columns);
  const body = rows.map((row) =>
    toCsvRow(
      columns.map((col) => {
        const value = row[col];
        if (value == null) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return value;
        }
        return String(value);
      }),
    ),
  );
  return [header, ...body].join('\n');
};
