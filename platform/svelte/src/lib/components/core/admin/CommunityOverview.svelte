<script lang="ts">
	import { type AdminServerStats } from '@openpeeps/common/types';
	import CommunityStatsCard from './CommunityStatsCard.svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		statsData: AdminServerStats;
	}
	let { statsData }: Props = $props();
</script>

<div class="mt-4 grid grid-cols-3 gap-4">
	<CommunityStatsCard
		title={t('admin.overview.totalProfiles')}
		current={statsData?.profiles.all.all}
		previous={(statsData?.profiles.all.all || 0) -
			(statsData?.profiles.all.week.currentPeriod || 0)}
		text={t('admin.overview.lastWeek')}
	/>
	<CommunityStatsCard
		title={t('admin.overview.activeProfiles')}
		current={statsData?.profiles.active.week.currentPeriod}
		previous={statsData?.profiles.active.week.lastPeriod}
		text={t('admin.overview.lastWeek')}
	/>
	<CommunityStatsCard
		title={t('admin.overview.recentInteractions')}
		previous={statsData?.interactions.all.week.lastPeriod}
		current={statsData?.interactions.all.week.currentPeriod}
		text={t('admin.overview.lastWeek')}
	/>
	<CommunityStatsCard
		title={t('admin.overview.allPosts')}
		previous={(statsData?.posts.all.all || 0) - (statsData?.posts.all.week.currentPeriod || 0)}
		current={statsData?.posts.all.all}
		text={t('admin.overview.lastWeek')}
	/>
	<CommunityStatsCard
		title={t('admin.overview.jamSessions')}
		previous={statsData?.jams.sessions.week.lastPeriod}
		current={statsData?.jams.sessions.all}
		text={t('admin.overview.lastWeek')}
	/>
	<CommunityStatsCard
		title={t('admin.overview.jamParticipants')}
		previous={statsData?.jams.participants.week.lastPeriod}
		current={statsData?.jams.participants.week.currentPeriod}
		text={t('admin.overview.lastWeek')}
	/>
</div>
