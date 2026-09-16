import { useT, useSetPageHeader } from '../../index';
import { useServerInfo } from '../../components';
import { OverviewAnalytics } from './components/OverviewAnalytics';
import { ServerStatusSection } from './components/ServerStatusSection';

export const AdminDashboard = () => {
  const t = useT();
  const serverInfo = useServerInfo();

  useSetPageHeader(
    t('admin.dashboard.title', { defaultValue: 'Administration' }),
  );

  return (
    <div className="space-y-6 p-4">
      <ServerStatusSection status={serverInfo} />
      <OverviewAnalytics />
    </div>
  );
};
