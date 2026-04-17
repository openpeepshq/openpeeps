<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { MessageSquareText, Dot } from 'lucide-svelte';
  import { getDrawerContext, getChatContext } from '../context';
  import { uuidv7 } from 'uuidv7';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
  const song = '/audio/notification.wav';
  const notification = new Audio(song);
  notification.volume = 0.3;

  const drawerContext = getDrawerContext();
  const { sessionEvents } = getChatContext();

  let lastSeenMessageId = $state(uuidv7());
  let hasNewMessages = $state(false);
  sessionEvents.subscribe((messages) => {
    const lastMessage = messages?.slice(-1)[0];
    if (lastMessage?.type !== 'message') {
      return;
    }
    if ($drawerContext === 'chat') {
      lastSeenMessageId = lastMessage.id;
    } else if (lastMessage.id > lastSeenMessageId) {
      notification.play();
      hasNewMessages = true;
    }
  });
</script>

<Button
  title={t('jams.chat.openEveryoneTitle')}
  action={() => {
    if ($drawerContext === 'chat') {
      drawerContext.set(undefined);
    } else {
      drawerContext.set('chat');
      hasNewMessages = false;
    }
  }}
  variant={$drawerContext === 'chat'
    ? 'variant-soft-primary'
    : 'variant-soft-surface'}
  class="relative size-10 p-1"
>
  <MessageSquareText />
  {#if hasNewMessages && $drawerContext !== 'chat'}
    <Dot
      size={13}
      class="bg-error-500 text-error-500 absolute right-0 top-0 rounded-full"
    />
  {/if}
</Button>
