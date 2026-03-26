<script lang="ts">
	import { followersStore } from '$lib/api';
	import { UserX } from 'lucide-svelte';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { AccessDeniedLoader, ProfileWithActionCard } from '$lib/components';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
	}

	const { profile }: Props = $props();

	const followerQuery = followersStore(profile.id);
</script>

<div class="relative">
	<AccessDeniedLoader queries={[$followerQuery]}>
		{#if $followerQuery.data?.length}
			<div class="flex flex-col">
				{#each $followerQuery.data as follower}
					<ProfileWithActionCard profile={follower} />
				{/each}
			</div>
		{:else}
			<div class="relative flex flex-col items-center pt-20">
				<UserX size={50} />
				<p class="mt-2">{t('profile.followers.noFollowing')}</p>
			</div>
		{/if}
	</AccessDeniedLoader>
</div>
