<script lang="ts">
	import { updateConfigMutation } from '@openpeeps/svelte/api';
	import { Form, Button } from '@openpeeps/ui';
	import { communityConfigSchema, type CommunityConfig } from '@openpeeps/common';
	import { convertToWebpIfHeic, toast } from '$lib/utils';
	import { i18nContext } from '$lib/components/i18n';
	import { diff } from 'deep-object-diff';
	import equal from 'fast-deep-equal';
	import { uploadMediaFileMutation } from '$lib/api';
	import { FileDropzone, getToastStore } from '@skeletonlabs/skeleton';

	const updateConfig = updateConfigMutation({
		namespace: 'allpeep',
		name: 'community'
	});
	const toastStore = getToastStore();
	const uploadMediaFile = uploadMediaFileMutation();
	let { defaults }: { defaults: CommunityConfig } = $props();
	const { t } = i18nContext();

	const updatedConfig = $state(structuredClone(defaults));

	const setLightBackgroundAuthUrl = async (event: Event) => {
		const file = (event.currentTarget as HTMLInputElement).files?.item(0);

		if (file) {
			updatedConfig.theme.light.backgroundAuth = await uploadMediaFile({
				file,
				usage: t('configuration.community.backgroundAuth')
			}).then((ma) => ma.url);
		}
	};

	const setDarkBackgroundAuthUrl = async (event: Event) => {
		const file = (event.currentTarget as HTMLInputElement).files?.item(0);

		if (file) {
			const processedFile = await convertToWebpIfHeic(file)

			updatedConfig.theme.dark.backgroundAuth = await uploadMediaFile({
				file: processedFile,
				usage: t('configuration.community.backgroundAuth')
			}).then((ma) => ma.url);
		}
	};

	const setLightBackgroundUrl = async (event: Event) => {
		const file = (event.currentTarget as HTMLInputElement).files?.item(0);

		if (file) {
			const processedFile = await convertToWebpIfHeic(file)

			updatedConfig.theme.light.background = await uploadMediaFile({
				file: processedFile,
				usage: t('configuration.community.background')
			}).then((ma) => ma.url);
		}
	};

	const setDarkBackgroundUrl = async (event: Event) => {
		const file = (event.currentTarget as HTMLInputElement).files?.item(0);

		if (file) {
			const processedFile = await convertToWebpIfHeic(file)

			updatedConfig.theme.dark.background = await uploadMediaFile({
				file: processedFile,
				usage: t('configuration.community.background')
			}).then((ma) => ma.url);
		}
	};

	const setLightThemeLogo = async (event: Event) => {
		const file = (event.currentTarget as HTMLInputElement).files?.item(0);

		if (file) {
			const processedFile = await convertToWebpIfHeic(file)

			updatedConfig.theme.light.logoSmall = await uploadMediaFile({
				file: processedFile,
				usage: t('configuration.community.logo')
			}).then((ma) => ma.url);
		}
	};

	const setDarkThemeLogo = async (event: Event) => {
		const file = (event.currentTarget as HTMLInputElement).files?.item(0);

		if (file) {
			const processedFile = await convertToWebpIfHeic(file)

			updatedConfig.theme.dark.logoSmall = await uploadMediaFile({
				file: processedFile,
				usage: t('configuration.community.logo')
			}).then((ma) => ma.url);
		}
	};

	const handleSubmit = () =>
		updateConfig({
			config: diff(defaults, updatedConfig) as CommunityConfig
		}).then(() => {
			toastStore.trigger(
				toast({
					message: t('configuration.community.updateSuccess'),
					background: 'variant-filled-success'
				})
			);
			window.location.reload();
		});
</script>

