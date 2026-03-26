<script lang="ts" generics="D">
	import type { ColumnDefinition } from '$lib/types';
	import { deepGet } from '$lib/utils';

	interface Props {
		data?: D[];
		columnDefinitions: ColumnDefinition<D>[];
		filter?: (row: D) => boolean;
		sort?: { id: string; direction: 'asc' | 'desc' }[];
	}

	let { data = [], columnDefinitions, filter = () => true }: Props = $props();
</script>

<table class="mt-2 w-full">
	<thead>
		<tr class="border-b-2 border-t-2">
			{#each columnDefinitions as column}
				<th class="py-4 pl-4 text-left">
					{column.header}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each data.filter(filter) as row, index (index)}
			<tr class="border-b-2 border-t-2">
				{#each columnDefinitions as column}
					<td class="px-2 py-4">
						{#if column.type === 'property'}
							{row[column.id]}
						{:else if column.type === 'path'}
							{deepGet(row, column.path)}
						{:else if column.type === 'text'}
							{column.render(row)}
						{:else if column.type === 'component'}
							{@const { component: Component, props } = column.render(row)}
							<Component {...props} />
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
