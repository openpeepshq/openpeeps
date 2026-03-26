<script lang="ts">
	import type { PostDataUnion } from '@openpeeps/common/types';
	import AttachmentContainer from './AttachmentContainer.svelte';
	import { i18nContext } from '$lib/components/i18n';
	interface Props {
		postData: PostDataUnion;
	}

	let { postData = $bindable() }: Props = $props();
	const { t } = i18nContext();

	const handleDeleteAttachment = (index: number) => {
		postData.attachments = postData.attachments?.filter((_, i) => i !== index);
	};
</script>

<div class="grid grid-cols-2 gap-x-2 p-2">
	{#each postData.attachments || [] as attachment, i (i)}
		<AttachmentContainer {attachment} handleDeleteAttachment={() => handleDeleteAttachment(i)} />
	{/each}
</div>
{#if postData.attachments?.length}
	<p class="px-2 font-light">
		{t('common.media.altTextDescription')}
	</p>
{/if}
