import { useSetPageHeader } from '@openpeeps/react';
import { ConfigMenuButton } from './ConfigMenuButton';

export function AdminConfigurationCommunity() {
  useSetPageHeader('Community Customization');

  return (
    <div className="p-4">
      <ConfigMenuButton
        translationPrefix="configuration.community.info"
        action="/admin/configuration/community/info"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.favicons"
        action="/admin/configuration/community/favicons"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.theme"
        action="/admin/configuration/community/theme"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.welcomePage"
        action="/admin/configuration/community/welcome-page"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.codeOfConduct"
        action="/admin/configuration/community/code-of-conduct"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.welcomeEmail"
        action="/admin/configuration/community/welcome-email"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.aboutPage"
        action="/admin/configuration/community/about-page"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.links"
        action="/admin/configuration/community/links"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.profileFields"
        action="/admin/configuration/community/profile-fields"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.roles"
        action="/admin/configuration/community/roles"
      />
      <ConfigMenuButton
        translationPrefix="configuration.community.language"
        action="/admin/configuration/community/language"
      />
    </div>
  );
}
