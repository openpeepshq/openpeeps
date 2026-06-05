<script lang="ts">
	import { Avatar } from '$lib/components/core/profile';
	import { truncateText } from '@openpeeps/common/lib';
	import type { PublicProfile } from '@openpeeps/common/types';
	import OpenpeepsMarkdown from '$lib/components/core/markdown/OpenpeepsMarkdown.svelte';
	import ProfileAction from './ProfilePageAction.svelte';
	import ProfileStats from './ProfileStats.svelte';
	import { i18nContext } from '$lib/components/i18n';
	import { MapPin } from 'lucide-svelte';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
		isCurrentProfile?: boolean;
	}

	let { profile, isCurrentProfile = false }: Props = $props();
</script>

<div class="relative">
	<div class="mb-8">
		<div class="relative aspect-[3/1] w-full">
			<div class="absolute inset-0 overflow-hidden bg-surface-200">
				{#if profile?.header}
					<img
						src={profile?.header}
						alt="banner"
						class="h-full w-full object-cover"
					/>
				{/if}
			</div>
			<Avatar {profile} size={6} containerClass="absolute -bottom-12 left-4" borderless={true} />
		</div>
		<ProfileAction {profile} {isCurrentProfile} />
		<div class="p-2">
			<h1 class="mt-4 text-base font-semibold">
				{truncateText(profile?.displayName || profile?.handle, 50)}
			</h1>

			<span class="my-1 text-sm font-normal text-surface-500">
				@{profile?.handle}
			</span>

			<OpenpeepsMarkdown source={profile?.bio || t('profile.noBio')} linkPreviewMode="none" />

			<div class="flex gap-1 items-center">
				<div class="input-group-shim"><MapPin class="size-3" /></div>
				<p>{profile?.location?.text}</p>
			</div>
			<ProfileStats {profile} />

			{#each profile.fields || [] as field}
				<div class="mt-4 flex items-center gap-2">
					<span class="text-sm text-surface-500">{field.name}</span>
					<OpenpeepsMarkdown isInline source={field.value} linkPreviewMode="none" class="pt-3.5" />
				</div>
			{/each}
		</div>
	</div>
</div>
