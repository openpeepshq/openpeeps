<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { updateProfileSettingsMutation, currentProfileSettingsStore } from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import { Button } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';
	import { getCurrentProfile } from '$lib/auth';
	import { sleep } from '@openpeeps/common';

	const { t } = i18nContext();
	const currentProfile = getCurrentProfile();
	const toastStore = getToastStore();

	let profileSettingsQuery = currentProfileSettingsStore();
	const updateSettings = updateProfileSettingsMutation();

	const DEFAULT_LANGUAGE = 'en';

	const AVAILABLE_LANGUAGES = [
		{ code: 'en', name: 'English' },
		{ code: 'de', name: 'Deutsch' },
	];

	let language = $state<string>(DEFAULT_LANGUAGE);

	$effect(() => {
		if ($profileSettingsQuery.data?.language) {
			language = $profileSettingsQuery.data.language;
		}
	});

	const handleSubmit = () =>
		updateSettings({
			id: currentProfile.id,
			language,
		})
			.then(() => {
				localStorage.setItem('openpeeps-language', language);
				toastStore.trigger(
					toast({
						message: t('settings.language.updateSuccess'),
						background: 'variant-filled-success',
					}),
				);
			})
			.then(() => sleep(5))
			.then(() => window.location.reload());
</script>

<div class="flex flex-col gap-4 p-3">
	<div class="border p-4">
		<h4 class="my-4 text-lg font-semibold">
			{t('settings.language.title')}
		</h4>
		<span>{t('settings.language.languageDescription')}</span>
		<div class="flex-wrap items-center gap-x-4 gap-y-2 mt-4">
			{#each AVAILABLE_LANGUAGES as lang}
				<div>
					<input
						type="radio"
						class="h-4 w-4"
						bind:group={language}
						value={lang.code}
					/>
					<span>
						{lang.name}
						{#if lang.code === DEFAULT_LANGUAGE}
							<span class="text-sm opacity-60">{t('settings.language.default')}</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</div>
	<Button variant="variant-ghost-primary" action={handleSubmit}>{t('common.form.save')}</Button>
</div>
