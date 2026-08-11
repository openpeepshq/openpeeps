import type { LucideIcon } from 'lucide-react';
import type {
  ComponentProps,
  ComponentType as RComponentType,
  ReactNode,
} from 'react';

export type IconType =
  | LucideIcon
  | RComponentType<{ size?: number; className?: string }>;

interface ColumnDefinitionBase {
  id: string | number | symbol;
  header: string | ReactNode | RComponentType;
}

export interface PropertyColumnDefinition<RowType>
  extends ColumnDefinitionBase {
  id: keyof RowType;
  type: 'property';
}

export interface PathColumnDefinition<RowType> extends ColumnDefinitionBase {
  type: 'path';
  path: [keyof RowType, ...(string | number)[]];
}

export interface TextColumnDefinition<RowType> extends ColumnDefinitionBase {
  type: 'text';
  render: (row: RowType) => ReactNode;
}

export interface ComponentColumnDefinition<RowType>
  extends ColumnDefinitionBase {
  type: 'component';
  render: (row: RowType) => {
    component: RComponentType<Record<string, unknown>>;
    props: Record<string, unknown>;
  };
}

export type ColumnDefinition<RowType> =
  | PathColumnDefinition<RowType>
  | PropertyColumnDefinition<RowType>
  | TextColumnDefinition<RowType>
  | ComponentColumnDefinition<RowType>;

export interface TableState<RowType> {
  filter: (row: RowType) => boolean;
  sort: { id: string; direction: 'asc' | 'desc' }[];
}

export interface PartialQueryObserverResult<T> {
  isPending: boolean;
  isSuccess: boolean;
  data: T;
}

export type ButtonAction = string | (() => unknown | Promise<unknown>);

// Re-exported helper for ComponentProps convenience
export type { ComponentProps };
