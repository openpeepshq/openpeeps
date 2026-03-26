<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper, Button } from '@openpeeps/ui';
	import { toast } from '$lib/utils/toast';
	import { Input, LabelOld } from '@openpeeps/ui';
	import { getRolesListStore } from '$lib/api';
	import type { ProfileWithMeta } from '@openpeeps/common/types';
	import { modifyProfileRolesMutation } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';
	import { AccessDeniedLoader } from '$lib/components/layout';

	const { t } = i18nContext();

	interface Props {
		profile: ProfileWithMeta;
	}

	let { profile }: Props = $props();

	const modalManager = getModalManager();
	const toastStore = getToastStore();
	const rolesListStore = getRolesListStore();
	const modifyProfileRoles = modifyProfileRolesMutation({
		id: profile.id
	});

	let selectedRoles: Record<string, boolean> = $state(
		Object.fromEntries(profile.roles.map((r) => [r.key, true]))
	);

	const handleModifyProfileRoles = async () => {
		await (profile &&
			modifyProfileRoles({
				roles: $rolesListStore.data?.filter((role) => selectedRoles[role.key]) || []
			})
				.then(() => {
					toastStore.trigger(
						toast({
							message: t('profile.modals.editProfile.rolesUpdated')
						})
					);
					modalManager.close();
				})
				.catch(() => {
					toastStore.trigger(
						toast({
							message: t('profile.modals.editProfile.rolesUpdateError')
						})
					);
				}));
	};
</script>

<ModalWrapper width={'md:w-1/3 w-modal'}>
	<!-- header -->
	<ModalHeader title={t('profile.modals.editProfile.title')} />
	<!-- content -->
	<div class="px-4 py-2">
		<p>{t('profile.modals.editProfile.description')}</p>

		<!-- role -->
		<AccessDeniedLoader queries={[$rolesListStore]}>
			<div class="mt-4">
				<h1 class="text-lg">{t('profile.modals.editProfile.roles')}</h1>
				<div class="mt-2 space-y-2 pl-2">
					{#if $rolesListStore.data?.length}
						{#each $rolesListStore.data as role, index}
							<div class="flex items-center gap-x-2">
								<Input
									tabindex={index + 1}
									type="checkbox"
									class="size-6"
									bind:checked={selectedRoles[role.key]}
								/>
								<LabelOld>{role.displayName}</LabelOld>
							</div>
						{/each}
					{:else}
						<div class="flex w-full items-center justify-center p-4">
							<h2 class="text-lg">{t('profile.modals.editProfile.noRoles')}</h2>
						</div>
					{/if}
				</div>
			</div>
		</AccessDeniedLoader>
	</div>

	<!-- footer -->
	<ModalFooter extraClassNames={'w-full'}>
		<Button
			title={t('profile.modals.editProfile.saveChanges')}
			class="w-full"
			action={handleModifyProfileRoles}
			variant="variant-filled-primary"
		>
			{t('profile.modals.editProfile.saveChanges')}
		</Button>
	</ModalFooter>
</ModalWrapper>
