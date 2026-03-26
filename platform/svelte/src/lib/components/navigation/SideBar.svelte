<script lang="ts">
	import { MainMenu } from '.';
	import { getServerInfo } from '$lib/server';
	import { ProfileMenu } from '.';
	import { X } from 'lucide-svelte';
	import { getDrawerStore } from '@skeletonlabs/skeleton';
	import { currentProfileSettingsStore, me } from '$lib/api';
	import { Link, Button } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';
	import { getTheme } from '@openpeeps/common';

	const serverInfo = getServerInfo();
	let profileSettingsQuery = currentProfileSettingsStore()
	let profileSettings = $profileSettingsQuery.data
	const logoSmall = getTheme(serverInfo.communityConfig, profileSettings).logoSmall;
	const {
		communityConfig: {
			info: { name, tagLine }
		}
	} = serverInfo;

	const drawerStore = getDrawerStore();
	const { t } = i18nContext();
</script>

<div class="relative h-screen w-full pt-3 md:h-full">
	<div class="h-[90%] overflow-y-auto">
		<div class="md:items-left flex w-full items-center justify-between px-4">
			<a href="/">
				<img src={logoSmall} alt="logo" class="h-10 object-contain" />
			</a>
			<button
				title={t('common.close')}
				class="flex md:hidden"
				onclick={() => {
					drawerStore.close();
				}}
			>
				<X />
			</button>
		</div>
		{#if $me?.type === 'local'}
			<ProfileMenu />
			<MainMenu />
		{:else}
			<div class="section mt-4">
				<div class="flex h-full flex-col items-center justify-center space-y-4">
					<p class="text-center text-lg font-semibold">{t('navigation.welcome', { name })}</p>
					<p class="px-2 text-center text-sm">{tagLine}</p>
					<Button
						title={t('navigation.joinCommunity')}
						variant="variant-filled-primary"
						action="/auth/register">{t('navigation.joinCommunity')}</Button
					>

					<span class="text-sm">
						{t('navigation.haveAccount')}
						<Link action="/auth/login">{t('navigation.logIn')}</Link>
					</span>
				</div>
			</div>
		{/if}
	</div>
	<div class="bg-surface-50 absolute bottom-3">
		<p class="ml-4 text-center">{t('navigation.poweredBy')}</p>
	</div>
</div>
