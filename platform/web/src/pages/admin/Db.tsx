import { useCallback, useMemo, useState } from 'react';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Button } from '@openpeeps/react-ui';
import { toCsvRow } from '@openpeeps/common/lib';
import type { ExplorerColumn, ExplorerTable } from '@openpeeps/common/types';

type Tab = 'browse' | 'sql';

type PageSizeOption = 50 | 200 | 1000 | 'all';

const PAGE_SIZE_OPTIONS: PageSizeOption[] = [50, 200, 1000, 'all'];
/** Server hard cap used for "All". */
const PAGE_SIZE_ALL = 10_000;

const pageSizeToLimit = (size: PageSizeOption): number =>
  size === 'all' ? PAGE_SIZE_ALL : size;

const formatCell = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const cellEditorValue = (value: unknown, dataType: string): string => {
  if (value == null) return '';
  if (dataType.includes('json') || typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const rowsToCsv = (
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

const downloadBlob = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export function AdminDb() {
  const t = useT();
  const { openpeepsApi, client } = useOpenpeeps();
  const tablesQuery = openpeepsApi.admin.useDbTables();
  const updateRow = openpeepsApi.admin.updateDbRowAction();
  const runSql = openpeepsApi.admin.runDbSqlAction();

  const [tab, setTab] = useState<Tab>('browse');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [filterCol, setFilterCol] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [appliedFilter, setAppliedFilter] = useState<{
    col: string;
    value: string;
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<{
    primaryKey: Record<string, unknown>;
    column: string;
    value: string;
    dataType: string;
  } | null>(null);
  const [sqlText, setSqlText] = useState('SELECT 1');
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    command: string;
  } | null>(null);
  const [browsePageSize, setBrowsePageSize] = useState<PageSizeOption>(50);
  const [sqlPageSize, setSqlPageSize] = useState<PageSizeOption>(50);

  const limit = pageSizeToLimit(browsePageSize);
  const rowsQueryParams = useMemo(() => {
    const q: Record<string, string> = {
      limit: String(limit),
      offset: String(offset),
    };
    if (appliedFilter?.col && appliedFilter.value) {
      q[`filter.${appliedFilter.col}`] = appliedFilter.value;
    }
    return q;
  }, [appliedFilter, limit, offset]);

  const rowsQuery = openpeepsApi.admin.useDbRows(
    selectedTable,
    selectedTable ? rowsQueryParams : undefined,
  );

  const tables = tablesQuery.data?.tables ?? [];
  const selectedMeta: ExplorerTable | undefined = tables.find(
    (table: ExplorerTable) => table.name === selectedTable,
  );
  const columns: ExplorerColumn[] = selectedMeta?.columns ?? [];
  const pkNames = columns.filter((c) => c.primaryKey).map((c) => c.name);

  useSetPageHeader(t('admin.database.title', { defaultValue: 'Database' }));

  const applyFilter = () => {
    setOffset(0);
    setAppliedFilter(
      filterCol && filterValue ? { col: filterCol, value: filterValue } : null,
    );
  };

  const clearFilter = () => {
    setFilterCol('');
    setFilterValue('');
    setAppliedFilter(null);
    setOffset(0);
  };

  const downloadCsv = useCallback(async () => {
    if (!selectedTable) return;
    const query: Record<string, string> = {};
    if (appliedFilter?.col && appliedFilter.value) {
      query[`filter.${appliedFilter.col}`] = appliedFilter.value;
    }
    const csv = await client.admin.db.exportCsv(selectedTable, query);
    downloadBlob(csv, `${selectedTable}.csv`);
  }, [appliedFilter, client.admin.db, selectedTable]);

  const downloadSqlCsv = useCallback(() => {
    if (!sqlResult?.columns.length) return;
    downloadBlob(
      rowsToCsv(sqlResult.columns, sqlResult.rows),
      'query-result.csv',
    );
  }, [sqlResult]);

  const saveEdit = async () => {
    if (!editing || !selectedTable) return;
    let patchValue: string | number | boolean | null | object = editing.value;
    if (editing.dataType.includes('json')) {
      patchValue = JSON.parse(editing.value) as object;
    }
    await updateRow(
      {
        primaryKey: editing.primaryKey as Record<
          string,
          string | number | boolean | null
        >,
        patch: { [editing.column]: patchValue as never },
      },
      { table: selectedTable },
    );
    setEditing(null);
    await rowsQuery.refetch();
  };

  const executeSql = async () => {
    setSqlError(null);
    try {
      const result = await runSql({
        statement: sqlText,
        limit: pageSizeToLimit(sqlPageSize),
      });
      setSqlResult(result);
    } catch (err) {
      setSqlResult(null);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
      setSqlError(message);
    }
  };

  const pageSizeSelect = (
    value: PageSizeOption,
    onChange: (next: PageSizeOption) => void,
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {t('admin.database.pageSize', { defaultValue: 'Rows' })}
      </span>
      <select
        className="rounded border px-2 py-1"
        value={value === 'all' ? 'all' : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === 'all') {
            onChange('all');
            return;
          }
          onChange(Number(raw) as 50 | 200 | 1000);
        }}
      >
        {PAGE_SIZE_OPTIONS.map((option) => (
          <option
            key={String(option)}
            value={option === 'all' ? 'all' : String(option)}
          >
            {option === 'all'
              ? t('admin.database.pageSizeAll', { defaultValue: 'All' })
              : String(option)}
          </option>
        ))}
      </select>
    </label>
  );

  const rows = rowsQuery.data?.rows ?? [];
  const total = rowsQuery.data?.total ?? 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-4">
      <div className="flex gap-2">
        <Button
          title={t('admin.database.browseTab', { defaultValue: 'Browse' })}
          variant={
            tab === 'browse'
              ? 'variant-filled-primary'
              : 'variant-ringed-primary'
          }
          action={() => setTab('browse')}
        >
          {t('admin.database.browseTab', { defaultValue: 'Browse' })}
        </Button>
        <Button
          title={t('admin.database.sqlTab', { defaultValue: 'SQL' })}
          variant={
            tab === 'sql' ? 'variant-filled-primary' : 'variant-ringed-primary'
          }
          action={() => setTab('sql')}
        >
          {t('admin.database.sqlTab', { defaultValue: 'SQL' })}
        </Button>
      </div>

      {tab === 'browse' ? (
        <div className="flex min-h-0 flex-1 gap-3">
          <aside className="w-56 shrink-0 overflow-y-auto rounded border p-2">
            <p className="mb-2 text-sm font-medium">
              {t('admin.database.tables', { defaultValue: 'Tables' })}
            </p>
            {tablesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {t('admin.database.loading', { defaultValue: 'Loading…' })}
              </p>
            ) : (
              <ul className="space-y-0.5 text-sm">
                {tables.map((table) => (
                  <li key={table.name}>
                    <button
                      type="button"
                      className={`hover:bg-muted w-full rounded px-2 py-1 text-left ${
                        selectedTable === table.name
                          ? 'bg-muted font-medium'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedTable(table.name);
                        setOffset(0);
                        setFilterCol('');
                        setFilterValue('');
                        setAppliedFilter(null);
                        setEditing(null);
                      }}
                    >
                      {table.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="flex min-w-0 flex-1 flex-col gap-2">
            {!selectedTable ? (
              <p className="text-muted-foreground text-sm">
                {t('admin.database.selectTable', {
                  defaultValue: 'Select a table to browse rows.',
                })}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span>
                      {t('admin.database.filterColumn', {
                        defaultValue: 'Filter column',
                      })}
                    </span>
                    <select
                      className="rounded border px-2 py-1"
                      value={filterCol}
                      onChange={(e) => setFilterCol(e.target.value)}
                    >
                      <option value="">
                        {t('admin.database.anyColumn', {
                          defaultValue: '—',
                        })}
                      </option>
                      {columns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span>
                      {t('admin.database.filterValue', {
                        defaultValue: 'Contains',
                      })}
                    </span>
                    <input
                      className="rounded border px-2 py-1"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyFilter();
                      }}
                    />
                  </label>
                  <Button
                    title={t('admin.database.applyFilter', {
                      defaultValue: 'Apply',
                    })}
                    variant="variant-filled-primary"
                    action={applyFilter}
                  >
                    {t('admin.database.applyFilter', { defaultValue: 'Apply' })}
                  </Button>
                  <Button
                    title={t('admin.database.clearFilter', {
                      defaultValue: 'Clear',
                    })}
                    variant="variant-ringed-primary"
                    action={clearFilter}
                  >
                    {t('admin.database.clearFilter', { defaultValue: 'Clear' })}
                  </Button>
                  <Button
                    title={t('admin.database.downloadCsv', {
                      defaultValue: 'Download CSV',
                    })}
                    variant="variant-ringed-primary"
                    action={() => {
                      void downloadCsv();
                    }}
                  >
                    {t('admin.database.downloadCsv', {
                      defaultValue: 'Download CSV',
                    })}
                  </Button>
                  {pageSizeSelect(browsePageSize, (next) => {
                    setBrowsePageSize(next);
                    setOffset(0);
                  })}
                </div>

                <div className="min-h-0 flex-1 overflow-auto rounded border">
                  {rowsQuery.isLoading ? (
                    <p className="p-3 text-sm">
                      {t('admin.database.loading', {
                        defaultValue: 'Loading…',
                      })}
                    </p>
                  ) : rowsQuery.isError ? (
                    <p className="p-3 text-sm text-red-600">
                      {t('admin.database.loadError', {
                        defaultValue: 'Failed to load rows.',
                      })}
                    </p>
                  ) : (
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          {columns.map((col) => (
                            <th
                              key={col.name}
                              className="whitespace-nowrap border-b px-2 py-1 font-medium"
                            >
                              {col.name}
                              <span className="text-muted-foreground ml-1 font-normal">
                                {col.dataType}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rowIndex) => {
                          const pk: Record<string, unknown> = {};
                          for (const name of pkNames) {
                            pk[name] = row[name];
                          }
                          return (
                            <tr key={rowIndex} className="hover:bg-muted/50">
                              {columns.map((col) => (
                                <td
                                  key={col.name}
                                  className="max-w-xs cursor-pointer truncate border-b px-2 py-1 align-top"
                                  title={formatCell(row[col.name])}
                                  onClick={() => {
                                    if (col.primaryKey) return;
                                    setEditing({
                                      primaryKey: pk,
                                      column: col.name,
                                      value: cellEditorValue(
                                        row[col.name],
                                        col.dataType,
                                      ),
                                      dataType: col.dataType,
                                    });
                                  }}
                                >
                                  {formatCell(row[col.name])}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>
                    {t('admin.database.showing', {
                      defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
                      from: total === 0 ? 0 : offset + 1,
                      to: Math.min(offset + limit, total),
                      total,
                    })}
                  </span>
                  {browsePageSize === 'all' ? null : (
                    <div className="flex gap-2">
                      <Button
                        title={t('admin.database.prev', {
                          defaultValue: 'Prev',
                        })}
                        variant="variant-ringed-primary"
                        action={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                      >
                        {t('admin.database.prev', { defaultValue: 'Prev' })}
                      </Button>
                      <Button
                        title={t('admin.database.next', {
                          defaultValue: 'Next',
                        })}
                        variant="variant-ringed-primary"
                        action={() => setOffset(offset + limit)}
                        disabled={offset + limit >= total}
                      >
                        {t('admin.database.next', { defaultValue: 'Next' })}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <textarea
            className="min-h-32 rounded border p-2 font-mono text-sm"
            value={sqlText}
            onChange={(e) => setSqlText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Button
              title={t('admin.database.runSql', { defaultValue: 'Run' })}
              variant="variant-filled-primary"
              action={() => {
                void executeSql();
              }}
            >
              {t('admin.database.runSql', { defaultValue: 'Run' })}
            </Button>
            <Button
              title={t('admin.database.downloadCsv', {
                defaultValue: 'Download CSV',
              })}
              variant="variant-ringed-primary"
              action={downloadSqlCsv}
              disabled={!sqlResult?.columns.length}
            >
              {t('admin.database.downloadCsv', {
                defaultValue: 'Download CSV',
              })}
            </Button>
            {pageSizeSelect(sqlPageSize, setSqlPageSize)}
          </div>
          {sqlError ? (
            <pre className="overflow-auto rounded border border-red-300 bg-red-50 p-2 text-xs text-red-800">
              {sqlError}
            </pre>
          ) : null}
          {sqlResult ? (
            <div className="flex min-h-0 flex-1 flex-col gap-1">
              <p className="text-sm">
                {sqlResult.rows.length < sqlResult.rowCount
                  ? t('admin.database.sqlMetaTruncated', {
                      defaultValue:
                        '{{command}} — showing {{shown}} of {{count}} row(s)',
                      command: sqlResult.command,
                      shown: sqlResult.rows.length,
                      count: sqlResult.rowCount,
                    })
                  : t('admin.database.sqlMeta', {
                      defaultValue: '{{command}} — {{count}} row(s)',
                      command: sqlResult.command,
                      count: sqlResult.rowCount,
                    })}
              </p>
              <div className="min-h-0 flex-1 overflow-auto rounded border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {sqlResult.columns.map((col) => (
                        <th
                          key={col}
                          className="whitespace-nowrap border-b px-2 py-1 font-medium"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sqlResult.rows.map((row, i) => (
                      <tr key={i}>
                        {sqlResult.columns.map((col) => (
                          <td
                            key={col}
                            className="max-w-xs truncate border-b px-2 py-1"
                            title={formatCell(row[col])}
                          >
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background w-full max-w-lg space-y-3 rounded-lg p-4 shadow-lg">
            <h2 className="text-lg font-medium">
              {t('admin.database.editTitle', {
                defaultValue: 'Edit {{column}}',
                column: editing.column,
              })}
            </h2>
            <textarea
              className="min-h-40 w-full rounded border p-2 font-mono text-sm"
              value={editing.value}
              onChange={(e) =>
                setEditing({ ...editing, value: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                title={t('admin.database.cancel', { defaultValue: 'Cancel' })}
                variant="variant-ringed-primary"
                action={() => setEditing(null)}
              >
                {t('admin.database.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                title={t('admin.database.save', { defaultValue: 'Save' })}
                variant="variant-filled-primary"
                action={() => {
                  void saveEdit();
                }}
              >
                {t('admin.database.save', { defaultValue: 'Save' })}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
