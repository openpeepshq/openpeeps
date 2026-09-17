import { Navigate, useParams } from 'react-router-dom';
import { PluginSlot } from '../../components';
import { useSetPageHeader, useT } from '../../index';
import {
  configurationPluginPageSlug,
  configurationPluginSlotName,
  humanizeConfigurationPluginSlug,
} from './configurationPluginPages';

export const ConfigurationPluginPage = () => {
  const t = useT();
  const { pluginPage } = useParams();
  const slug = typeof pluginPage === 'string' ? pluginPage : '';
  const slot = slug ? configurationPluginSlotName(slug) : null;
  const valid = Boolean(slot && configurationPluginPageSlug(slot) === slug);

  useSetPageHeader(
    valid
      ? t(`configuration.plugins.${slug}.title`, {
          defaultValue: humanizeConfigurationPluginSlug(slug),
        })
      : t('configuration.title', { defaultValue: 'Configuration' }),
  );

  if (!valid || !slot) {
    return <Navigate to="/admin/configuration" replace />;
  }

  return (
    <div className="p-4">
      <PluginSlot name={slot} />
    </div>
  );
};
