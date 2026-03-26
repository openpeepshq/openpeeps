<script lang="ts">
	import type { PostDataUnion, Question } from '@openpeeps/common/types';
	import { MinusSquare, PlusSquare } from 'lucide-svelte';
	import { Button, FormInput, getFormContext } from '@openpeeps/ui';

	const { data, validate } = getFormContext<PostDataUnion>();

	let pollData = $derived(data as Question);
</script>

{#each pollData.options as option, i (i)}
	<FormInput title="Option {i + 1}" path={['options', i, 'content']} />
{/each}
{#if pollData.options.length > 2}
	<Button
		title="Remove Option"
		variant="variant-ringed-surface"
		action={() => {
			pollData.options = [...pollData.options.slice(0, -1)];
			validate();
		}}
	>
		<MinusSquare class="mr-1 size-4" />
		Remove
	</Button>
{/if}
<Button
	title="Add Option"
	variant="variant-ringed-surface"
	disabled={pollData.options.length >= 7}
	action={() => {
		// less than 7 options
		if (pollData.options.length >= 7) {
			return;
		}
		pollData.options.push({
			content: '',
			type: 'note'
		});
		validate();
	}}
>
	<PlusSquare class="mr-1 size-4" />
	Add Option
</Button>
