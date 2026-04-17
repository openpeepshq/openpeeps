<script lang="ts">
	import type { PostDataUnion, Question } from '@openpeeps/common/types';
	import { MinusSquare, PlusSquare } from 'lucide-svelte';
	import { Button, FormInput, getFormContext } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const { data, validate } = getFormContext<PostDataUnion>();

	let pollData = $derived(data as Question);
</script>

{#each pollData.options as option, i (i)}
	<FormInput title={t('posts.form.poll.option', { number: i + 1 })} path={['options', i, 'content']} />
{/each}
{#if pollData.options.length > 2}
	<Button
		title={t('posts.form.poll.removeOption')}
		variant="variant-ringed-surface"
		action={() => {
			pollData.options = [...pollData.options.slice(0, -1)];
			validate();
		}}
	>
		<MinusSquare class="mr-1 size-4" />
		{t('common.remove')}
	</Button>
{/if}
<Button
	title={t('posts.form.poll.addOption')}
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
	{t('posts.form.poll.addOption')}
</Button>
