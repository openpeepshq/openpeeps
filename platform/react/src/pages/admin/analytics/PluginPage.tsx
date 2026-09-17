import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { groupName } from '@openpeepshq/common/lib';
import { PluginSlot } from '../../../components';
import { useOpenpeeps } from '../../../index';
import {
  analyticsPluginSlotName,
  analyticsPluginTabSlug,
} from './analyticsPluginTabs';
import { useAnalyticsRangeContext } from './AnalyticsRangeContext';

export const AnalyticsPluginPage = () => {
  const { pluginTab } = useParams();
  const { openpeepsApi } = useOpenpeeps();
  const { range } = useAnalyticsRangeContext();
  const groupsQuery = openpeepsApi.admin.useAllGroupsList();
  const analyticsGroups = useMemo(
    () =>
      (groupsQuery.data ?? []).map((group) => ({
        id: group.id,
        name: groupName(group),
      })),
    [groupsQuery.data],
  );
  const slot =
    typeof pluginTab === 'string' ? analyticsPluginSlotName(pluginTab) : null;
  if (!slot || analyticsPluginTabSlug(slot) !== pluginTab) {
    return <Navigate to="/admin/analytics" replace />;
  }

  return (
    <PluginSlot
      name={slot}
      props={{
        analyticsRange: range,
        analyticsGroups,
      }}
    />
  );
};
