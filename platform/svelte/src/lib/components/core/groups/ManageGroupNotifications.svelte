<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader } from '@openpeeps/ui';
	import type { GroupData } from '@openpeeps/common/types';
	import { Bell, BellDot, BellOff } from 'lucide-svelte';

	interface Props {
		group?: GroupData | undefined;
	}

	let { group = undefined }: Props = $props();
	let notificationValue = $state('');
	const notificationOptions = [
		{
			icon: Bell,
			label: 'All',
			description: '',
			value: 'all'
		},
		{
			icon: BellDot,
			label: 'Most relevant',
			description: 'Personalized based on your activity',
			value: 'most-relevant'
		},
		{
			icon: BellOff,
			label: 'Off',
			description: '',
			value: 'off'
		}
	];
</script>

<div class="bg-surface-100-800-token mx-auto rounded-lg shadow-md md:w-1/3">
	<ModalHeader title={'Manage notifications'} />
	<article class="space-y-2 p-3">
		<p>Manage notifications about <strong>{group?.displayName}</strong></p>

		<div class="pl-2">
			{#each notificationOptions as notificationOption}
				<div class="mb-2 flex w-full items-center justify-between gap-2">
					<div class="flex items-center space-x-2">
						<svelte:component this={notificationOption.icon} />
						<label for={notificationOption.value}>
							<span>{notificationOption.label}</span>
							<span>{notificationOption.description}</span>
						</label>
					</div>
					<input
						bind:group={notificationValue}
						type="radio"
						id={notificationOption.value}
						name="notification"
						value={notificationOption.value}
					/>
				</div>
			{/each}
		</div>
	</article>

	<ModalFooter extraClassNames="flex justify-end w-full">
		<div class=""></div>
		<Button title="Done" variant="variant-filled-primary">Done</Button>
	</ModalFooter>
</div>
