<script lang="ts">
  import { getModalStore } from '@skeletonlabs/skeleton';
  import {
    Button,
    ModalFooter,
    ModalHeader,
    ModalWrapper,
    Input,
  } from '@openpeeps/ui';
  import type { ProfileWithMeta } from '@openpeeps/common/types';
  import { accountByIdStore, updateAccountMutation } from '$lib/api';
  import { toaster } from '$lib/utils';
  import { i18nContext } from '$lib/components/i18n';
  import { AccessDeniedLoader } from '$lib/components/layout';

  const { t } = i18nContext();

  const modalStore = getModalStore();
  const toast = toaster();
  interface Props {
    profile: ProfileWithMeta;
  }

  let { profile }: Props = $props();
  let oldEmail = profile.controllers[0].email;

  const accountId = profile.controllers[0].id;

  const accountStore = accountByIdStore(accountId);
  const updateAccount = updateAccountMutation({ id: accountId });

  const account = $derived($accountStore.data);

  const handleEditEmail = async () => {
    if (account?.email === oldEmail) {
      toast({
        message: t('accounts.editEmail.sameEmail'),
        type: 'error',
      });
      return;
    }
    await updateAccount({ email: account?.email })
      .then(() => {
        toast({
          message: t('accounts.editEmail.updateSuccess'),
        });
        modalStore.close();
      })
      .catch(() => {
        toast({
          message: t('accounts.editEmail.updateError'),
          type: 'error',
        });
      });
  };
</script>

{#if $modalStore[0]}
  <AccessDeniedLoader queries={[$accountStore]}>
    {#if account}
      <ModalWrapper width={'md:w-1/3 w-modal'}>
        <!-- header -->
        <ModalHeader title={t('accounts.editEmail.title')} />
        <!-- content -->
        <div class="px-4 py-2">
          <p>{t('accounts.editEmail.description')}</p>
          <div class="mt-4"></div>
          <p>{t('accounts.editEmail.emailLabel')}</p>
          <Input bind:value={account.email} />
        </div>

        <!-- footer -->
        <ModalFooter extraClassNames={'w-full'}>
          <Button
            title={t('accounts.editEmail.saveChanges')}
            class="w-full"
            action={handleEditEmail}
            variant="variant-filled-primary"
            >{t('accounts.editEmail.saveChanges')}</Button
          >
        </ModalFooter>
      </ModalWrapper>
    {/if}
  </AccessDeniedLoader>
{/if}
