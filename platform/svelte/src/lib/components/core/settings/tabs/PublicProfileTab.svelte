<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { updateCurrentProfileMutation } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';
	import { toaster } from '$lib/utils/toast';
	import ProfileForm from '../../profile/ProfileForm.svelte';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
	}

	const { profile }: Props = $props();

	const toast = toaster();
	const updateProfile = updateCurrentProfileMutation();

	const handleSubmit = async() => 
		updateProfile(profile).then((res) => {
			toast({ message: t('settings.profile.updateSuccess'), type: 'success' })
		}).catch((error)=> {
			toast({ message: t('settings.profile.updateError', {error: error.message } ), type: 'error' })
		})
</script>

<section class="relative">
	<ProfileForm profileData={profile} {handleSubmit} />
</section>
