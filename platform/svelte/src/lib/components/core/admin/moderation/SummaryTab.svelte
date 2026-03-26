<script lang="ts">
	import ProfileReportCard from './ProfileReportCard.svelte';
	import { i18nContext } from '$lib/components/i18n';
	import type { ReportWithMeta } from '@openpeeps/common';

	interface Props {
		reports: ReportWithMeta[];
	}
	const { t } = i18nContext();
	let { reports = [] }: Props = $props();

	const groupedReports = (() => {
		const map = new Map<string, ReportWithMeta[]>();

		for (const report of reports) {
			const key = String(report.reportedProfile.id);
			if (!map.has(key)) {
				map.set(key, []);
			}
			map.get(key)!.push(report);
		}

		return Array.from(map.entries()).map(([reportedProfileId, grouped]) => ({
			reportedProfileId,
			reports: grouped
		}));
	})();
</script>

<div>
	{#each groupedReports as groupedReport (groupedReport.reportedProfileId)}
		<ProfileReportCard
			id={groupedReport.reportedProfileId}
			reportsCount={groupedReport.reports.filter((r) => r.resolution === undefined).length}
		/>
	{/each}
</div>
