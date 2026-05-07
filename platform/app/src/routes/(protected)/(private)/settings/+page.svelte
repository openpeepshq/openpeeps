<script lang="ts">
  import { ConfigMenuButton } from '@openpeeps/svelte/components';
  import { getCurrentIdentity } from '@openpeeps/svelte/auth';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { isOwnerProfile } from '@openpeeps/common';

  const { profile } = getCurrentIdentity();
  const { payments } = getServerInfo();
  const stripeMembershipEnabled = $derived(
    payments?.stripe.paidMembership.enabled && !isOwnerProfile(profile),
  );
</script>

<div class="p-4">
  <ConfigMenuButton
    translationPrefix="settings.publicProfile"
    action="/settings/public-profile"
  />
  <ConfigMenuButton
    translationPrefix="settings.account"
    action="/settings/account"
  />
  <ConfigMenuButton
    translationPrefix="settings.notifications"
    action="/settings/notifications"
  />
  <ConfigMenuButton
    translationPrefix="settings.theme"
    action="/settings/theme"
  />
  <ConfigMenuButton
    translationPrefix="settings.language"
    action="/settings/language"
  />
  {#if stripeMembershipEnabled}
    <ConfigMenuButton
      translationPrefix="settings.billing"
      action="/settings/billing"
    />
  {/if}
</div>
