<script lang="ts">
	import { LabelOld, Input } from '@openpeeps/ui';
	import { Button } from '@openpeeps/ui';
	import { getServerInfo } from '$lib/server';
	import { type GuestData } from '@openpeeps/common/types';
	import { getTheme, profileName } from '@openpeeps/common/lib';
	import { getJamContext } from '$lib/components/core/jams/context';
	import { currentProfileSettingsStore, getGuestPass } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const serverInfo = getServerInfo();
	let profileSettingsQuery = currentProfileSettingsStore()
	let profileSettings = $profileSettingsQuery.data
	const logoSmall = getTheme(serverInfo.communityConfig, profileSettings).logoSmall;

	const {
		communityConfig: {
			info: { termsAndConditions }
		}
	} = serverInfo;

	const { jamPost, jamEvent } = getJamContext();

	interface Props {
		guestData?: GuestData;
	}

	let {
		guestData = $bindable({
			displayName: '',
			email: ''
		})
	}: Props = $props();

	const onSubmit = async () => {
		await getGuestPass({ ...guestData, resource: { type: 'jam', id: jamPost.id } });
		window.location.reload();
	};
</script>

<div class="flex h-full w-full items-center justify-center">
	<div class="flex w-[90%] flex-col items-center justify-center md:w-[25%] bg-surface-50 rounded-md border p-4">
		<img src={logoSmall} alt="logo" class="mb-6 h-10" />
		<div class="text-2xl">
			{jamEvent.name} - {profileName(jamPost.profile)}
		</div>
		<div>{t('jams.lobby.guestIntro')}</div>

		<div class="mt-5 space-y-6">
			<LabelOld title={t('jams.lobby.guestFullNameLabel')}>
				<Input bind:value={guestData.displayName} required placeholder={t('jams.lobby.guestFullNamePlaceholder')} />
			</LabelOld>
			<LabelOld title={t('jams.lobby.guestEmailLabel')}>
				<Input bind:value={guestData.email} required placeholder={t('jams.lobby.guestEmailPlaceholder')} />
			</LabelOld>

			<p class="">
				{t('jams.lobby.guestTermsAgreePrefix')}
				<a target="_blank" href={termsAndConditions || '/docs/terms-and-conditions'} class="anchor">
					{t('jams.lobby.guestTermsLink')}
				</a>
				{t('jams.lobby.guestTermsAgreeSuffix')}
			</p>

			<Button title={t('jams.lobby.continue')} action={onSubmit} variant="variant-filled-primary" class="w-full"
				>{t('jams.lobby.continue')}</Button
			>
		</div>
	</div>
</div>
