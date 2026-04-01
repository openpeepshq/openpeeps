<script lang="ts">
  import { ConfigMenuButton } from '@openpeeps/svelte/components';
</script>

<div class="p-4">
  <ConfigMenuButton
    translationPrefix="settings.notifications.preferences"
    action="/settings/notifications/preferences"
  />
  <ConfigMenuButton
    translationPrefix="settings.notifications.pushEnabledDevices"
    action="/settings/notifications/push-enabled-devices"
  />
</div>
