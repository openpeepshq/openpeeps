<script lang="ts">
  import { Eye } from 'lucide-svelte';
  import {
    postCreationDataSchema,
    type PostCreationData,
    type AudienceSetting,
  } from '@openpeeps/common/types';
  import { Form, FormInput } from '@openpeeps/ui';
  import { FormImageInput } from '../../form';
  import VisibilitySelector from './VisibilitySelector.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import FormOpenpeepsMarkdownInput from '../../form/FormOpenpeepsMarkdownInput.svelte';
  import { getCurrentProfile } from '$lib/auth';

  interface Props {
    postData: PostCreationData;
    isEdit?: boolean;
    onchange?: (data: PostCreationData) => void;
    valid?: boolean;
  }

  let {
    postData = $bindable(),
    isEdit = false,
    onchange,
    valid = $bindable(),
  }: Props = $props();

  const { t } = i18nContext();

  const me = getCurrentProfile();

  const setAudience = (audienceSetting?: AudienceSetting) => {
    const isUserInAudience = audienceSetting?.audience?.some(
      (audienceMember) => audienceMember.id === me.id,
    );
    if (audienceSetting) {
      postData.visibility = audienceSetting.visibility;
      postData.groupId = audienceSetting.groupId;
      postData.audience = isUserInAudience
        ? audienceSetting.audience
        : [...(audienceSetting.audience ?? []), me];
    }
  };
</script>

<Form
  bind:data={postData}
  schema={postCreationDataSchema}
  {onchange}
  bind:valid
>
  <FormImageInput
    usage="article-header-image"
    displayType="full"
    maxWidth={480}
    showSelectAspectRatio={true}
    text="Upload your cover image"
    specsText="Minimum width 480 pixels"
    showAltInput={false}
    path={['data', 'image']}
    classes={'h-96'}
    showFullImage={true}
  />

  <div class="mt-4 flex flex-col gap-4 px-3">
    <h2 class="text-lg">{t('articles.form.title')}</h2>
    <FormInput
      title={t('articles.form.title')}
      type="text"
      path={['data', 'title']}
    />

    <FormOpenpeepsMarkdownInput
      placeholder={t('articles.form.contentPlaceholder')}
      maxLength={10000}
      path={['data', 'content']}
      inline
    />


    <FormInput
      title={t('articles.form.visibility')}
      description={t('articles.form.visibilityNotChangeable')}
      type="mock"
      path={[]}
    >
      {#snippet lead()}
        <Eye size={16} />
      {/snippet}
      <div class="p-0! h-10">
        <VisibilitySelector
          {postData}
          {setAudience}
          showDirect
        />
      </div>
    </FormInput>
  </div>
</Form>
