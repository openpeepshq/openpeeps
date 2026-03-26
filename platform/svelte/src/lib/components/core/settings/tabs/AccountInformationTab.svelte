<script lang="ts">
	import {
		type PublicAccount,
		type UpdateAccountPasswordRequest,
		updateAccountPasswordFormSchema
	} from '@openpeeps/common/types';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { updateCurrentAccountMutation } from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import { Button, Form, FormInput } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		account: PublicAccount;
	}

	let { account }: Props = $props();

	const updateCurrentAccount = updateCurrentAccountMutation();

	const data: UpdateAccountPasswordRequest = $state({
		email: account.email ?? '',
		oldPassword: '',
		newPassword: '',
		confirmPassword: ''
	});

	const toastStore = getToastStore();

	const handleAccountSubmit = async () => {
		const submitData: UpdateAccountPasswordRequest = {
			email: data.email,
			oldPassword: data.oldPassword,
			newPassword: data.newPassword || undefined,
			confirmPassword: data.confirmPassword || undefined
		};

		await updateCurrentAccount(submitData)
			.catch((e) => {
				toastStore.trigger(
					toast({
						message: t('settings.account.updateFailed', { error: e.message }),
						background: 'variant-filled-error',
						autohide: true
					})
				);
			})
			.then((response) => {
				if (response && response.success) {
					toastStore.trigger(
						toast({ message: t('settings.account.updateSuccess'), autohide: true })
					);
					data.oldPassword = '';
					data.newPassword = '';
					data.confirmPassword = '';
				}
			});
	};

	let valid = $state(false);
</script>

<Form schema={updateAccountPasswordFormSchema} {data} class="p-3" bind:valid>
	<FormInput
		path={['oldPassword']}
		type="password"
		title={t('settings.account.oldPassword')}
		description={t('settings.account.oldPasswordDescription')}
		placeholder={t('settings.account.oldPasswordPlaceholder')}
	/>
	<FormInput
		path={['email']}
		type="email"
		title={t('settings.account.email')}
		placeholder={t('settings.account.emailPlaceholder')}
	/>
	<FormInput
		path={['newPassword']}
		type="password"
		title={t('settings.account.newPassword')}
		placeholder={t('settings.account.newPasswordPlaceholder')}
	/>
	<FormInput
		path={['confirmPassword']}
		type="password"
		title={t('settings.account.confirmPassword')}
		placeholder={t('settings.account.confirmPasswordPlaceholder')}
	/>
	<Button variant="variant-filled-primary" action={handleAccountSubmit} disabled={!valid}>
		{t('common.submit')}
	</Button>
</Form>
