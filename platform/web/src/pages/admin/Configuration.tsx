import { useT, useSetPageHeader } from '@openpeepshq/react';
import { ConfigMenuButton } from './ConfigMenuButton';

export function AdminConfiguration() {
  const t = useT();

  useSetPageHeader(
    t('configuration.title', { defaultValue: 'Configuration' }),
    undefined,
    'admin-configuration-heading',
  );

  return (
    <div className="p-4">
      <ConfigMenuButton
        translationPrefix="configuration.community"
        action="/admin/configuration/community"
      />
      <ConfigMenuButton
        translationPrefix="configuration.serverSettings"
        action="/admin/configuration/server-settings"
      />
      <ConfigMenuButton
        translationPrefix="configuration.email"
        action="/admin/configuration/email"
      />
      <ConfigMenuButton
        translationPrefix="configuration.i18n"
        action="/admin/configuration/i18n"
      />
    </div>
  );
}