<div class="flex flex-col gap-4">
	<Form data={updatedConfig} schema={communityConfigSchema}>
		<!-- theme -->
		<div class="border p-4">
			<h4 class="my-4 text-lg font-semibold">{t('configuration.community.theme.title')}</h4>
			<span>{t('configuration.community.themeDescription')}</span>
			<div class="flex-wrap items-center gap-x-4 gap-y-2">
				<div>
					<input
						type="radio"
						class="h-4 w-4"
						bind:group={updatedConfig.theme.base}
						value="OpenpeepsLight"
					/>
					<span>{t('configuration.community.lightTheme.mode')}</span>
				</div>
				<div>
					<input
						type="radio"
						class="h-4 w-4"
						bind:group={updatedConfig.theme.base}
						value="OpenpeepsDark"
					/>
					<span>{t('configuration.community.darkTheme.mode')}</span>
				</div>
			</div>
		</div>
		<!-- primary color -->
		<div class="border p-4">
			<h4 class="my-4 text-lg font-semibold">{t('configuration.community.color')}</h4>
			<span>{t('configuration.community.colorDescription')}</span>
			<div class="flex gap-x-4">
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
					<span class="mr-4">{t('configuration.community.lightTheme.color')}</span>
					<input
						class="input !size-8 !rounded-full"
						type="color"
						bind:value={updatedConfig.theme.light.primaryHex}
					/>
					<input
						class="input w-32"
						type="text"
						bind:value={updatedConfig.theme.light.primaryHex}
						readonly
						tabindex="-1"
					/>
				</div>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
					<span class="mr-4">{t('configuration.community.darkTheme.color')}</span>
					<input
						class="input !size-8 !rounded-full"
						type="color"
						bind:value={updatedConfig.theme.dark.primaryHex}
					/>
					<input
						class="input w-32"
						type="text"
						bind:value={updatedConfig.theme.dark.primaryHex}
						readonly
						tabindex="-1"
					/>
				</div>
			</div>
		</div>
		<!-- auth background -->
		<div class="border p-4">
			<h4 class="my-4 text-lg font-semibold">{t('configuration.community.authBackground')}</h4>
			<span>{t('configuration.community.authBackgroundDescription')}</span>
			<div class="flex flex-wrap gap-x-4">
				<div class="">
					<div
						class="h-[400px] w-full bg-contain bg-center bg-no-repeat"
						style="background-image: url({updatedConfig.theme.light.backgroundAuth})"
					></div>
					<FileDropzone
						name="background-image-auth"
						accept="image/*"
						allowMultiple={false}
						border="border-primary-500 border-dashed border-2"
						on:change={setLightBackgroundAuthUrl}
					>
						{#snippet message()}
							{t('configuration.community.lightTheme.uploadAuthBackground')}
						{/snippet}
					</FileDropzone>
				</div>
				<div class="">
					<div
						class="h-[400px] w-full bg-contain bg-center bg-no-repeat"
						style="background-image: url({updatedConfig.theme.dark.backgroundAuth})"
					></div>
					<FileDropzone
						name="background-image-auth"
						accept="image/*"
						allowMultiple={false}
						border="border-primary-500 border-dashed border-2"
						on:change={setDarkBackgroundAuthUrl}
					>
						{#snippet message()}
							{t('configuration.community.darkTheme.uploadAuthBackground')}
						{/snippet}
					</FileDropzone>
				</div>
			</div>
			<p class="py-3 text-sm">{t('configuration.community.authBackgroundRequirements')}</p>
		</div>
		<!-- background -->
		<div class="border p-4">
			<h4 class="my-4 text-lg font-semibold">{t('configuration.community.background')}</h4>
			<span>{t('configuration.community.backgroundDescription')}</span>
			<div class="flex flex-wrap gap-x-4">
				<div class="">
					<div
						class="h-[400px] w-full bg-contain bg-center bg-no-repeat"
						style="background-image: url({updatedConfig.theme.light.background})"
					></div>
					<FileDropzone
						name="background-image"
						accept="image/*"
						allowMultiple={false}
						border="border-primary-500 border-dashed border-2"
						on:change={setLightBackgroundUrl}
					>
						{#snippet message()}
							{t('configuration.community.lightTheme.uploadBackground')}
						{/snippet}
					</FileDropzone>
				</div>
				<div class="">
					<div
						class="h-[400px] w-full bg-contain bg-center bg-no-repeat"
						style="background-image: url({updatedConfig.theme.dark.background})"
					></div>
					<FileDropzone
						name="background-image"
						accept="image/*"
						allowMultiple={false}
						border="border-primary-500 border-dashed border-2"
						on:change={setDarkBackgroundUrl}
					>
						{#snippet message()}
							{t('configuration.community.darkTheme.uploadBackground')}
						{/snippet}
					</FileDropzone>
				</div>
			</div>

			<p class="py-3 text-sm">{t('configuration.community.backgroundRequirements')}</p>
		</div>
		<!-- logo -->
		<div class="border p-4">
			<h4 class="my-4 text-lg font-semibold">{t('configuration.community.logo')}</h4>
			<span>{t('configuration.community.logoDescription')}</span>
			<div class="flex flex-wrap gap-x-4">
				<div class="">
					<div class="mb-2 flex flex-wrap gap-x-6 gap-y-2">
						<img
							class="h-20 object-contain"
							alt={t('configuration.community.logo')}
							src={updatedConfig.theme?.light?.logoSmall ?? '/img/logo-small.png'}
						/>
					</div>
					<FileDropzone
						name="icon"
						accept="image/*"
						allowMultiple={false}
						border="border-primary-500 border-dashed border-2"
						on:change={setLightThemeLogo}
					>
						{#snippet message()}
							{t('configuration.community.lightTheme.uploadLogo')}
						{/snippet}
					</FileDropzone>
				</div>
				<div class="">
					<div class="mb-2 flex flex-wrap gap-x-6 gap-y-2">
						<img
							class="h-20 object-contain"
							alt={t('configuration.community.logo')}
							src={updatedConfig.theme?.dark?.logoSmall ?? '/img/logo-small.png'}
						/>
					</div>
					<FileDropzone
						name="icon"
						accept="image/*"
						allowMultiple={false}
						border="border-primary-500 border-dashed border-2"
						on:change={setDarkThemeLogo}
					>
						{#snippet message()}
							{t('configuration.community.darkTheme.uploadLogo')}
						{/snippet}
					</FileDropzone>
				</div>
			</div>

			<p class="py-3 text-sm">{t('configuration.community.logoRequirements')}</p>
		</div>
	</Form>
	<Button
		variant="variant-ghost-primary"
		action={handleSubmit}
		disabled={equal(defaults, updatedConfig)}>Save</Button
	>
</div>
