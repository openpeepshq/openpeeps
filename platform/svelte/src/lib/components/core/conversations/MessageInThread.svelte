<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import { me } from '$lib/api';
	import { inAudience, audienceDiff } from './helpers';
	import { Avatar } from '../profile';
	import { profileName } from '@openpeeps/common/lib';
	import { ParticipantsCard } from '$lib/components';
	import { Message } from '.';
	import { UpdatingDate } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		previous: PublicPost | undefined;
		message: PublicPost;
		multipleParticipants?: boolean;
	}

	let { previous, message, multipleParticipants = true }: Props = $props();

	const participantChanges = audienceDiff(previous, message);
</script>

{#if !previous}
	{#if !message.inReplyToId}
		<div class="mt-2 w-full text-center text-sm">
			{t('conversations.messageInThread.startedBy', { name: profileName(message.profile) })}
		</div>
	{:else}
		<div class="mt-2 w-full text-center text-sm">
			{t('conversations.messageInThread.addedBy', { name: profileName(message.profile) })}
		</div>
	{/if}
{/if}

{#if previous && inAudience(previous, message.profile) && !inAudience(message, message.profile)}
	<div>
		<Avatar
			profile={message.profile}
			borderless
			containerClass="inline-block"
			size={2.5}
			navigate
		/>
		{t('conversations.messageInThread.left', { name: profileName(message.profile) })}
	</div>
{/if}

{#if previous && participantChanges.added.length}
	<div>
		<ParticipantsCard participants={participantChanges.added} navigate />
		{t('conversations.messageInThread.addedBy', { name: profileName(message.profile) })}
	</div>
{/if}

{#if participantChanges.removed.length}
	<div>
		<ParticipantsCard participants={participantChanges.removed} navigate />
		{t('conversations.messageInThread.removedBy', { name: profileName(message.profile) })}
	</div>
{/if}

<div class="flex">
	{#if message.profile.id !== $me?.id && multipleParticipants}
		<Avatar containerClass="mt-6 mr-2" profile={message.profile} navigate />
	{/if}
	<Message {message} />
</div>

<div
	class="mt-2 w-full text-sm
{message.profile.id === $me?.id ? 'text-right' : 'text-left'}
"
>
	{#if multipleParticipants && message.profile.id !== $me?.id}
		{profileName(message.profile)} &middot;
	{/if}
	<UpdatingDate date={message.createdAt} />
</div>
