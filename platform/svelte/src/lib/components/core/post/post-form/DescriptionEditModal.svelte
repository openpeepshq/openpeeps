<script lang="ts">
	import {
		Button,
		getModalManager,
		ModalFooter,
		ModalHeader,
		ModalWrapper,
		Label,
		Textarea
	} from '@openpeeps/ui';
	import type { MediaAttachmentData } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const modalManager = getModalManager();

	interface Props {
		attachment: MediaAttachmentData;
		close?: () => void | Promise<void>;
		setResponse?: (attachment: MediaAttachmentData) => void | Promise<void>;
	}

	let { attachment, close = () => {}, setResponse = () => {} }: Props = $props();

	const saveAndClose = async () => {
		setResponse(attachment);
		modalManager.close();
	};
</script>

<ModalWrapper>
	<ModalHeader title={t('form.uploadEditModal.description.title')} />
	<div class="flex w-full p-4">
		<Label title={t('form.uploadEditModal.description.altText')} class="w-full">
			<Textarea
				bind:value={attachment.description}
				placeholder={t('form.uploadEditModal.description.placeholder')}
			/>
		</Label>
	</div>
	<ModalFooter extraClassNames="flex justify-end w-full">
		<Button title={t('common.back')} variant="variant-ringed-primary" action={close}
			>{t('common.back')}</Button
		>
		<Button title={t('common.done')} variant="variant-filled-primary" action={saveAndClose}
			>{t('common.done')}</Button
		>
	</ModalFooter>
</ModalWrapper>
