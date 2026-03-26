<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import { Avatar } from '.';

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();
</script>

<div class="flex items-center gap-2 text-sm">
	<Avatar {profile} size={1.5} borderless />
	{profile.displayName || profile.handle}
</div>
