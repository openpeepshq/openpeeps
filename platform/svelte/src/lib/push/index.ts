/// <reference lib="dom" />

import { authenticatedCoreApiClient, client, throwError } from '$lib/api';
import { Base64 } from 'js-base64';
import type { PushSubscriptionData } from '@openpeeps/common/types';

export const subscribePushNotifications = async (applicationServerKey?: string) => {
	if (!('Notification' in window)) {
		return;
	}

	if (!applicationServerKey) {
		return;
	}
	if (await checkPushSubscription(applicationServerKey)) {
		return;
	}
	if ((await Notification.requestPermission()) === 'granted' && navigator.serviceWorker) {
		return navigator.serviceWorker.ready
			.then((sr) => {
				return sr.pushManager.subscribe({
					applicationServerKey: Base64.toUint8Array(applicationServerKey),
					userVisibleOnly: true
				});
			})
			.then((ps) => {
				return client.accounts.current.createPushSubscription({ ...ps.toJSON(), type: 'web' } as PushSubscriptionData, {
					fetchClient: authenticatedCoreApiClient()
				});
			})
			.catch((_) => {
				return;
			});
	}
};

export const unsubscribePushNotifications = () =>
	navigator.serviceWorker?.ready.then((sr) =>
		sr.pushManager.getSubscription().then((sub) => sub && sub.unsubscribe())
	);

export const getPushSubscription = async () => {
	if (!('Notification' in window)) {
		return;
	}

	return navigator.serviceWorker?.ready.then((sr) => sr.pushManager.getSubscription());
};

export const checkPushSubscription = async (serverKey: string) => {
	if (!('Notification' in window)) {
		return;
	}

	if (Notification.permission !== 'granted') {
		return false;
	}

	const sr = await navigator.serviceWorker?.ready;

	const sub = await sr.pushManager.getSubscription();

	if (!sub || !sr) {
		return false;
	}

	const currentSubscriptions = await client.accounts.current
		.listPushSubscriptions({ fetchClient: authenticatedCoreApiClient() })
		.then(throwError());

	return (
		Base64.fromUint8Array(new Uint8Array(sub.options.applicationServerKey!), true) === serverKey &&
		currentSubscriptions.filter((s) => s.type === 'web').map((s) => s.endpoint).includes(sub.endpoint)
	);
};
