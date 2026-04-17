<script lang="ts">
	import { setMemberRolesMutation } from '$lib/api';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper, Button } from '@openpeeps/ui';
	import { toast } from '$lib/utils/toast';
	import {
		defaultGroupRoles,
		type GroupMember,
		type GroupRelationship,
		type GroupWithMeta
	} from '@openpeeps/common/types';
	import { getToastStore, SlideToggle } from '@skeletonlabs/skeleton';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		group: GroupWithMeta;
		member: GroupMember;
	}

	const { t } = i18nContext();
	let { group, member }: Props = $props();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const setMemberRoles = setMemberRolesMutation({ id: group.id, memberId: member.profile.id });

	const allRoles = defaultGroupRoles;

	const rolesSet = $state(new Set(member.roles));
	const roles = $derived([...rolesSet]);

	const doSetMemberRoles = async () => {
		setMemberRoles({ roles })
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('groups.changeRoles.successMessage')
					})
				);
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('groups.changeRoles.errorMessage')
					})
				);
			});
	};

	const setRoleStatus = (role: GroupRelationship, status: boolean) => {
		if (status) {
			rolesSet.add(role);
		} else {
			rolesSet.delete(role);
		}
	};
</script>

<ModalWrapper>
	<ModalHeader title={t('groups.changeRoles.title')} />
	<div class="p-4">
		{t('groups.changeRoles.description', {
			handle: member.profile.handle
		})}
	</div>
	<div class="p-4">
		{#each allRoles as role}
			<div class="flex items-center justify-between">
				<div>
					<p class="text-lg font-medium">{t(`groups.roles.${role}`)}</p>
				</div>

				<SlideToggle
					name="slide"
					checked={rolesSet.has(role)}
					on:change={(e) => setRoleStatus(role, (e.target as HTMLInputElement).checked)}
					background="bg-surface-300"
					active="bg-primary-500"
				/>
			</div>
		{/each}
	</div>
	<ModalFooter extraClassNames="flex justify-end w-full">
		<Button title={t('common.cancel')} variant="variant-ringed-primary" action={modalManager.close}>
			{t('common.cancel')}
		</Button>
		<Button
			title={t('groups.changeRoles.confirm')}
			variant="variant-filled-error"
			action={doSetMemberRoles}>{t('groups.changeRoles.confirm')}</Button
		>
	</ModalFooter>
</ModalWrapper>
