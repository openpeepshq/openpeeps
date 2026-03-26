<script lang="ts">
	import { updateConfigMutation } from '@openpeeps/svelte/api';
	import { Button, Label } from '@openpeeps/ui';
	import { type CommunityConfig } from '@openpeeps/common';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils';
	import { i18nContext } from '$lib/components';

	const { t } = i18nContext();

	const toastStore = getToastStore();

	const updateConfig = updateConfigMutation({
		namespace: 'allpeep',
		name: 'community'
	});

	interface Props {
		communityConfig: CommunityConfig;
	}

	const { communityConfig }: Props = $props();

	const updatedConfig = $state(structuredClone(communityConfig));

	const handleRoleOnRegistrationChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		updatedConfig.roles.onRegistration.add = [target.value];
	};

	const action = () =>
		updateConfig({
			config: { roles: updatedConfig.roles }
		}).then(() =>
			toastStore.trigger(
				toast({
					message: t('admin.configuration.community.defaultRoles.success'),
					background: 'variant-filled-success'
				})
			)
		);
</script>

<div class="flex flex-col gap-4 p-4">
	<h3 class="h3">{t('admin.configuration.community.defaultRoles.title')}</h3>
	<Label
		title={t('admin.configuration.community.defaultRoles.roleOnRegistration')}
		description={t('admin.configuration.community.defaultRoles.roleOnRegistrationDescription')}
	>
		<select class="select" onchange={handleRoleOnRegistrationChange}
		value={updatedConfig.roles.onRegistration.add?.[0]}
		>
			<option value="pendingmember">Pending Member</option>
			<option value="member">Member</option>
		</select>
	</Label>

	<Button variant="variant-ghost-primary" {action}>Save</Button>
</div>
