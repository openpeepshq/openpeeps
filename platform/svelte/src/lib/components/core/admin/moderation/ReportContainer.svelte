<script lang="ts">
	import { Button, getModalManager, UpdatingDate } from '@openpeeps/ui';
	import { ProfileCard } from '../../profile';
	import { OpenpeepsMarkdown } from '../../markdown';
	import type { PublicPost, PublicProfile, ReportWithMeta } from '@openpeeps/common';
	import { FeedPostContent } from '../../post';
	import { i18nContext } from '$lib/components/i18n';
	import { goto } from '$app/navigation';
	import CloseReportOptionsModal from './modals/CloseReportOptionsModal.svelte';

	interface Props {
		report?: ReportWithMeta;
	}
	const { t } = i18nContext();
	const modalManager = getModalManager();

	let { report = undefined }: Props = $props();
	let isProfileReportType = $derived(report?.reportedPosts.length === 0);

	let reporterProfile = $derived(report?.reporterProfile);
	let postData = $derived(
		(report?.reportedPosts ?? []).length > 0
			? (report?.reportedPosts?.[0] as PublicPost)
			: undefined
	);
</script>

<div class="p-2">
	<UpdatingDate date={report?.createdAt as string} />
	<ProfileCard profile={reporterProfile as PublicProfile} showAction={false} />
	<OpenpeepsMarkdown source={report?.comment || report?.category} />
	<div class="h-[2px] w-full bg-gray-200"></div>
	{#if !isProfileReportType}
		<div class="mt-4 flex items-center justify-between py-2">
			<h3>{t('admin.moderation.reportList.postHeading')}</h3>
			<Button action={async () => await goto(`/posts/${postData?.id}`)}>{t('admin.moderation.reportList.goToPost')}</Button>
		</div>
		<div class="mt-4 pb-4">
			<FeedPostContent post={postData as PublicPost} />
		</div>
	{/if}
	<div class="h-[2px] w-full bg-gray-200"></div>
	<div class="flex items-center justify-between py-2">
		{#if report?.resolution}
			<span class="bg-surface-500 rounded-full px-3 py-1 text-white">
				{report?.resolution}
			</span>
		{:else}
			<span class="bg-error-500 rounded-full px-3 py-1 text-white"> {t('admin.moderation.reportList.unresolvedBadge')} </span>
		{/if}
		<div class="flex items-center gap-x-4">
			<!-- <Button variant="variant-ringed-surface">Add note</Button> -->
			{#if !report?.resolution}
				<Button
					variant="variant-filled-surface"
					action={() => {
						modalManager.show(CloseReportOptionsModal, {
							report: report
						});
					}}>{t('admin.moderation.reportList.closeReport')}</Button
				>
			{/if}
		</div>
	</div>
	<div class="h-[2px] w-full bg-gray-200"></div>
</div>
