<script lang="ts">
	import { Button, Form, ModalFooter, ModalHeader, ModalWrapper, Textarea } from '@openpeeps/ui';
	import { getModalManager } from '@openpeeps/ui';
	import type { PublicPost, Profile } from '@openpeeps/common/types';
	import { toast } from '$lib/utils/toast';
	import { createReportMutation } from '$lib/api';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { type ReportCreationData, reportCreationDataSchema } from '@openpeeps/common/types';
	import { getServerInfo } from '$lib/server';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		reportType: 'profile' | 'post';
		profile?: Profile | undefined;
		post?: PublicPost | undefined;
		reportCallback?: (() => void) | undefined;
	}

	const modalManager = getModalManager();
	const toastStore = getToastStore();
	const reportPostMutation = createReportMutation();
	let currentStep = $state(1);
	const { t } = i18nContext();

	let { post, profile, reportType, reportCallback }: Props = $props();

	const reportCategories: {
		value: 'spam' | 'other' | 'violation';
		label: string;
	}[] = [
		{
			value: 'spam',
			label: t(`reports.categories.spamDescription`)
		},
		{
			value: 'violation',
			label: t(`reports.categories.violationDescription`)
		},
		{
			value: 'other',
			label: t(`reports.categories.otherDescription`)
		}
	];

	let reportData = $state<ReportCreationData>({
		report: {
			comment: '',
			category: 'spam',
			forward: false
		},
		profileId: '',
		postIds: []
	});

	const {
		communityConfig: {
			info: { name }
		}
	} = getServerInfo();

	const handleReportPost = async () => {
		await reportPostMutation({
			postIds: post ? [post.id] : [],
			profileId: profile ? profile.id : (post?.profile.id as string),
			report: {
				comment: reportData.report.comment,
				category: reportData.report.category,
				forward: reportData.report.forward
			}
		});
		toastStore.trigger(
			toast({
				message: t('reports.create.reportSuccess', {
					name: name
				}),
				background: 'variant-filled-success'
			})
		);

		reportCallback?.();

		modalManager.close();
	};

	let valid = $state(false);
</script>

<ModalWrapper extraClassNames="relative">
	<ModalHeader
		title={reportType === 'profile'
			? t('reports.create.profile.title', { handle: `@${profile?.handle}` })
			: t('reports.create.post.title')}
	/>
	{#if currentStep === 1}
		<Form bind:data={reportData} schema={reportCreationDataSchema} bind:valid>
			<article class="  m-4 h-full pb-3">
				<p class="my-4">
					{t(`reports.create.${reportType}.description`)}
				</p>

				{#each reportCategories as category}
					<label class="my-2 flex items-center gap-2">
						<input
							class="radio"
							type="radio"
							name="category"
							value={category.value}
							id={category.value}
							checked={reportData.report.category === category.value}
							oninput={() => (reportData.report.category = category.value)}
						/>
						<span>{category.label}</span>
					</label>
				{/each}

				<div class="flex flex-col gap-4 px-3">
					<Textarea
						title={t(`reports.create.${reportType}.anythingElse`)}
						bind:value={reportData.report.comment}
					/>
				</div>
			</article>
		</Form>
		<ModalFooter>
			<Button
				title={t('common.cancel')}
				action={() => modalManager.close()}
				variant="variant-ringed-surface"
				class="w-full"
			>
				{t('common.cancel')}
			</Button>
			<Button
				title={t(`reports.create.${reportType}.continue`)}
				action={() => (currentStep = 2)}
				variant="variant-filled-primary"
				class="w-full">{t(`reports.create.${reportType}.continue`)}</Button
			>
		</ModalFooter>
	{:else}
		<article class="m-4 h-full pb-3">
			<h3 class="my-2 font-semibold">
				{t(`reports.create.${reportType}.confirmMessageHeading`, {
					handle: profile?.handle || post?.profile.handle
				})}
			</h3>
			{#if reportType === 'profile'}
				<p class="my-2">
					{t(`reports.create.profile.confirmMessageDescription`, {
						handle: profile?.handle
					})}
				</p>
			{/if}
		</article>
		<ModalFooter>
			<Button
				title={t('reports.create.back')}
				action={() => (currentStep = 1)}
				variant="variant-ringed-surface"
				class="w-full"
			>
				{t('reports.create.back')}
			</Button>
			<Button
				title={t(`reports.create.sendReport`)}
				action={handleReportPost}
				variant="variant-filled-error"
				class="w-full"
			>
				{t(`reports.create.sendReport`)}
			</Button>
		</ModalFooter>
	{/if}
</ModalWrapper>
