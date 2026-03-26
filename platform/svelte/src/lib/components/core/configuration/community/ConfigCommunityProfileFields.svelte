<script lang="ts">
	import { updateConfigMutation } from '@openpeeps/svelte/api';
	import { Form, FormInput, Button } from '@openpeeps/ui';
	import { communityConfigSchema, type CommunityConfig } from '@openpeeps/common';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils';
	import { MinusSquare, PlusSquare } from 'lucide-svelte';

	const toastStore = getToastStore();

	const updateConfig = updateConfigMutation({
		namespace: 'allpeep',
		name: 'community'
	});

	interface Props {
		communityConfig: CommunityConfig;
	}

	const { communityConfig }: Props = $props();

	const updatedConfig = $state(structuredClone(communityConfig));

	const action = () =>
		updateConfig({
			config: { profiles: { additionalFields: updatedConfig.profiles?.additionalFields } }
		}).then(() =>
			toastStore.trigger(
				toast({
					message: 'Community settings updated',
					background: 'variant-filled-success'
				})
			)
		);
</script>

<div class="flex flex-col gap-4 p-4">
	<Form data={updatedConfig} schema={communityConfigSchema}>
		{#each updatedConfig.profiles?.additionalFields || [] as field, index (index)}
			<h4 class="h4">{index + 1}</h4>
			<FormInput title="Label" path={['profiles', 'additionalFields', index, 'label']} />
			<FormInput title="Key" path={['profiles', 'additionalFields', index, 'key']} />
		{/each}
		{#if updatedConfig.profiles?.additionalFields?.length}
			<Button
				title="Remove Option"
				variant="variant-ringed-surface"
				action={() =>
					(updatedConfig.profiles!.additionalFields = [
						...updatedConfig.profiles!.additionalFields!.slice(0, -1)
					])}
			>
				<MinusSquare class="mr-1 size-4" />
				Remove
			</Button>
		{/if}
		<Button
			title="Add Option"
			variant="variant-ringed-surface"
			action={() => {
				if (!updatedConfig.profiles) {
					updatedConfig.profiles = {};
				}
				if (!updatedConfig.profiles.additionalFields) {
					updatedConfig.profiles.additionalFields = [];
				}
				updatedConfig.profiles!.additionalFields!.push({
					key: '',
					label: ''
				});
			}}
		>
			<PlusSquare class="mr-1 size-4" />
			Add Option
		</Button>
	</Form>
	<Button variant="variant-ghost-primary" {action}>Save</Button>
</div>
