<script lang="ts">
	import FormImageInput from './FormImageInput.svelte';
	import { getFormContext } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';
	import {
		HEADER_IMAGE_MAX_WIDTH,
		PROFILE_GROUP_HEADER_ASPECT_RATIO,
	} from '@openpeeps/common/lib';

	const { t } = i18nContext();

	const { data } = getFormContext<{
		header: string;
		avatar: string;
	}>();
</script>

<div class="relative mb-16 w-full">
	<FormImageInput
		usage="header-image"
		displayType="full"
		aspectRatio={PROFILE_GROUP_HEADER_ASPECT_RATIO}
		maxWidth={HEADER_IMAGE_MAX_WIDTH}
		text={t('form.headerAvatarInput.coverImage')}
		showAltInput={false}
		path={['header']}
	/>
	<div class="absolute -bottom-12 left-4">
		<FormImageInput
			usage="avatar-image"
			displayType="avatar"
			showAltInput={false}
			path={['avatar']}
		/>
	</div>
</div>
