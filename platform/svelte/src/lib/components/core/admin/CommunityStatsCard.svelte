<script lang="ts">
	import { Dot } from 'lucide-svelte';

	interface Props {
		title: string;
		previous: number;
		current: number;
		text: string;
	}
	const { title, previous, current, text }: Props = $props();
	const change = current - previous;
</script>

<div class="card h-36 w-full">
	<div class="flex h-full flex-col items-center justify-center">
		<h3 class="text-sm">{title}</h3>
		<div class="my-2 flex items-center gap-1">
			<h1 class="text-4xl font-semibold">
				{current}
			</h1>
			{#if change < 0}
				<span class="text-error-500 flex items-center text-sm">
					▼ {Math.abs(change)}
				</span>
			{:else if change > 0}
				<span class="text-success-500 flex items-center text-sm">
					▲ {change}
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<p class="text-sm">{text}</p>
			<Dot />
			<p class="text-sm">
				{previous}
			</p>
		</div>
	</div>
</div>
