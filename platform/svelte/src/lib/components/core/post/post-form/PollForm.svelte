<script lang="ts">
  import { questionSchema, type PostCreationData, type PostDataUnion } from '@openpeeps/common/types';
  import { Form, FormInput } from '@openpeeps/ui';
  import PollOptionsInput from '$lib/components/core/post/post-form/PollOptionsInput.svelte';
  import { FormOpenpeepsMarkdownInput } from '../../form';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();

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
      placeholder={t('posts.form.poll.questionPlaceholder')}
      path={['content']}
    />

    <PollOptionsInput />

    <FormInput title={t('posts.form.poll.pollEnd')} type="datetime-local" path={['expiresAt']} />

    <FormInput
      title={t('posts.form.poll.multipleAnswers')}
      type="checkbox"
      path={['multiple']}
      description={t('posts.form.poll.multipleAnswersDescription')}
    />

    <FormInput
      title={t('posts.form.poll.seeWhoVotedTitle')}
      type="checkbox"
      path={['votersVisible']}
      description={t('posts.form.poll.votersVisibleDescription')}
    />
  </Form>
</div>
