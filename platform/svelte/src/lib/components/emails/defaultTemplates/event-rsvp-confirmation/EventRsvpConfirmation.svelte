<script lang="ts">
	import type { EmailGlobals } from '@openpeeps/common/types';
	import { Button, Heading, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import type { EventRsvpConfirmationLocals } from './types';

	interface Props {
		globals: EmailGlobals;
		locals: EventRsvpConfirmationLocals;
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;

	const formatWhen = (
		start: string,
		end?: string | null,
		allDay?: boolean,
	): string => {
		const dateOptions: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		};
		const dateTimeOptions: Intl.DateTimeFormatOptions = {
			...dateOptions,
			hour: '2-digit',
			minute: '2-digit',
		};
		const options = allDay ? dateOptions : dateTimeOptions;
		const startLabel = new Date(start).toLocaleString(undefined, options);
		if (!end) {
			return startLabel;
		}
		const endLabel = new Date(end).toLocaleString(undefined, options);
		return `${startLabel} – ${endLabel}`;
	};

	const heading =
		locals.response === 'yes'
			? t('emails.eventRsvp.headingYes', { eventName: locals.eventName })
			: t('emails.eventRsvp.headingMaybe', { eventName: locals.eventName });

	const when = formatWhen(locals.start, locals.end, locals.allDay);
</script>

<BaseEmailLayout
	{globals}
	previewText={heading}
	showLogo={true}
	showGreeting={false}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>{heading}</Heading>

	<Text style={emailStyles.paragraph}>{t('emails.eventRsvp.intro')}</Text>

	<Text style={emailStyles.paragraph}>
		<strong>{t('emails.eventRsvp.when')}:</strong> {when}
	</Text>

	{#if locals.location}
		<Text style={emailStyles.paragraph}>
			<strong>{t('emails.eventRsvp.where')}:</strong> {locals.location}
		</Text>
	{/if}

	<Section style={emailStyles.ctaContainer}>
		<Button href={locals.eventUrl} style={emailStyles.button}>
			{t('emails.eventRsvp.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
