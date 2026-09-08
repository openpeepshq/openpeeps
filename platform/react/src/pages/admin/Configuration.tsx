import { useMemo } from 'react';
import { useT, useSetPageHeader } from '../../index';
import { ConfigMenuButton, usePluginRegistry } from '../../components';
import {
  CONFIGURATION_PLUGIN_SLOT_PREFIX,
  configurationPluginPageSlug,
  humanizeConfigurationPluginSlug,
} from './configurationPluginPages';

export function AdminConfiguration() {
  const t = useT();
  const { listSlots } = usePluginRegistry();
  const pluginPages = useMemo(
    () =>
      listSlots(CONFIGURATION_PLUGIN_SLOT_PREFIX).flatMap((slot) => {
        const slug = configurationPluginPageSlug(slot);
        if (!slug) return [];
        return [
          {
            slug,
            label: humanizeConfigurationPluginSlug(slug),
          },
        ];
      }),
    [listSlots],
  );

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
      {pluginPages.map(({ slug, label }) => (
        <ConfigMenuButton
          key={slug}
          translationPrefix={`configuration.plugins.${slug}`}
          action={`/admin/configuration/${slug}`}
          titleFallback={label}
          descriptionFallback={t('configuration.pluginPage.description', {
            defaultValue: 'Configure this plugin.',
          })}
        />
      ))}
    </div>
  );
}
