<script lang="ts">
  import { Button, Timespan } from '@openpeeps/ui';
  import type { Event, PublicPost } from '@openpeeps/common/types';
  import { page } from '$app/state';
  import ParticipantsCard from '../../pieces/ParticipantsCard.svelte';
  import { jamStateStore } from '$lib/api';
  import { getCurrentProfile } from '$lib/auth';
  import { getJamUrl } from '@openpeeps/common/lib';
  import EventLocation from '../../pieces/EventLocation.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import ProfileEventRelationship from './ProfileEventRelationship.svelte';
  import { AccessDeniedLoader } from '$lib/components/layout';
  import { postViewCounter } from '$lib/utils';

  const { t } = i18nContext();

  interface Props {
    post: PublicPost;
  }

  const me = getCurrentProfile();

  const { post }: Props = $props();
  const event = $derived(post.data as Event);
  const jam = $derived(event?.jam);

  const jamLink = getJamUrl(post.id, page.url.origin);

  const jamStateQuery = $derived(jam ? jamStateStore(post.id) : undefined);
</script>

<div class="hover:bg-surface-100 overflow-hidden rounded-md px-2 pt-2" use:postViewCounter={post.id}>
  <a href="{page.url.origin}/posts/{post.id}" class="flex flex-col gap-2">
    <span class="h-32">
      <img
        src={event.image || '/img/event-default.png'}
        alt={event?.name || event?.content}
        class="h-full w-full rounded-md object-cover"
      />
    </span>
    <span class="flex flex-col gap-1">
      <div class="truncate text-sm">
        <Timespan {...event} />
      </div>
      <h3 class="truncate font-semibold">{event?.name || event?.content}</h3>
      <div class="flex flex-col gap-1">
        <div class="flex flex-row gap-x-2">
          <EventLocation {post} truncate={true} />
          <ProfileEventRelationship {post} />
        </div>
        {#if jam && me}
          {@const jamState = $jamStateQuery?.data}
          {@const attendeesLength = jamState?.participants.length ?? 0}
          <AccessDeniedLoader queries={[$jamStateQuery!]}>
            <span
              class="flex items-center justify-start {attendeesLength > 1
                ? 'gap-5'
                : 'gap-2'} 
						text-surface-600 text-xs {attendeesLength > 0 ? '-mt-4' : ''}"
            >
              {#if jamState?.active}
                <span class="-ml-5 w-12">
                  <ParticipantsCard {jamState} />
                </span>
                <span>
                  {attendeesLength}
                  {attendeesLength === 1 ? 'attendee' : 'attendees'}
                </span>
                <span>
                  <Button
                    action={jamLink}
                    variant="variant-filled-primary"
                    compact
                  >
                    {t('jam.join.submit')}
                  </Button>
                </span>
              {:else if jam.moderators.includes(me.id)}
                <span>
                  <Button action={jamLink} variant="variant-filled-primary">
                    {t('jam.start.submit')}
                  </Button>
                </span>
              {/if}
            </span>
          </AccessDeniedLoader>
        {/if}
      </div>
    </span>
  </a>
</div>
