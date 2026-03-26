<script lang="ts">
  import { BillingTab, i18nContext } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { getCurrentIdentity } from '@openpeeps/svelte/auth';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { isOwnerProfile } from '@openpeeps/common';

  const pageHeaderStore = getPageHeaderStore();
  const { profile } = getCurrentIdentity();
  const { payments } = getServerInfo();
  const { t } = i18nContext();

  const stripeMembershipEnabled = $derived(
    payments?.stripe.paidMembership.enabled && !isOwnerProfile(profile),
  );
  $effect(() => {
    if (!stripeMembershipEnabled) {
      history.back();
    }
    pageHeaderStore.set({
      title: t('settings.billing.title'),
    });
  });
</script>

<BillingTab />
