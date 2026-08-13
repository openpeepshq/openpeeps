export const toCsv = (rows: Array<Array<string | number>>): string =>
  rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          if (/[",\n\r]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    )
    .join('\n');

export const downloadCsv = (
  filename: string,
  rows: Array<Array<string | number>>,
): void => {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
