<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import { truncateText } from '@openpeeps/common/lib';

	interface Props {
		profile: PublicProfile | undefined;
		size?: string;
	}

	let { profile, size = 'sm' }: Props = $props();
</script>

{#if profile}
	<a href={`/@${profile.handle}`}>
		<p class="text-{size} font-semibold capitalize hover:underline">
			{truncateText(profile.displayName || profile.handle, 30)}
		</p>
	</a>
	<a href={`/@${profile.handle}`}>
		<p class="text-{size} font-light hover:underline">
			@{truncateText(profile.handle, 30)}
		</p>
	</a>
{/if}
