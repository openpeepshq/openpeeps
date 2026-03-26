<script lang="ts">
	import { profileStore } from '$lib/api';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { Avatar } from '../../profile';

	interface Props {
		profileId: string;
	}

	let { profileId }: Props = $props();

	const profileQuery = profileStore(profileId);
	let profile: PublicProfile | undefined = $derived($profileQuery.data);
</script>

<Avatar {profile} size={2} />
