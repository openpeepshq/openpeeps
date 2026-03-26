<script module lang="ts">
	import { popup, storePopup } from '@skeletonlabs/skeleton';
	import {
		arrow,
		autoUpdate,
		computePosition,
		flip,
		offset,
		type Placement,
		shift
	} from '@floating-ui/dom';

	storePopup.set({
		computePosition,
		autoUpdate,
		flip,
		shift,
		offset,
		arrow
	});
</script>

<script lang="ts">
	import { type IconType, preventDefault, stopPropagation, type Variant } from '$lib';
	import { MoreHorizontal } from 'lucide-svelte';
	import { uuidv4 } from 'uuidv7';
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: Variant;
		class?: string;
		menuId?: string;
		icon?: IconType;
		iconSize?: number;
		placement?: Placement;
		compact?: boolean;
		menuButton?: Snippet;
		children?: Snippet;
		title?: string;
		text?: string;
		width?: string;
	}

	let {
		variant,
		class: additionalClasses = '',
		menuId = uuidv4(),
		icon = MoreHorizontal,
		iconSize = 16,
		placement = 'bottom',
		compact = false,
		menuButton,
		children,
		title = 'Open menu',
		width,
		text
	}: Props = $props();

	const Icon = icon;
</script>

<button
	{title}
	use:popup={{
		event: 'click',
		target: menuId,
		placement
	}}
	onclick={stopPropagation(preventDefault(() => undefined))}
	class="btn flex items-center justify-center gap-1 rounded-full {variant ??
		''} {additionalClasses}"
>
	{#if menuButton}
		{@render menuButton()}
	{:else}
		<Icon size={iconSize} />
	{/if}
	{#if text}
		<span class="text-sm">{text}</span>
	{/if}
</button>
<div class="z-50" data-popup={menuId}>
	<div class="card p-2 {compact ? 'w-16' : width || 'w-52'} flex flex-col items-start text-left">
		{@render children?.()}
	</div>
</div>
