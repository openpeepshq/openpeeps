<script lang="ts">
	import { Avatar } from '../../profile';
	import type { PublicProfile } from '@openpeeps/common/types';
	interface Props {
		displayedPostProfile: PublicProfile;
	}

	let { displayedPostProfile }: Props = $props();
</script>

<div class="flex justify-between px-5 py-5">
	<div class="flex w-fit space-x-2">
		<a href={`/@${displayedPostProfile?.handle}`}>
			<Avatar profile={displayedPostProfile} size={4} />
		</a>
	</div>
</div>
