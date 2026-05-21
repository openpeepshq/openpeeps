<script lang="ts">
  // @ts-nocheck
  import { getToastStore, SlideToggle } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils/toast';
  import { Button } from '@openpeeps/ui';
  import {
    abortUploadsForAttachments,
    activeMediaUploads,
    joinGroupMutation,
  } from '$lib/api';
  import { getCurrentProfile } from '$lib/auth';
  import { Megaphone } from 'lucide-svelte';
  import { createPostMutation } from '$lib/api';
  import { onDestroy, onMount } from 'svelte';
  import { getServerInfo } from '$lib/server';
  import { ModalFooter, ModalWrapper } from '@openpeeps/ui';
  import { checkRoleCapabilities } from '@openpeeps/common/lib';
  import { announcePostMutation } from '$lib/api';
  import NewPostHeader from './NewPostHeader.svelte';
  import PreviewLinks from './PreviewLinks.svelte';
  import Attachments from './Attachments.svelte';
  import NoteForm from './NoteForm.svelte';
  import PollForm from './PollForm.svelte';
  import type {
    AudienceSetting,
    PostCreationData,
    PostDataUnion,
    PostType,
  } from '@openpeeps/common/types';
  import PostInputActions from './PostInputActions.svelte';
  import PostTypeSwitcher from './PostTypeSwitcher.svelte';
  import { getNewPostStores } from '$lib/stores';
  import { i18nContext } from '$lib/components/i18n';
  import { isPostFormSubmittable, stripFailedAttachments } from './actions';

  const { t } = i18nContext();
  const toastStore = getToastStore();
  const newPostStores = getNewPostStores();
  const me = getCurrentProfile();
  let postCreationData: PostCreationData = $state(newPostStores.note);

  const { publicContent } = getServerInfo();

  let canNotify: boolean = $derived(
    checkRoleCapabilities(me?.roles ?? [], ['allpeep-core-admin-notify'])
      .success,
  );
  let notify: boolean = $state(false);
  let valid: boolean = $state(false);

  const canSubmit = $derived(
    isPostFormSubmittable(
      postCreationData.type,
      postCreationData.data,
      valid,
      $activeMediaUploads,
    ),
  );

  const createPost = createPostMutation();
  const announcePost = announcePostMutation();
  const joinGroup = joinGroupMutation({
    id: postCreationData.groupId as string,
  });

  interface Props {
    close: () => void;
  }

  let { close }: Props = $props();

  onMount(() => {
    if (!publicContent && postCreationData.visibility === 'public') {
      postCreationData.visibility = 'local';
    }
  });

  // If the modal is dismissed (backdrop click, escape, or programmatic close)
  // while one of its attachments is still uploading, abort the in-flight
  // request rather than letting it linger in the background — the user has
  // walked away from this composition, the placeholder is going with them.
  onDestroy(() => {
    abortUploadsForAttachments(postCreationData.data.attachments);
  });

  const handleStoreReset = (type: PostType) => {
    if (type === 'note') {
      newPostStores.resetNewNoteState();
    } else if (type === 'question') {
      newPostStores.resetNewQuestionState();
    }
  };

  const handlePublish = async () => {
    let postData = postCreationData;
    if (postData.data.type === 'question') {
      postData.data.expiresAt = postData.data.expiresAt
        ? new Date(postData.data.expiresAt).toISOString()
        : undefined;
    }
    if (canSubmit) {
      if (
        postData.groupId &&
        !me?.memberships.map((m) => m.group.id).includes(postData.groupId)
      ) {
        await joinGroup();
      }
      postData.type = postData.data.type;
      postData = { ...postData, data: stripFailedAttachments(postData.data) };
      await createPost(postData)
        .then(async (response) => {
          toastStore.trigger(
            toast({
              message: t('posts.create.successToast'),
              background: 'variant-filled-success',
              autohide: true,
            }),
          );
          if (notify && canNotify && response.id) {
            return announcePost({
              id: response.id,
            });
          }
          handleStoreReset(postData.type);
          return response;
        })
        .catch(() =>
          toastStore.trigger(
            toast({
              message: t('posts.create.errorGeneric'),
              background: 'variant-filled-error',
              autohide: true,
            }),
          ),
        )
        .then(close);
    }
  };

  const updateStore = (postData: PostCreationData) => {
    if (postData.type === 'question') {
      newPostStores.question = postData;
    } else if (postData.type === 'note') {
      newPostStores.note = postData;
    } else if (postData.type === 'article') {
      newPostStores.article = postData;
    } else if (postData.type === 'event') {
      newPostStores.event = postData;
    }
  };

  const onchange = (postData: PostDataUnion) => {
    postCreationData.data = postData;
    updateStore(postCreationData);
  };

  const onChangeType = (postData: PostCreationData) => {
    postCreationData = postData;
    updateStore(postCreationData);
  };

  const setAudience = (audienceSetting?: AudienceSetting) => {
    if (audienceSetting) {
      postCreationData.visibility = audienceSetting.visibility;
      postCreationData.groupId = audienceSetting.groupId;
      postCreationData.audience = audienceSetting.audience;
      updateStore(postCreationData);
    }
  };
</script>

<ModalWrapper>
  <NewPostHeader postData={postCreationData} {setAudience} />
  <div class="w-full">
    {#if postCreationData.type === 'note'}
      <NoteForm postData={postCreationData} bind:valid {onchange} />
    {:else if postCreationData.type === 'question'}
      <PollForm postData={postCreationData} bind:valid {onchange} />
    {/if}

    <PreviewLinks content={postCreationData.data.content} />
    <Attachments postData={postCreationData.data} />
    {#if canNotify && ['public', 'local'].includes(postCreationData.visibility)}
      <div class="flex w-full items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <Megaphone class="size-5" />
          <p class="text-lg">{t('posts.form.notifyEveryone')}</p>
        </div>
        <SlideToggle
          name="slide"
          bind:checked={notify}
          background="bg-surface-300"
          active="bg-primary-500"
          size="sm"
        />
      </div>
    {/if}
  </div>

  <ModalFooter extraClassNames="border-t-0 z-30">
    <div class="w-full">
      <div class="mx-2 flex w-full items-center justify-between">
        <PostInputActions postData={postCreationData.data} />
        <PostTypeSwitcher
          postData={postCreationData}
          onchange={onChangeType}
          showEventType
          showArticleType
        />
      </div>
      <div class="border-surface-400 my-2 w-full border-t"></div>
      <div class="flex items-center justify-end gap-x-2">
        <Button
          title={t('posts.create.submit')}
          variant="variant-filled-primary"
          action={handlePublish}
          disabled={!canSubmit}
        >
          {t('posts.create.submit')}
        </Button>
      </div>
    </div>
  </ModalFooter>
</ModalWrapper>
