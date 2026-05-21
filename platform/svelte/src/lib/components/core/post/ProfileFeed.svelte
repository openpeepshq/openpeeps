<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import { infiniteProfileFeedStore } from '$lib/api';
	import { Feed } from '$lib/components/core/post';

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();

let profileFeedQuery = $derived(infiniteProfileFeedStore(profile.id, { limit: 10 }));
</script>

<Feed query={profileFeedQuery} />
