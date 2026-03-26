<script lang="ts">
	import { dev } from '$app/environment';
	import type { Component } from 'svelte';
	import type { ExpandedNotification } from '@openpeeps/common/types';
	import { getComponent } from '$lib/components';
	import { kebabToCamelCase } from '@openpeeps/common/lib';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();

	const NotificationComponent = getComponent(
		'notification-' + kebabToCamelCase(notification.type),
		dev
	) as Component<{
		notification: ExpandedNotification;
	}>;
</script>

<svelte:boundary onerror={(error) => console.log(error, notification)}>
	<div class=" flex w-full cursor-pointer items-center justify-between border-b">
		<NotificationComponent {notification} />
	</div>
</svelte:boundary>
