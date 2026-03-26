<script lang="ts">
	import { MessageSquareText } from 'lucide-svelte';
	import { getServerInfo } from '$lib/server';
	import { currentProfileSettingsStore, currentProfileStore } from '$lib/api';
	import { Avatar } from '$lib/components/core/profile';
	import { goto } from '$app/navigation';
	import { Drawer, getDrawerStore, type DrawerSettings } from '@skeletonlabs/skeleton';
	import SideBar from './SideBar.svelte';
	import { i18nContext } from '$lib/components/i18n';
	import { getTheme } from '@openpeeps/common';

	let profileSettingsQuery = currentProfileSettingsStore()
	let profileSettings = $profileSettingsQuery.data
	const logoSmall = getTheme(getServerInfo().communityConfig, profileSettings).logoSmall;
	const profileQuery = currentProfileStore();
	const drawerStore = getDrawerStore();
	const { t } = i18nContext();

	const drawerSettings: DrawerSettings = {
		width: 'w-[380px]',
		rounded: 'rounded-none'
	};
</script>

<Drawer>
	<SideBar />
</Drawer>

<div class="bg-background sticky top-0 z-10 flex px-4 py-2 md:hidden">
	<div class="flex w-full items-center justify-between">
		<button
			title={t('navigation.profile')}
			class=""
			onclick={() => drawerStore.open(drawerSettings)}
		>
			<Avatar profile={$profileQuery.data} size={2.5} borderless />
		</button>
		<div class="">
			<a href="/">
				<img src={logoSmall} alt="logo" class="h-6 px-4" />
			</a>
		</div>
		<button title={t('navigation.messages')} onclick={() => goto('/conversations')}>
			<MessageSquareText />
		</button>
	</div>
</div>
