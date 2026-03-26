<script lang="ts">
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import { Button } from '@openpeeps/ui';
	import { X } from 'lucide-svelte';
	import { ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { createInviteMutation } from '$lib/api';
	import { randomString } from '@openpeeps/common/lib';
	import { parse, end } from 'iso8601-duration';
	import { Input } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	// ------------ STORES --------------
	const toastStore = getToastStore();
	const modalStore = getModalStore();
	const createInviteLink = createInviteMutation();
	let emails = $state('');
	let isInviteLinkGenerated = $state(false);
	let numberOfUses = $state('1');
	let expiresAfter = $state('P1D');
	let inviteLinkSlug = '';
	let customMessage = $state(t('admin.inviteEmail.defaultMessage'));

	const handleCreateNewInviteMail = async () => {
		if (!inviteLinkSlug) {
			inviteLinkSlug = randomString(8);
		}

		await createInviteLink({
			maxUses: numberOfUses === 'Unlimited' ? 1000 : Number(numberOfUses),
			expiresAt: `${end(parse(expiresAfter))}`,
			slug: inviteLinkSlug,
			active: true,
			emailPatterns: emails.split(','),
			customInvitationMessage: customMessage
		})
			.then(() => {
				isInviteLinkGenerated = true;
				toastStore.trigger(
					toast({
						message: t('admin.inviteEmail.success'),
						background: 'variant-filled-success'
					})
				);
			})
			.catch(() => {
				inviteLinkSlug = '';
				toastStore.trigger(
					toast({
						message: t('admin.inviteEmail.error'),
						background: 'variant-filled-error'
					})
				);
			});
	};
</script>

{#if $modalStore[0]}
	<ModalWrapper extraClassNames="md:w-1/3">
		<ModalHeader title={t('admin.inviteEmail.title')} />

		<article class="flex max-h-[60%] flex-col overflow-scroll p-3">
			<div class="w-full space-y-4">
				<div class="">
					<label for="">{t('admin.inviteEmail.emailAddress')}</label>
					<div class="bg-tertiary-200 rounded-md border">
						<Input
							type="email"
							bind:value={emails}
							placeholder={t('admin.inviteEmail.emailPlaceholder')}
						/>
						{#if emails !== ''}
							<div class="mt-2 flex flex-wrap gap-x-2">
								{#each emails.split(',') as email}
									<div class="bg-surface-300 flex items-center rounded-md border p-1">
										{email}
										<button title={t('common.remove')}>
											<X />
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				<div class="space-y-3">
					<label for="">{t('admin.inviteEmail.composeMessage')}</label>
					<textarea
						class="bg-tertiary-200 min-h-52 w-full rounded-md border p-2"
						bind:value={customMessage}
						placeholder=""
					></textarea>
				</div>
				<div class="flex justify-between">
					<div class="w-[48%]">
						<label for="" class="mb-3">{t('admin.inviteEmail.roles')}</label>
						<select
							class="border-tertiary-200 w-full rounded-md border p-2"
							name=""
							id=""
							bind:value={numberOfUses}
						>
							<option value="1">{t('admin.inviteEmail.roleAdmin')}</option>
							<option value="5">{t('admin.inviteEmail.roleMember')}</option>
							<option value="10">{t('admin.inviteEmail.roleGuest')}</option>
						</select>
					</div>
					<div class="w-[48%]">
						<label for="" class="mb-3">{t('admin.inviteEmail.expiresAfter')}</label>
						<select
							class="border-tertiary-200 w-full rounded-md border p-2"
							name=""
							id=""
							bind:value={expiresAfter}
						>
							<option value="P1D">{t('admin.inviteEmail.expires1Day')}</option>
							<option value="P2D">{t('admin.inviteEmail.expires2Days')}</option>
							<option value="P1W">{t('admin.inviteEmail.expires1Week')}</option>
							<option value="P1M">{t('admin.inviteEmail.expires1Month')}</option>
							<option value="P100Y">{t('admin.inviteEmail.expiresNever')}</option>
						</select>
					</div>
				</div>
			</div>
			{#if isInviteLinkGenerated}
				<Button variant="variant-filled-error" class="mt-4"
					>{t('admin.inviteEmail.deactivate')}</Button
				>
			{:else}
				<Button action={handleCreateNewInviteMail} variant="variant-filled-primary" class="mt-4">
					{t('admin.inviteEmail.sendInvite')}
				</Button>
			{/if}
		</article>
	</ModalWrapper>
{/if}
