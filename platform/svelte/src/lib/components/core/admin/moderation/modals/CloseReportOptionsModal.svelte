<script lang="ts">
	// @ts-nocheck
	import { i18nContext } from '$lib/components/i18n';
	import type { PublicPost, PublicReport } from '@openpeeps/common';
	import { Button, getModalManager, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import DeleteReportedPostModal from './DeleteReportedPostModal.svelte';
	import DeleteProfileModal from './DeleteProfileModal.svelte';
	import CloseReportModal from './CloseReportModal.svelte';
	import { resolveReportMutation } from '$lib/api';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';

	interface Props {
		report?: PublicReport;
		deleteCallback?: (() => void) | undefined;
	}

	let { report, deleteCallback = undefined }: Props = $props();
	const { t } = i18nContext();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	let isProfileReportType = $derived(report?.reportedPosts.length === 0);

	let postData = $derived(
		(report?.reportedPosts ?? []).length > 0
			? (report?.reportedPosts?.[0] as PublicPost)
			: undefined
	);

	const resolveReport = resolveReportMutation({
		reportId: report?.id as string
	});

	const handleResolveReport = async () =>
		resolveReport({ resolution: 'remove' })
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.closeReport.success')
					})
				);
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.closeReport.error')
					})
				);
			});
</script>

<ModalWrapper extraClassNames="relative">
	<ModalHeader title={t('admin.moderation.report.closeOptions.title')} />
	<article class="  m-4 h-full pb-3">
		<p class="my-4">{t('admin.moderation.report.closeOptions.description')}</p>

		{#if !isProfileReportType}
			<Button
				title={t('admin.moderation.report.closeOptions.deletePost.button')}
				action={() => {
					modalManager.show(DeleteReportedPostModal, {
						postId: postData?.id as string,
						deleteCallback: handleResolveReport
					});
				}}
				variant="variant-filled-error"
			>
				{t('admin.moderation.report.closeOptions.deletePost.button')}
			</Button>
			<p>
				{t('admin.moderation.report.closeOptions.deletePost.description')}
			</p>
			<div class="my-4 h-[2px] w-full bg-gray-200"></div>
		{/if}
		<Button
			title={t('admin.moderation.report.closeOptions.deleteProfile.button')}
			action={() => {
				modalManager.show(DeleteProfileModal, {
					profileId: report?.reportedProfile?.id as string,
					deleteCallback: handleResolveReport
				});
			}}
			variant={isProfileReportType ? 'variant-filled-error' : 'variant-ringed-error'}
		>
			{t('admin.moderation.report.closeOptions.deleteProfile.button')}
		</Button>
		<p>
			{t('admin.moderation.report.closeOptions.deleteProfile.description')}
		</p>
		<div class="my-4 h-[2px] w-full bg-gray-200"></div>
		<Button
			title={t('admin.moderation.report.closeOptions.closeReport.button')}
			action={() => {
				modalManager.show(CloseReportModal, {
					report: report as PublicReport
				});
			}}
			variant="variant-ringed-primary"
		>
			{t('admin.moderation.report.closeOptions.closeReport.button')}
		</Button>
		<p>
			{t('admin.moderation.report.closeOptions.closeReport.description')}
		</p>
	</article>
</ModalWrapper>
