<script lang="ts">
	import { goto } from '$app/navigation';
	import type { IconType } from '@openpeeps/ui';

	interface Props {
		action: string | (() => unknown);
		icon: IconType;
		title?: string;
	}

	let { action, icon, title = '' }: Props = $props();

	let active: boolean = $derived(typeof action === 'string' && location.pathname === action);
</script>

<button
	{title}
	onclick={() => {
		if (typeof action === 'function') {
			action();
		} else {
			goto(action);
		}
	}}
>
	<span
		class="flex items-center gap-x-2"
		class:text-base-200={!active}
		class:text-primary-500={active}
		class:font-bold={active}
	>
		<svelte:component this={icon} class="mr-1 h-5 w-5" strokeWidth={active ? 3 : 2} />
	</span>
</button>
