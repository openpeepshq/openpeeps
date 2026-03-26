<script lang="ts">
	import { Button } from '@openpeeps/ui';

	interface Props {
		title: string;
		name: string;
		onChange: (event: Event) => Promise<void>;
	}

	let { title, name, onChange }: Props = $props();

	let inputRef = $state<HTMLInputElement>();
</script>

<Button {title} variant="variant-ringed-primary" action={() => inputRef?.click()}>
	{title}
</Button>
<input
	type="file"
	{name}
	accept="image/*"
	class="hidden border-2 border-dashed border-primary-500"
	onchange={onChange}
	bind:this={inputRef}
/>
