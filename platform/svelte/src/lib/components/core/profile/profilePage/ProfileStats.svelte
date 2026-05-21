<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();
</script>

<div class="mt-2 flex items-center gap-x-4">
	<a href="/@{profile.handle}/followers" class="anchor cursor-pointer text-sm">
		<span class="font-semibold">
			{profile.profileStats?.followersCount ?? 0}
		</span>
		{t('profile.followers.title')}
	</a>
	<a href="/@{profile?.handle}/following" class="anchor cursor-pointer text-sm">
		<span class="font-semibold">
			{profile.profileStats?.followingCount ?? 0}
		</span>
		{t('profile.following.title')}
	</a>
</div>
