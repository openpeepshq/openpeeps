<script lang="ts">
  import {
    AccountInformationTab,
    i18nContext,
  } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { getCurrentIdentity } from '@openpeeps/svelte/auth';

  const pageHeaderStore = getPageHeaderStore();

  const { account } = getCurrentIdentity();
  const { t } = i18nContext();

  $effect(() => {
    pageHeaderStore.set({
      title: t('settings.account.title'),
    });
  });
</script>

<AccountInformationTab {account} />
