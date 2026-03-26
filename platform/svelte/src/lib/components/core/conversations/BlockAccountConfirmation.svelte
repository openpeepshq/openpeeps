<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const modalStore = getModalStore();
</script>

{#if $modalStore[0]}
	<ModalWrapper>
		<ModalHeader
			title={t('conversations.blockAccount.title', { handle: $modalStore[0].meta.handle })}
		/>
		<!-- body -->
		<article class="mt-4 flex flex-col px-4">
			<div class="  mb-3 rounded-md p-3">
				<p class="text-lg font-medium">
					{t('conversations.blockAccount.description', { handle: $modalStore[0].meta.handle })}
				</p>
			</div>
		</article>
		<ModalFooter>
			<div class="flex gap-x-2">
				<Button title={t('conversations.blockAccount.block')} variant="variant-filled-error"
					>{t('conversations.blockAccount.block')}</Button
				>
				<Button
					title={t('common.cancel')}
					variant="variant-ringed-surface"
					action={() => modalStore.close()}>{t('common.cancel')}</Button
				>
			</div>
		</ModalFooter>
	</ModalWrapper>
{/if}
