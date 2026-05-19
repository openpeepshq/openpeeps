<script lang="ts">
  import { ConfigMenuButton } from '@openpeeps/svelte/components';
</script>

<div class="p-4">
  <ConfigMenuButton
    translationPrefix="configuration.community"
    action="/admin/configuration/community"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.serverSettings"
    action="/admin/configuration/server-settings"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.email"
    action="/admin/configuration/email"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.i18n"
    action="/admin/configuration/i18n"
  ></ConfigMenuButton>
</div>
