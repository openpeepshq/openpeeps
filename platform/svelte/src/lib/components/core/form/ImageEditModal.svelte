<script lang="ts">
	import Cropper from 'svelte-easy-crop';
	import { Crop } from 'lucide-svelte';
	import { i18nContext } from '$lib/components/i18n';

	import {
		Button,
		getModalManager,
		ModalFooter,
		ModalHeader,
		ModalWrapper,
		Label,
		Textarea,
		Badge
	} from '@openpeeps/ui';
	import {
		createImage,
		getCroppedImg,
		getZoomedImage,
		type ImageSource
	} from '$lib/utils/canvasUtils';
	import { uploadMediaFileMutation } from '$lib/api';
	import type { MediaAttachmentData } from '@openpeeps/common/types';

	const { t } = i18nContext();
	const uploadMediaFile = uploadMediaFileMutation();
	const modalManager = getModalManager();

	const aspectRatioToNumber = (aspectRatio: string): number => {
		const [w, h] = aspectRatio.split(':').map(Number);
		return w / h;
	};

	let cropping = $state(false);

	let forceCropping = false;

	interface Props {
		attachment: MediaAttachmentData;
		minWidth?: number;
		minHeight?: number;
		maxWidth?: number;
		maxHeight?: number;
		maxSizeKb?: number;
		aspectRatio?: string;
		cropShape?: 'rect' | 'round';
		showAltInput?: boolean;
		showSelectAspectRatio?: boolean;
		targetDimensions?: { width: number; height: number } | undefined;
		availableAspectRatios?: string[];
		close?: () => void | Promise<void>;
		setResponse?: (attachment: MediaAttachmentData) => void | Promise<void>;
	}

	let {
		attachment,
		minWidth = 0,
		minHeight = 0,
		maxWidth = Number.MAX_SAFE_INTEGER,
		maxHeight = Number.MAX_SAFE_INTEGER,
		maxSizeKb = 512,
		aspectRatio = '4:3',
		cropShape = 'rect',
		showAltInput = false,
		showSelectAspectRatio = false,
		targetDimensions = undefined,
		availableAspectRatios = ['1:1', '4:3', '16:9', '3:4', '9:16'],
		close = () => {},
		setResponse = () => {}
	}: Props = $props();

	if (targetDimensions) {
		minWidth = targetDimensions.width;
		minHeight = targetDimensions.height;
		maxWidth = targetDimensions.width;
		maxHeight = targetDimensions.height;
		aspectRatio = `${targetDimensions.width}:${targetDimensions.height}`;
		showSelectAspectRatio = false;
		forceCropping = true;
	}

	if (forceCropping) {
		cropping = true;
	}

	let aspect = $derived(aspectRatioToNumber(aspectRatio));

	let cropResult: { x: number; y: number; width: number; height: number } | undefined =
		$state(undefined);

	const cropIfNeeded = async (imageSource: ImageSource) =>
		cropping && cropResult ? getCroppedImg(imageSource, cropResult) : imageSource;

	const scaleUpXIfNeeded = async (imageSource: ImageSource) => {
		const image = await createImage(imageSource);
		return minWidth > image.width
			? await getZoomedImage(imageSource, minWidth / image.width)
			: imageSource;
	};

	const scaleUpYIfNeeded = async (imageSource: ImageSource) => {
		const image = await createImage(imageSource);
		return minHeight > image.height
			? await getZoomedImage(imageSource, minHeight / image.height)
			: imageSource;
	};

	const scaleDownXIfNeeded = async (imageSource: ImageSource) => {
		const image = await createImage(imageSource);
		return maxWidth < image.width
			? await getZoomedImage(imageSource, maxWidth / image.width)
			: imageSource;
	};

	const scaleDownYIfNeeded = async (imageSource: ImageSource) => {
		const image = await createImage(imageSource);
		return maxHeight < image.height
			? await getZoomedImage(imageSource, maxHeight / image.height)
			: imageSource;
	};

	const reduceFileSizeIfNeeded = async (imageSource: ImageSource) => {
		const blob =
			typeof imageSource === 'string'
				? await fetch(imageSource).then((res) => res.blob())
				: imageSource;

		const scale =
			blob.size > maxSizeKb * 1024 ? Math.sqrt((maxSizeKb * 1024) / blob.size) * 0.9 : 1;
		return getZoomedImage(imageSource, scale);
	};

	const saveAndClose = async () => {
		const file = await cropIfNeeded(attachment.url)
			.then(scaleUpXIfNeeded)
			.then(scaleUpYIfNeeded)
			.then(scaleDownXIfNeeded)
			.then(scaleDownYIfNeeded)
			.then(reduceFileSizeIfNeeded);
		if (file) {
			setResponse(
				await uploadMediaFile({
					file,
					description: attachment.description,
					usage: attachment.meta.usage || 'unknown'
				})
			);
		}

		modalManager.close();
	};
</script>

<ModalWrapper>
	<ModalHeader title={t('form.imageEditModal.title')} />
	<div class="flex w-full gap-0 p-0">
		<div class="{showAltInput || showSelectAspectRatio ? 'w-1/2' : 'w-full'} relative p-4">
			{#if cropping}
				<div class="relative h-52 w-full">
					<Cropper
						image={attachment.url}
						{aspect}
						crop={{ x: 0, y: 0 }}
						on:cropcomplete={({ detail: { pixels } }) => (cropResult = pixels)}
						{cropShape}
					/>
				</div>
			{:else}
				<div
					class="relative h-52 w-full border-surface-300 bg-contain bg-center bg-no-repeat"
					style="background-image: url({attachment.url})"
				>
					<button
						title={t('form.imageEditModal.crop')}
						class="variant-glass-surface absolute bottom-0 right-0"
						onclick={() => (cropping = true)}
					>
						<Crop class="size-6" />
					</button>
				</div>
			{/if}
		</div>
		{#if showSelectAspectRatio || showAltInput}
			<div class="w-1/2 p-4">
				{#if showSelectAspectRatio}
					<div class="text-lg font-medium">{t('form.imageEditModal.cropping')}</div>
					<div class="mb-3 flex flex-wrap gap-x-2 gap-y-1">
						<button title={t('common.none')} onclick={() => (cropping = false)}>
							<Badge
								status="none"
								variant={cropping ? 'variant-ghost-primary' : 'variant-filled-primary'}
							/>
						</button>
						{#each availableAspectRatios as a (a)}
							<button
								title={a}
								onclick={() => {
									cropping = true;
									aspectRatio = a;
								}}
							>
								<Badge
									status={a}
									variant={cropping && a === aspectRatio
										? 'variant-filled-primary'
										: 'variant-ghost-primary'}
								/>
							</button>
						{/each}
					</div>
				{/if}
				{#if showAltInput}
					<Label title={t('form.imageEditModal.altText')}>
						<Textarea
							bind:value={attachment.description}
							placeholder={t('form.imageEditModal.placeholder')}
						/>
					</Label>
				{/if}
			</div>
		{/if}
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
