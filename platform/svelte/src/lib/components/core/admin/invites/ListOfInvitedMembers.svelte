<script lang="ts">
	import { ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { InviteLinkWithMeta } from '@openpeeps/common/types';
	import { ProfileCard } from '../../profile';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		inviteDetails: InviteLinkWithMeta;
	}

	let { inviteDetails }: Props = $props();
</script>

<ModalWrapper extraClassNames="md:w-1/3">
	<ModalHeader title={t('admin.invites.invitedMembers')} />

	<article class="flex flex-col p-3">
		<div class="max-h-[50vh] w-full overflow-y-auto">
			{#if inviteDetails?.redemptions.length === 0}
				<h4>{t('admin.invites.noJoinedAccounts')}</h4>
			{:else}
				<h4>{t('admin.invites.joinedAccounts')}</h4>

				<div class="mt-4 space-y-2">
					{#each inviteDetails?.redemptions as member}
						<ProfileCard profile={member} showAction={false} />
					{/each}
				</div>
			{/if}
		</div>
	</article>
</ModalWrapper>
