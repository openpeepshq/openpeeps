<script lang="ts">
// @ts-nocheck
import { type ProfileData, profileDataSchema } from "@openpeeps/common/types";
import { Button, deepSet, Form, FormInput } from "@openpeeps/ui";
import { HeaderAvatarInput } from "$lib/components";
import { LocationInput } from "$lib/components/form";
import { i18nContext } from "$lib/components/i18n";
import { getServerInfo } from "$lib/server";

const { t } = i18nContext();

const serverInfo = getServerInfo();

interface Props {
	profileData?: ProfileData;
	handleSubmit: () => Promise<void>;
}

let {
	profileData = $bindable({
		displayName: "",
		handle: "",
		bio: "",
		location: { text: "" },
		website: "",
		fields: serverInfo.communityConfig.profiles?.additionalFields
			? serverInfo.communityConfig.profiles.additionalFields.map((field) => ({
				name: field.label,
				value: "",
				}))
			: undefined,
	}),
	handleSubmit,
}: Props = $props();


let valid = $state(false);
</script>

<Form bind:data={profileData} schema={profileDataSchema} bind:valid>
	<HeaderAvatarInput />
	<div class="flex flex-col gap-4 px-3 pb-6">
		<FormInput title={t('profile.form.displayName')} path={['displayName']} />
		<FormInput
			title={t('profile.form.handle')}
			path={['handle']}
			type="handle"
			placeholder={t('profile.form.handlePlaceholder')}
		/>
		<FormInput
			type="textarea"
			title={t('profile.form.bio')}
			path={['bio']}
			placeholder={t('profile.form.bioPlaceholder')}
		/>

		<LocationInput title={t('profile.form.location')} path={['location']} />

		{#each serverInfo.communityConfig.profiles?.additionalFields || [] as field, index (index)}
				<FormInput
					title={field.label}
					path={['fields', index, 'value']}
					type="text"
					placeholder={field.label}
					oninput={(e) =>
						deepSet(profileData, ['fields', index], {
							name: field.label,
							value: (e.currentTarget as HTMLInputElement)?.value
						})}
				/>
		{/each}
		<Button title={t('common.submit')} variant="variant-filled-primary" action={handleSubmit}>
			{t('common.submit')}
		</Button>
	</div>
</Form>
