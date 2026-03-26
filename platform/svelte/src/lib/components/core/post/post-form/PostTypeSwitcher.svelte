<script lang="ts">
  import { CalendarDays, ChartColumnBig, Notebook, ScrollText } from 'lucide-svelte';
  import { Button, getModalManager } from '@openpeeps/ui';
  import type { PostCreationData, PostType } from '@openpeeps/common/types';
  import { me } from '$lib/api';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';
  import { getNewPostStores } from '$lib/stores';
  import { goto } from '$app/navigation';

  interface Props {
    postData: PostCreationData;
    onchange: (postData: PostCreationData) => void;
    showEventType?: boolean;
    showArticleType?: boolean;
  }

  let {
    postData,
    onchange,
    showEventType = false,
    showArticleType = false,
  }: Props = $props();

  let isReply: boolean = $derived(!!postData.inReplyToId);

  const { t } = i18nContext();
  const modalManager = getModalManager();
  const newPostStores = getNewPostStores();

  const stores = getNewPostStores();

  const transferBaseFields = (target: PostCreationData, type: PostType) => {
    target.type = type;
    target.visibility = postData.visibility;
    target.groupId = postData.groupId;
    target.audience = postData.audience;
    target.inReplyToId = postData.inReplyToId;

    if ('content' in target.data && 'content' in postData.data) {
      target.data.content = postData.data.content;
    }
    if (type === 'question' && 'options' in target.data) {
      target.data.options = [
        { type: 'note', content: '' },
        { type: 'note', content: '' },
      ];
    }
  };

  const resetPreviousState = (
    postData: PostCreationData,
    targetType: PostType,
  ) => {
    if (postData.type === targetType) return;
    switch (postData.type) {
      case 'note':
        newPostStores.resetNewNoteState();
        break;

      case 'question':
        newPostStores.resetNewQuestionState();
        break;

      case 'article':
        newPostStores.resetNewArticleState();
        break;

      case 'event':
        newPostStores.resetNewEventState();
        newPostStores.resetNewJamState();
        break;

      default:
        break;
    }
  };

  const navigateIfNeeded = (type: PostType) => {
    if (type === 'event') {
      goto('/events/new');
      modalManager.close();
    }
    if (type === 'article') {
      goto('/articles/new');
      modalManager.close();
    }
  };

  const switchType = (type: PostType) => {
    const target = stores[type];
    if (!target) return;

    transferBaseFields(target, type);
    if (!isReply) {
      resetPreviousState(postData, type);
    }
    onchange(target);
    navigateIfNeeded(type);
  };
</script>

<div class="flex items-center gap-2">
  {#if postData.type !== 'note'}
    <Button
      title={t('posts.switcher.note')}
      class="btn-icon-sm"
      action={() => switchType('note')}
    >
      <Notebook />
    </Button>
  {/if}
  {#if postData.type !== 'question'}
    <Button
      title={t('posts.switcher.poll')}
      class=" btn-icon-sm"
      action={() => switchType('question')}
    >
      <ChartColumnBig />
    </Button>
  {/if}
  {#if showEventType}
    {#if $me?.roles?.find((role) => role.key === 'owner')}
      <Button
        title={t('posts.switcher.event')}
        class="btn-icon-sm"
        action={() => switchType('event')}
      >
        <CalendarDays />
      </Button>
    {/if}
  {/if}
  {#if showArticleType}
    <Button
      title={t('posts.switcher.article')}
      class="btn-icon-sm"
      action={() => switchType('article')}
    >
      <ScrollText />
    </Button>
  {/if}
</div>
