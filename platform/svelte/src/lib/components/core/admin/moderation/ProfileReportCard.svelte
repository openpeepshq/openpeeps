<script lang="ts">
	import { truncateText } from '@openpeeps/common/lib';
	import { ProfileCard } from '../..';
	import { Button } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';
	import { profileStore } from '$lib/api';
	import { goto } from '$app/navigation';
	import { AccessDeniedLoader } from '$lib/components/layout';

	interface Props {
		id: string;
		reportsCount: number;
	}
	const { t } = i18nContext();
	let { id, reportsCount = 0 }: Props = $props();
	let profileQuery = profileStore(id);
</script>

<AccessDeniedLoader queries={[$profileQuery]}>
	<div class="border border-b-2 border-t-2 p-3">
		{#if reportsCount != 0}
			<h6>{t('admin.moderation.report.title', { reportsCount: reportsCount })}</h6>
		{/if}
	</div>
	<div class="">
		{#if $profileQuery?.data}
			<ProfileCard profile={$profileQuery?.data} showAction={false} />
		{/if}
		<p>
			{truncateText($profileQuery?.data?.bio || t('profile.noBio'), 200)}
		</p>
	</div>
	<div class="flex items-center justify-between border border-b-2 border-t-2 p-1">
		{#if reportsCount === 0}
			<div class="bg-surface-500 rounded-full px-3 py-1 text-white">{t('admin.moderation.reportList.allResolvedBadge')}</div>
		{:else}
			<div class="bg-error-500 rounded-full px-3 py-1 text-white">
				{t('admin.moderation.report.unresolvedBadge', { reportsCount: reportsCount })}
			</div>
		{/if}

		<Button
			variant="variant-ringed-surface"
			action={async () => await goto(`/admin/moderation/reports/@${$profileQuery.data?.handle}`)}
			>{t('admin.moderation.reportList.seeReports')}</Button
		>
	</div>
</AccessDeniedLoader>
