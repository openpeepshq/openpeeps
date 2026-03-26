import { Icon } from 'lucide-svelte';
import type { Component, ComponentProps } from 'svelte';

export type IconType = typeof Icon;

export type ThemeColor =
	| 'primary'
	| 'secondary'
	| 'tertiary'
	| 'success'
	| 'warning'
	| 'error'
	| 'surface';

export type Variant =
	| 'variant-filled-primary'
	| 'variant-filled-secondary'
	| 'variant-filled-tertiary'
	| 'variant-filled-success'
	| 'variant-filled-warning'
	| 'variant-filled-error'
	| 'variant-filled-surface'
	| 'variant-soft-primary'
	| 'variant-soft-secondary'
	| 'variant-soft-tertiary'
	| 'variant-soft-success'
	| 'variant-soft-warning'
	| 'variant-soft-error'
	| 'variant-soft-surface'
	| 'variant-ghost-primary'
	| 'variant-ghost-secondary'
	| 'variant-ghost-tertiary'
	| 'variant-ghost-success'
	| 'variant-ghost-warning'
	| 'variant-ghost-error'
	| 'variant-ghost-surface'
	| 'variant-ringed-primary'
	| 'variant-ringed-secondary'
	| 'variant-ringed-tertiary'
	| 'variant-ringed-success'
	| 'variant-ringed-warning'
	| 'variant-ringed-error'
	| 'variant-ringed-surface';

interface ColumnDefinitionBase {
	id: string | number | symbol;
	header: string | Component;
}

export interface PropertyColumnDefinition<RowType> extends ColumnDefinitionBase {
	id: keyof RowType;
	type: 'property';
}

export interface PathColumnDefinition<RowType> extends ColumnDefinitionBase {
	type: 'path';
	path: [keyof RowType, ...(string | number)[]];
}

export interface TextColumnDefinition<RowType> extends ColumnDefinitionBase {
	type: 'text';
	render: (row: RowType) => string;
}

export type ComponentRenderFunction<RowType, ComponentType extends Component> = (row: RowType) => {
	component: ComponentType;
	props: ComponentProps<ComponentType>;
};

export interface ComponentColumnDefinition<RowType> extends ColumnDefinitionBase {
	type: 'component';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	render: (row: RowType) => { component: Component<any>; props: Record<string, unknown> };
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

