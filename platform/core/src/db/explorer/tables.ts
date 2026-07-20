import {
  getTableColumns,
  getTableName,
  isTable,
  type Table,
} from 'drizzle-orm';
import type { ExplorerColumn, ExplorerTable } from '@openpeeps/common/types';
import { schema } from '../pg/schema';

const tableBySqlName = (): Map<string, Table> => {
  const map = new Map<string, Table>();
  for (const value of Object.values(schema)) {
    if (!isTable(value)) continue;
    map.set(getTableName(value), value);
  }
  return map;
};

let cachedTables: Map<string, Table> | undefined;

export const getExplorerTableMap = (): Map<string, Table> => {
  if (!cachedTables) {
    cachedTables = tableBySqlName();
  }
  return cachedTables;
};

export const getExplorerTable = (tableName: string): Table => {
  const table = getExplorerTableMap().get(tableName);
  if (!table) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  return table;
};

export const describeExplorerTable = (table: Table): ExplorerTable => {
  const columns = getTableColumns(table);
  return {
    name: getTableName(table),
    columns: Object.values(columns).map(
      (col): ExplorerColumn => ({
        name: col.name,
        dataType: col.getSQLType(),
        primaryKey: col.primary,
        notNull: col.notNull,
      }),
    ),
  };
};

export const listExplorerTables = (): ExplorerTable[] =>
  [...getExplorerTableMap().values()]
    .map(describeExplorerTable)
    .sort((a, b) => a.name.localeCompare(b.name));

export const quoteIdent = (ident: string): string => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ident)) {
    throw new Error(`Invalid identifier: ${ident}`);
  }
  return `"${ident}"`;
};

export const assertKnownColumns = (
  tableName: string,
  columnNames: string[],
): ExplorerColumn[] => {
  const meta = describeExplorerTable(getExplorerTable(tableName));
  const byName = new Map(meta.columns.map((c) => [c.name, c]));
  return columnNames.map((name) => {
    const col = byName.get(name);
    if (!col) {
      throw new Error(`Unknown column ${name} on table ${tableName}`);
    }
    return col;
  });
};

export const primaryKeyColumns = (tableName: string): ExplorerColumn[] => {
  const meta = describeExplorerTable(getExplorerTable(tableName));
  const pks = meta.columns.filter((c) => c.primaryKey);
  if (!pks.length) {
    throw new Error(`Table ${tableName} has no primary key`);
  }
  return pks;
};
