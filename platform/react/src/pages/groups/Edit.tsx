import { checkGroupCapabilities } from '@openpeepshq/common/lib';
import { LoadingSpinner } from '@openpeepshq/react-ui';
import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { ConfigMenuButton, useAuthData } from '../../components';
import { routeHandleParam } from '../../lib/routeHandles';

export function EditGroup() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();
  const authData = useAuthData();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);

  useSetPageHeader(t('groups.edit.title', { defaultValue: 'Edit group' }));

  if (groupQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }
  if (!groupQuery.data) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('groups.notFound', { defaultValue: 'Group not found' })}
      </div>
    );
  }

  const group = groupQuery.data;
  const base = `/groups/@${group.handle}`;
  const canEdit = checkGroupCapabilities(
    authData,
    ['core-groups-update'],
    group,
  ).success;
  const canEditCapabilities = checkGroupCapabilities(
    authData,
    ['core-groups-updateCapabilities'],
    group,
  ).success;

  return (
    <nav
      aria-label={t('groups.edit.title', { defaultValue: 'Edit group' })}
      className="p-4"
    >
      {canEdit ? (
        <ConfigMenuButton
          translationPrefix="groups.edit.info"
          action={`${base}/edit/info`}
          testId="group-edit-info-link"
        />
      ) : null}
      {canEditCapabilities ? (
        <ConfigMenuButton
          translationPrefix="groups.edit.roles"
          action={`${base}/edit/roles`}
          testId="group-edit-roles-link"
        />
      ) : null}
    </nav>
  );
}
