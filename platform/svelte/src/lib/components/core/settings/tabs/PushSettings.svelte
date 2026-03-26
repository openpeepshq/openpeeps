<script lang="ts">
	import { getToastStore, SlideToggle } from '@skeletonlabs/skeleton';
	import { Button, LoadingIcon } from '@openpeeps/ui';
	import {
		subscribePushNotifications,
		checkPushSubscription,
		unsubscribePushNotifications,
		getPushSubscription
	} from '$lib/push';
	import { getServerInfo } from '$lib/server';
	import { i18nContext } from '$lib/components/i18n';
	import { toast } from '$lib/utils';
	import { logger } from '$lib/log';
	import { authenticatedCoreApiClient, client } from '$lib/api';

	const log = logger('settings:push');

	const toastStore = getToastStore();

	const { t } = i18nContext();

	const serverInfo = getServerInfo();

	const serverPushEnabled = !!serverInfo.vapid.publicKey;
	let clientPushEnabledPromise = $state(
		serverPushEnabled && checkPushSubscription(serverInfo.vapid.publicKey!)
	);

	const handleChange = (checked: boolean) => {
		if (checked) {
			subscribePushNotifications(serverInfo.vapid.publicKey!).catch((e) => {
				toastStore.trigger(
					toast({
						message: t('settings.notifications.pushSubscriptionFailed'),
						background: 'variant-filled-error'
					})
				);
				log.error(e);
			});
			clientPushEnabledPromise = checkPushSubscription(serverInfo.vapid.publicKey!);
		} else {
			unsubscribePushNotifications();
		}
	};

	const testPushSubscription = async () =>
		getPushSubscription().then((subscription) => {
			console.log(subscription?.toJSON());
			const auth = subscription?.toJSON().keys?.auth;
			if (auth) {
				return client.accounts.current.testPushSubscription(
					{ subscriptionKey: auth },
					{ fetchClient: authenticatedCoreApiClient() }
				);
			}
		});
</script>

{#snippet pushSettings(clientPushEnabled?: boolean)}
	<div class="flex items-center justify-between">
		<div>
			<p class="text-lg font-medium">{t('settings.notifications.pushEnabled')}</p>
		</div>
		<SlideToggle
			name="slide"
			checked={clientPushEnabled}
			on:change={(e) => handleChange((e.target as HTMLInputElement).checked)}
			background="bg-surface-300"
			active="bg-primary-500"
		/>
	</div>
	{#if clientPushEnabled}
		<Button variant="variant-filled-primary" action={testPushSubscription}>
			{t('settings.notifications.testPush')}
		</Button>
	{/if}
{/snippet}

<div class="mb-6 p-3">
	{#if !serverPushEnabled}
		<p>{t('settings.notifications.serverPushDisabled')}</p>
	{:else}
		{#await clientPushEnabledPromise}
			<LoadingIcon />
		{:then clientPushEnabled}
			{@render pushSettings(clientPushEnabled)}
		{:catch}
			{@render pushSettings()}
		{/await}
	{/if}
</div>
