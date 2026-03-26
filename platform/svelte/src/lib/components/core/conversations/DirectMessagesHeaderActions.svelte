<script lang="ts">
  import { Button, getModalManager } from '@openpeeps/ui';
  import { MessageSquarePlus } from 'lucide-svelte';
  import { CreateNewConversation } from '.';
  import { i18nContext } from '$lib/components/i18n';
  import { getCurrentProfile } from '$lib/auth';
  import { canCreatePost } from '@openpeeps/common/lib';

  const { t } = i18nContext();

  const modalManager = getModalManager();

  const me = getCurrentProfile();
</script>

{#if canCreatePost(me, 'note', 'direct')}
  <div class="flex items-center gap-5">
    <Button
      title={t('conversations.newMessage')}
      action={() => modalManager.show(CreateNewConversation)}
    >
      <MessageSquarePlus size={24} />
    </Button>
  </div>
{/if}
