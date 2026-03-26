<script lang="ts">
  import { questionSchema, type PostCreationData, type PostDataUnion } from '@openpeeps/common/types';
  import { Form, FormInput } from '@openpeeps/ui';
  import PollOptionsInput from '$lib/components/core/post/post-form/PollOptionsInput.svelte';
  import { FormOpenpeepsMarkdownInput } from '../../form';
  interface Props {
    postData: PostCreationData;
    onchange?: (postData: PostDataUnion) => void;
    valid?: boolean;
  }

  let { postData, onchange, valid = $bindable(false) }: Props = $props();

  let localPostData = $state((postData as PostCreationData).data);
</script>

<div class="flex flex-col gap-2 px-2">
  <Form bind:valid bind:data={localPostData} schema={questionSchema} {onchange}>
    <FormOpenpeepsMarkdownInput
      placeholder="what's your question?"
      path={['content']}
    />

    <PollOptionsInput />

    <FormInput title="Poll end" type="datetime-local" path={['expiresAt']} />

    <FormInput
      title="Multiple answers"
      type="checkbox"
      path={['multiple']}
      description="Allow people to choose multiple answers"
    />

    <FormInput
      title="See Who Voted"
      type="checkbox"
      path={['votersVisible']}
      description="Allow everyone to see who voted and what option they voted for"
    />
  </Form>
</div>
