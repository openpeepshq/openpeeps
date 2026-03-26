<script lang="ts">
	import { LabelOld, Input } from '@openpeeps/ui';
	import { Button } from '@openpeeps/ui';
	import { getServerInfo } from '$lib/server';
	import { type GuestData } from '@openpeeps/common/types';
	import { getTheme, profileName } from '@openpeeps/common/lib';
	import { getJamContext } from '$lib/components/core/jams/context';
	import { currentProfileSettingsStore, getGuestPass } from '$lib/api';

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
		<div>Enter your details below to proceed to waiting room</div>

		<div class="mt-5 space-y-6">
			<LabelOld title="Full name">
				<Input bind:value={guestData.displayName} required placeholder="Full Name" />
			</LabelOld>
			<LabelOld title="Email">
				<Input bind:value={guestData.email} required placeholder="Email" />
			</LabelOld>

			<p class="">
				By continuing, you agree to the
				<a target="_blank" href={termsAndConditions || '/docs/terms-and-conditions'} class="anchor">
					Terms of Service
				</a>
				as regards jam activities
			</p>

			<Button title="Continue" action={onSubmit} variant="variant-filled-primary" class="w-full"
				>Continue</Button
			>
		</div>
	</div>
</div>
