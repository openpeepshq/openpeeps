<script lang="ts">
	import { getModalManager, ModalHeader } from '@openpeeps/ui';
	import PostAudienceSelector from './PostAudienceSelector.svelte';
	import { profileName } from '@openpeeps/common/lib';
	import { Avatar } from '$lib/components/core/profile';
	import type { AudienceSetting, PostCreationData } from '@openpeeps/common/types';
	import { me } from '$lib/api';
	import { ChevronDown } from 'lucide-svelte';
	import { GroupCardFromId } from '$lib/components';
	import { buildAudienceChoices } from './constants';

	const modalManager = getModalManager();
	interface Props {
		postData: PostCreationData;
		setAudience: (audienceSetting?: AudienceSetting) => void;
	}
	let { postData, setAudience }: Props = $props();

	const audienceChoices = buildAudienceChoices(postData.type, $me);
</script>

<ModalHeader isCustomTitle={true}>
	<button
		title="Change audience"
		onclick={() => {
			modalManager.show(
				PostAudienceSelector,
				{
					visibility: postData.visibility,
					groupId: postData.groupId ?? undefined,
					type: postData.type
				},
				setAudience
			);
		}}
		class="flex items-center gap-3 border-none outline-none"
	>
		<span>
			<Avatar profile={$me} size={3} borderless />
		</span>
		<span class=" flex flex-col">
			<span class="flex items-center gap-1 text-base font-medium capitalize">
				{profileName($me)}
				<ChevronDown size={18} class="text-secondary-600" />
			</span>

			{#if postData.visibility === 'group'}
				<span class="flex items-center gap-1 text-sm font-normal">
					<span>In&nbsp;group</span>
					<GroupCardFromId
						groupId={postData.groupId ?? undefined}
						showAction={false}
						avatarSize={1.5}
						noPadding
					/>
				</span>
			{:else}
				<p class="text-sm font-light">
					{audienceChoices.find((c) => c.value === postData.visibility)?.description ?? ''}
				</p>
			{/if}
		</span>
	</button>
</ModalHeader>
