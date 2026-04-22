<script lang="ts">
  import { Form, SubmitButton } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { updateConfigMutation } from '$lib/api';
  import {
    communityConfigSchema,
    type CommunityConfig,
  } from '@openpeeps/common/types';
  import { diff } from 'deep-object-diff';
  import { toast } from '$lib/utils/toast';
  import { i18nContext } from '$lib/components/i18n';
  import { FormOpenpeepsMarkdownInput } from '../../form';

  const { t } = i18nContext();
  const toastStore = getToastStore();

  const updateConfig = updateConfigMutation({
    namespace: 'openpeeps',
    name: 'community',
  });

  let { defaults }: { defaults: CommunityConfig } = $props();
  let communityConfig: CommunityConfig = $state(structuredClone(defaults));

  const handleSubmit = () =>
    updateConfig({
      config: diff(defaults, communityConfig) as CommunityConfig,
    }).then(() =>
      toastStore.trigger(
        toast({
          message: t('configuration.community.updateSuccess'),
          background: 'variant-filled-success',
        }),
      ),
    );
</script>

<Form
  data={communityConfig}
  schema={communityConfigSchema}
  onsubmit={handleSubmit}
>
  <p class="pb-2 pt-4">
    {t('configuration.community.welcomePage.description')}
  </p>
  <FormOpenpeepsMarkdownInput
    path={['content', 'welcomePage']}
    maxLength={5000}
    heightClass="h-[50em]"
    inline
  />
  <SubmitButton title={t('configuration.community.save')} action={handleSubmit}>
    {t('configuration.community.save')}
  </SubmitButton>
</Form>
