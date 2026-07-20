import type { ExplorerUpdateRowResponse } from '@openpeeps/common/types';
import { pgPool } from '../pg/client';
import {
  assertKnownColumns,
  describeExplorerTable,
  getExplorerTable,
  primaryKeyColumns,
  quoteIdent,
} from './tables';

const coercePatchValue = (dataType: string, value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (dataType.includes('json')) {
    if (typeof value === 'string') {
      return JSON.parse(value) as unknown;
    }
    return value;
  }
  if (dataType.includes('bool') && typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  if (
    (dataType.includes('int') || dataType.includes('numeric')) &&
    typeof value === 'string' &&
    value !== '' &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }
  return value;
};

export const updateExplorerRow = async (input: {
  table: string;
  primaryKey: Record<string, unknown>;
  patch: Record<string, unknown>;
}): Promise<ExplorerUpdateRowResponse> => {
  const { table: tableName, primaryKey, patch } = input;
  getExplorerTable(tableName);
  const meta = describeExplorerTable(getExplorerTable(tableName));
  const colByName = new Map(meta.columns.map((c) => [c.name, c]));

  const pkCols = primaryKeyColumns(tableName);
  const pkNames = pkCols.map((c) => c.name);
  for (const name of pkNames) {
    if (!(name in primaryKey)) {
      throw new Error(`Missing primary key field: ${name}`);
    }
  }
  assertKnownColumns(tableName, Object.keys(primaryKey));

  const patchKeys = Object.keys(patch);
  if (!patchKeys.length) {
    throw new Error('patch must include at least one column');
  }
  assertKnownColumns(tableName, patchKeys);
  for (const key of patchKeys) {
    if (pkNames.includes(key)) {
      throw new Error(`Cannot patch primary key column: ${key}`);
    }
  }

  const params: unknown[] = [];
  const setClauses = patchKeys.map((key) => {
    const col = colByName.get(key)!;
    params.push(coercePatchValue(col.dataType, patch[key]));
    return `${quoteIdent(key)} = $${params.length}`;
  });

  const whereClauses = pkNames.map((key) => {
    params.push(primaryKey[key]);
    return `${quoteIdent(key)} = $${params.length}`;
  });

  const result = await pgPool().query(
    `UPDATE ${quoteIdent(tableName)} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`,
    params,
  );

  if (!result.rows[0]) {
    throw new Error(`No row updated in ${tableName}`);
  }

  return {
    row: result.rows[0] as ExplorerUpdateRowResponse['row'],
  };
};
