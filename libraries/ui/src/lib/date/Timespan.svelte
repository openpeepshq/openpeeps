<script lang="ts">
	interface Props {
		start: string;
		end?: string;
		timeZone?: string;
		truncate?: number;
	}

	let {
		start,
		end,
		truncate,
		timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
	}: Props = $props();

	const userTimezone = $derived(typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone :'UTC')
	

	const effectiveTimeZone = $derived(timeZone || userTimezone)
	const startDate = $derived(new Date(start));
	const endDate = $derived(end && new Date(end));

	const startDateString = $derived(
		startDate.toLocaleDateString(undefined, { timeZone: effectiveTimeZone, dateStyle: 'full' })
	);
	const startTimeString = $derived(
		startDate.toLocaleTimeString(undefined, { timeZone: effectiveTimeZone, timeStyle: 'short' })
	);

	const endDateString = $derived(
		endDate && endDate.toLocaleDateString(undefined, { timeZone: effectiveTimeZone, dateStyle: 'full' })
	);
	const endTimeString = $derived(
		endDate && endDate.toLocaleTimeString(undefined, { timeZone:effectiveTimeZone, timeStyle: 'short' })
	);

	const isSameDay = $derived(startDateString === endDateString);

	const formattedTimespan = $derived(
		endDateString
			? isSameDay
				? `${startDateString}, ${startTimeString} - ${endTimeString}`
				: `${startDateString}, ${startTimeString} - ${endDateString}, ${endTimeString}`
			: `${startDateString}, ${startTimeString}`
	);

	const truncateText = (v: string) => (truncate ? `${v.substring(0, truncate)}...` : v);
</script>

{truncateText(formattedTimespan)}
