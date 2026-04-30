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
  import { postViewCounter } from '$lib/utils';

  const { t } = i18nContext();

  interface Props {
    previous: PublicPost | undefined;
    message: PublicPost;
    multipleParticipants?: boolean;
  }

  let { previous, message, multipleParticipants = true }: Props = $props();

  const participantChanges = audienceDiff(previous, message);
  let myMessage = $derived(message.profile.id === $me?.id);
  let isUnseen = $derived(!myMessage && message.seen === false);
</script>

{#if !previous}
  {#if !message.inReplyToId}
    <div class="mt-2 w-full text-center text-sm">
      {t('conversations.messageInThread.startedBy', {
        name: profileName(message.profile),
      })}
    </div>
  {:else}
    <div class="mt-2 w-full text-center text-sm">
      {t('conversations.messageInThread.addedBy', {
        name: profileName(message.profile),
      })}
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
    {t('conversations.messageInThread.left', {
      name: profileName(message.profile),
    })}
  </div>
{/if}

{#if previous && participantChanges.added.length}
  <div>
    <ParticipantsCard participants={participantChanges.added} navigate />
    {t('conversations.messageInThread.addedBy', {
      name: profileName(message.profile),
    })}
  </div>
{/if}

{#if participantChanges.removed.length}
  <div>
    <ParticipantsCard participants={participantChanges.removed} navigate />
    {t('conversations.messageInThread.removedBy', {
      name: profileName(message.profile),
    })}
  </div>
{/if}

<div class="relative flex rounded-md" use:postViewCounter={message.id}>
  {#if isUnseen}
    <span
      class="bg-primary-500 absolute right-2 top-2 h-2.5 w-2.5 rounded-full"
      aria-label="Unseen message"
      title="Unseen message"
    ></span>
  {/if}
  {#if !myMessage && multipleParticipants}
    <Avatar containerClass="mt-6 mr-2" profile={message.profile} navigate />
  {/if}
  <Message {message} />
</div>

<div
  class="mt-2 w-full text-sm
{message.profile.id === $me?.id ? 'text-right' : 'text-left'}
"
>
  {#if multipleParticipants && !myMessage}
    {profileName(message.profile)} &middot;
  {/if}
  <UpdatingDate date={message.createdAt} />
</div>
