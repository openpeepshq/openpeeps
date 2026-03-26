<script lang="ts">
  import { truncateText, type JamEvent } from '@openpeeps/common';
  import { UpdatingDate } from '@openpeeps/ui';
  import { OpenpeepsMarkdown } from '../../markdown';
  import { Avatar } from '../../profile';
  import { profileStore } from '$lib/api';
  import { AccessDeniedLoader } from '$lib/components/layout';

  interface JamChatMessageProps {
    message: JamEvent;
  }

  const attendance = ['join', 'leave', 'start', 'close'];

  const attendanceMap = {
    join: 'joined',
    leave: 'left',
    start: 'started',
    close: 'closed',
  };

  let { message }: JamChatMessageProps = $props();

  let profileQuery = profileStore(message.profileId);
</script>

<AccessDeniedLoader queries={[$profileQuery]}>
  {#if $profileQuery.isSuccess}
    {#if message.type === 'message'}
      <div class="flex items-center justify-between">
        <div class="grid w-full grid-cols-5 gap-x-1">
          <div class="col-span-1 flex w-full justify-center">
            <Avatar profile={$profileQuery?.data} borderless size={2} />
          </div>
          <div class="col-span-4 w-full">
            <div class="flex w-full gap-x-1">
              <h4 class="hidden md:flex">
                {truncateText(
                  $profileQuery?.data?.displayName ||
                    `@${$profileQuery?.data?.handle}`,
                  20,
                )}
              </h4>
              <h4 class="flex md:hidden">
                {truncateText(
                  $profileQuery?.data?.displayName ||
                    `@${$profileQuery?.data?.handle}`,
                  10,
                )}
              </h4>
              <p class="break-words text-sm text-neutral-500">
                <UpdatingDate date={message?.createdAt} />
              </p>
            </div>
            <OpenpeepsMarkdown source={message.content} newTab />
          </div>
        </div>
      </div>
    {:else if attendance.includes(message.type)}
      <div class="flex items-center justify-center">
        <span class="text-center text-sm text-neutral-500">
          {$profileQuery?.data?.displayName ||
            `@${$profileQuery?.data?.handle}`}{' '}
          {attendanceMap[message.type as keyof typeof attendanceMap]} the jam
          <UpdatingDate date={message?.createdAt} />
        </span>
      </div>
    {/if}
  {/if}
</AccessDeniedLoader>
