<script lang="ts">
  import PostTextArea from '../../form/OpenpeepsMarkdownInput.svelte';
  import type {
    PostCreationData,
    PostDataUnion,
  } from '@openpeeps/common/types';
  import { onMount } from 'svelte';

  interface Props {
    postData: PostCreationData;
    onchange?: (postData: PostDataUnion) => void;
    valid?: boolean;
  }

  let { postData, valid = $bindable(false), onchange }: Props = $props();

  const localPostData = $state(postData);

  const validate = () => {
    if (
      localPostData.data.content &&
      localPostData.data.content.length <= 500
    ) {
      valid = true;
    }
    if (
      localPostData.data.attachments &&
      localPostData.data.attachments.length > 0
    ) {
      valid = true;
    }
    onchange?.(localPostData.data);
  };
  onMount(validate);
</script>

<PostTextArea
  placeholder={"what's on your mind?"}
  bind:value={localPostData.data.content}
  oninput={validate}
/>
