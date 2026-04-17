<script lang="ts">
	import { Avatar } from '../../profile';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { UserRoundCheck } from 'lucide-svelte';
	import { Button } from '@openpeeps/ui';
	import { admitMutation } from '$lib/api';
	import { getJamContext } from '$lib/components/core/jams/context';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();

	const { jamPost } = getJamContext();

	const admit = admitMutation({ id: jamPost.id, profileId: profile.id });
</script>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-x-1">
		<Avatar {profile} size={3} />
		{#if profile}<p>{profile.displayName || `@${profile.handle}`}</p>{/if}
	</div>
	<Button title={t('jams.waitingRoom.admitParticipant')} variant="variant-ringed-surface" action={admit}>
		<UserRoundCheck />
	</Button>
</div>
