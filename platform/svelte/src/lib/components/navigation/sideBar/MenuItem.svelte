<script lang="ts">
	import { getDrawerStore } from '@skeletonlabs/skeleton';
	import type { IconType } from '@openpeeps/ui';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	const drawerStore = getDrawerStore();

	interface Props {
		name: string;
		path: string;
		icon: IconType;
		open?: boolean | undefined;
		children?: Snippet;
	}

	let { name, path, icon: Icon, open = undefined, children }: Props = $props();

	let active: boolean = $derived(page.url.pathname.startsWith(path));
</script>

<span class="block pl-4">
	<a
		href={path}
		onclick={(e) => {
			drawerStore.close();
			if (path === page.url.pathname) {
				e.preventDefault();
			}
		}}
		class="flex items-center gap-x-2 py-2 pl-2 hover:bg-surface-100"
		class:text-base-200={!active}
		class:text-primary-500={active}
		class:font-bold={active}
	>
		<span class:opacity-60={!active}>
			<Icon class="mr-1 h-5 w-5" strokeWidth={active ? 3 : 2} />
		</span>
		<span class:opacity-60={!active}>{name}</span>
	</a>
	{#if open}
		{@render children?.()}
	{/if}
</span>
