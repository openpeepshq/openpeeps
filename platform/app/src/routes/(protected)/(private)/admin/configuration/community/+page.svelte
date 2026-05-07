<script lang="ts">
  import { ConfigMenuButton } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  const pageHeaderStore = getPageHeaderStore();

  pageHeaderStore.set({
    title: 'Community Customization',
  });
</script>

<div class="p-4">
  <ConfigMenuButton
    translationPrefix="configuration.community.info"
    action="/admin/configuration/community/info"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.favicons"
    action="/admin/configuration/community/favicons"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.theme"
    action="/admin/configuration/community/theme"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.welcomePage"
    action="/admin/configuration/community/welcome-page"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.codeOfConduct"
    action="/admin/configuration/community/code-of-conduct"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.welcomeEmail"
    action="/admin/configuration/community/welcome-email"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.aboutPage"
    action="/admin/configuration/community/about-page"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.links"
    action="/admin/configuration/community/links"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.profileFields"
    action="/admin/configuration/community/profile-fields"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.roles"
    action="/admin/configuration/community/roles"
  ></ConfigMenuButton>
  <ConfigMenuButton
    translationPrefix="configuration.community.language"
    action="/admin/configuration/community/language"
  ></ConfigMenuButton>
</div>
