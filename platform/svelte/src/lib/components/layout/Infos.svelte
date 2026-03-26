<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { Info } from '$lib/components/core';
  import { i18nContext } from '$lib/components/i18n';
  import { validateEmailAction } from '$lib/api';
  import { toaster } from '$lib/utils';
  import { getCurrentIdentity } from '$lib/auth';
  import { canCreatePostType } from '@openpeeps/common';

  const { profile, account } = getCurrentIdentity();

  const { t } = i18nContext();

  const toast = toaster();

  const triggerEmailValidation = validateEmailAction();

  const handleTriggerEmailValidation = () => {
    triggerEmailValidation()
      .then(() => {
        toast({
          message: t('accounts.validateEmail.success'),
        });
      })
      .catch(() => {
        toast({
          message: t('accounts.validateEmail.error'),
          type: 'error',
        });
      });
  };
</script>

<div class="flex flex-col gap-4">
  {#if account && profile && !account?.emailValidated && !canCreatePostType(profile, 'note')}
    <Info
      text={t('infos.emailNotVerified.text')}
      title={t('infos.emailNotVerified.title')}
      type="error"
    >
      {#snippet actions()}
        <Button
          action={handleTriggerEmailValidation}
          variant="variant-ghost-primary"
        >
          {t('infos.emailNotVerified.verify')}
        </Button>
      {/snippet}
    </Info>
  {/if}
</div>
