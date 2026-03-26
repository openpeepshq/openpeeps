<script lang="ts">
	import { SlideToggle, getModalStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';

	const modalStore = getModalStore();

	const preferences = $state([
		{
			title: 'Recent replies',
			description: 'Order content by most recent replies',
			checked: false
		},
		{
			title: 'By activity',
			description: 'Posts with more activity stay at the top and will be seen more often',
			checked: false
		},
		{
			title: 'Prioritize people I follow',
			description: 'Show un-viewed posts from people I follow before posts from strangers',
			checked: false
		},
		{
			title: 'Show reposts',
			description: 'All reposts will be shown in your feed',
			checked: false
		}
	]);

	const handlePreferences = () => {
		preferences.forEach((preference) => {
			console.log(preference.title, preference.checked);
		});
		modalStore.close();
	};
</script>

{#if $modalStore[0]}
	<ModalWrapper>
		<ModalHeader title={'Community feed Preferences'} />
		<!-- body -->
		<article class="flex flex-col px-4">
			<p class="text-sm font-light">Manage the content you see on your Community feed</p>
			<div class="mt-7">
				{#each preferences as preference}
					<div class="bg-surface-100 mb-3 flex items-center justify-between rounded-md p-3">
						<div>
							<p class="text-lg font-medium">{preference.title}</p>
							<p class="pr-10 text-base font-light">
								{preference.description}
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
				<Button title="Cancel" variant="variant-filled-primary" action={handlePreferences}
					>Done</Button
				>
			</div>
		</ModalFooter>
	</ModalWrapper>
{/if}
