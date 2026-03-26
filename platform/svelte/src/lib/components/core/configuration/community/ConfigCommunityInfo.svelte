<script lang="ts">
  import { Form, FormInput, SubmitButton } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { updateConfigMutation } from '$lib/api';
  import {
    communityConfigSchema,
    type CommunityConfig,
  } from '@openpeeps/common/types';
  import { diff } from 'deep-object-diff';
  import { toast } from '$lib/utils/toast';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
  const toastStore = getToastStore();

  const updateConfig = updateConfigMutation({
    namespace: 'allpeep',
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
  <FormInput
    path={['info', 'name']}
    type="text"
    title={t('configuration.community.name')}
  />
  <FormInput
    path={['info', 'tagLine']}
    type="textarea"
    title={t('configuration.community.tagline')}
  />
  <FormInput
    path={['info', 'contactEmail']}
    type="email"
    title={t('configuration.community.email')}
  />
  <SubmitButton title={t('configuration.community.save')} action={handleSubmit}>
    {t('configuration.community.save')}
  </SubmitButton>
</Form>
