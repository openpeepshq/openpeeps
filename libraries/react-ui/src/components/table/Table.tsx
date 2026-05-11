import * as React from 'react';
import type { ColumnDefinition } from '@/types';
import { deepGet } from '@/lib/utils';

export interface TableProps<D> {
  data?: D[];
  columnDefinitions: ColumnDefinition<D>[];
  filter?: (row: D) => boolean;
  sort?: { id: string; direction: 'asc' | 'desc' }[];
  className?: string;
}

export function Table<D>({
  data = [],
  columnDefinitions,
  filter = () => true,
  className,
}: TableProps<D>) {
  return (
    <table className={`mt-2 w-full ${className ?? ''}`}>
      <thead>
        <tr className="border-b-2 border-t-2">
          {columnDefinitions.map((column) => (
            <th key={String(column.id)} className="py-4 pl-4 text-left">
              {typeof column.header === 'string'
                ? column.header
                : React.createElement(column.header)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.filter(filter).map((row, idx) => (
          <tr key={idx} className="border-b-2 border-t-2">
            {columnDefinitions.map((column) => {
              const key = String(column.id);
              if (column.type === 'property') {
                return (
                  <td key={key} className="px-2 py-4">
                    {String((row as Record<string, unknown>)[column.id as string] ?? '')}
                  </td>
                );
              }
              if (column.type === 'path') {
                return (
                  <td key={key} className="px-2 py-4">
                    {String(deepGet(row, column.path) ?? '')}
                  </td>
                );
              }
              if (column.type === 'text') {
                return (
                  <td key={key} className="px-2 py-4">
                    {column.render(row)}
                  </td>
                );
              }
              const { component: Component, props } = column.render(row);
              return (
                <td key={key} className="px-2 py-4">
                  <Component {...props} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
