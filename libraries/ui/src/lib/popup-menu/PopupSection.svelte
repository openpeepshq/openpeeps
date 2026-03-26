<script lang="ts">
	interface Props {
		title: string;
	}

	const { title }: Props = $props();
</script>

<div class="w-full p-2 font-semibold">{title}</div>
