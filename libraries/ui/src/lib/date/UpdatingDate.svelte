<script lang="ts">
	import { onMount } from 'svelte';
	import { dateFormatter } from './formatter';

	interface Props {
		date: string | Date | number;
		formatter?: (date: string | Date) => string;
	}

	let { date, formatter = dateFormatter }: Props = $props();

	let formattedDate = $state(formatter(date as string));

	onMount(() => {
		setInterval(() => {
			formattedDate = formatter(date as string);
		}, 60000);
	});
</script>

{formattedDate}
