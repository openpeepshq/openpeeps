<script lang="ts">
	import { Axis, Bars, Chart, Svg, Tooltip } from 'layerchart';
	import { ChevronDown } from 'lucide-svelte';
	import type { AdminServerStats } from '@openpeeps/common/types';
	import { scaleBand } from 'd3-scale';
	import { PopupMenu, PopupMenuButton } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	type TimePeriod = keyof AdminServerStats['timelines']['signups'];

	let selected: TimePeriod = $state('week');
	let title = $derived(t(`admin.signupChart.${selected}`));

	const menuItems: TimePeriod[] = ['week', 'fourWeeks', 'fourMonths'];

	interface Props {
		serverStats: AdminServerStats;
	}

	const { serverStats }: Props = $props();

	const signupData = $derived(serverStats.timelines.signups[selected]);
</script>

<div class="rounded border p-4 py-10">
	<div class="h-128">
		<Chart
			data={signupData}
			x="name"
			xScale={scaleBand().padding(0.4)}
			y="count"
			yDomain={[0, Math.max(...signupData.map((d) => d.count)) + 1 || null]}
			yNice
			padding={{ left: 16, bottom: 50, right: 24, top: -18 }}
			tooltip={{ mode: 'band' }}
			let:height
			let:padding
		>
			<Svg>
				<text
					x={-height / 2}
					y={20}
					transform="rotate(-90)"
					text-anchor="middle"
					class="fill-current text-sm font-medium"
				>
					{t('admin.signupChart.numberOfSignups')}
				</text>
				<Axis placement="right" grid rule format={(d) => (Number.isInteger(d) ? d : '')} />
				<Axis placement="bottom" format={(d) => JSON.stringify(d)} rule />
				<Bars radius={4} strokeWidth={1} class="fill-primary" />
			</Svg>

			<Tooltip.Root
				x="data"
				y="data"
				yOffset={2}
				anchor="bottom"
				contained={false}
				class="text-primary border-primary bg-surface-300 whitespace-nowrap rounded border px-2 py-[2px] text-[10px] font-semibold"
				let:data
			>
				{data.count}
			</Tooltip.Root>

			<Tooltip.Root
				x="data"
				y={height + padding.top + 2}
				anchor="top"
				contained={false}
				class="text-primary border-primary bg-surface-300 whitespace-nowrap rounded border px-2 py-[2px] text-[10px] font-semibold"
				let:data
			>
				{data.name}
			</Tooltip.Root>
		</Chart>
	</div>
	<div class="flex flex-row items-center justify-start">
		<h2 class="text-base capitalize">{title}</h2>
		<PopupMenu icon={ChevronDown} iconSize={24}>
			{#each menuItems as item (item)}
				{@const title = t(`admin.signupChart.${item}`)}
				<PopupMenuButton {title} text={title} action={() => (selected = item)} />
			{/each}
		</PopupMenu>
	</div>
</div>
