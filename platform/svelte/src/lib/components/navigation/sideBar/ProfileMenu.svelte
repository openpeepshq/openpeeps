<script lang="ts">
	import { Avatar } from '$lib/components/core/profile';
	import { Bell, ChevronDown, LogOut, BookCheck } from 'lucide-svelte';
	import { currentProfileNotificationsStatsStore, currentProfileStore } from '$lib/api';
	import { subscribePushNotifications } from '$lib/push';
	import { goto } from '$app/navigation';
	import { getServerInfo } from '$lib/server';
	import DisplayUserNameBlock from '$lib/components/core/profile/DisplayUserNameBlock.svelte';
	import { PopupMenu, PopupMenuButton } from '@openpeeps/ui';
	import { handleLogout } from '$lib/utils/handleLogout';
	import { getDrawerStore } from '@skeletonlabs/skeleton';
	import { i18nContext } from '$lib/components/i18n';

	const profileQuery = currentProfileStore();
	const notificationStatsQuery = currentProfileNotificationsStatsStore();
	const drawerStore = getDrawerStore();
	const { t } = i18nContext();

	const {
		vapid: { publicKey: pushKey }
	} = getServerInfo();
</script>

<div class="w-full px-4 py-5">
	<div class="mb-4 flex w-full items-center justify-between">
		<a href="/@{$profileQuery.data?.handle}" onclick={() => drawerStore.close()}>
			<Avatar profile={$profileQuery.data} size={4} containerClass="p-1" borderless />
		</a>
		<button
			title={t('navigation.openNotifications')}
			onclick={async() => {
				await subscribePushNotifications(pushKey).then(() => goto('/notifications')).catch((e) => {console.log('error', e)});
				drawerStore.close();
			}}
			class="relative mr-2 inline-block"
		>
			<Bell class="size-11 p-2.5" />
			{#if $notificationStatsQuery.isSuccess && $notificationStatsQuery.data?.unseen > 0}
				<span class="variant-filled-error badge-icon absolute -right-1 -top-1 z-10"
					>{$notificationStatsQuery.data?.unseen}</span
				>
			{/if}
		</button>
	</div>
	<div class="flex flex-row items-start">
		<div>
			<DisplayUserNameBlock profile={$profileQuery.data} size="l" />
		</div>
		<PopupMenu icon={ChevronDown} iconSize={24}>
			<PopupMenuButton
				title={t('navigation.goToWelcomePage')}
				icon={BookCheck}
				text={t('navigation.welcome')}
				action={() => {
					goto('/welcome');
					drawerStore.close();
				}}
			/>
			<PopupMenuButton
				title={t('navigation.logOut')}
				icon={LogOut}
				text={t('navigation.logOut')}
				action={handleLogout}
			/>
		</PopupMenu>
	</div>
</div>
