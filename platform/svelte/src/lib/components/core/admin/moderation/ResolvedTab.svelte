<script lang="ts">
	import { i18nContext } from '$lib/components/i18n';
	import type { ReportWithMeta } from '@openpeeps/common';
	import { ReportContainer } from '.';

	interface Props {
		reports: ReportWithMeta[];
	}

	let { reports = [] }: Props = $props();
	const { t } = i18nContext();

	const resolvedReports = $derived(reports.filter((r) => r.resolution != undefined));
</script>

{#each resolvedReports ?? [] as report}
	<ReportContainer {report} />
{/each}
