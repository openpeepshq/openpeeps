import { AdminConfigEditor } from './ConfigEditor';
import { useT } from '../../index';

export const AdminConfigurationAi = () => {
  const t = useT();
  return (
    <AdminConfigEditor
      title={t('configuration.ai.title', { defaultValue: 'AI' })}
      namespace="openpeeps"
      name="ai"
    />
  );
};
