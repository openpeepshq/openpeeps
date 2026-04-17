<script lang="ts">
	import { SlideToggle, getModalStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const modalStore = getModalStore();

	const preferences = $state([
		{
			titleKey: 'posts.chronologicalFeed.recentRepliesTitle' as const,
			descriptionKey: 'posts.chronologicalFeed.recentRepliesDescription' as const,
			checked: false
		},
		{
			titleKey: 'posts.chronologicalFeed.byActivityTitle' as const,
			descriptionKey: 'posts.chronologicalFeed.byActivityDescription' as const,
			checked: false
		},
		{
			titleKey: 'posts.chronologicalFeed.prioritizeFollowingTitle' as const,
			descriptionKey: 'posts.chronologicalFeed.prioritizeFollowingDescription' as const,
			checked: false
		},
		{
			titleKey: 'posts.chronologicalFeed.showRepostsTitle' as const,
			descriptionKey: 'posts.chronologicalFeed.showRepostsDescription' as const,
			checked: false
		}
	]);

	const handlePreferences = () => {
		preferences.forEach((preference) => {
			console.log(preference.titleKey, preference.checked);
		});
		modalStore.close();
	};
</script>

{#if $modalStore[0]}
	<ModalWrapper>
		<ModalHeader title={t('posts.chronologicalFeed.modalTitle')} />
		<!-- body -->
		<article class="flex flex-col px-4">
			<p class="text-sm font-light">{t('posts.chronologicalFeed.subtitle')}</p>
			<div class="mt-7">
				{#each preferences as preference}
					<div class="bg-surface-100 mb-3 flex items-center justify-between rounded-md p-3">
						<div>
							<p class="text-lg font-medium">{t(preference.titleKey)}</p>
							<p class="pr-10 text-base font-light">
								{t(preference.descriptionKey)}
							</p>
						</div>
						<SlideToggle
							name="slide"
							bind:checked={preference.checked}
							background="bg-surface-300"
							active="bg-primary-500"
						/>
					</div>
				{/each}
			</div>
		</article>
		<ModalFooter>
			<div class="flex gap-x-2">
				<Button title={t('posts.chronologicalFeed.done')} variant="variant-filled-primary" action={handlePreferences}
					>{t('posts.chronologicalFeed.done')}</Button
				>
			</div>
		</ModalFooter>
	</ModalWrapper>
{/if}
