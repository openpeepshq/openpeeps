import { useCallback, useMemo } from 'react';
import { FilePlus } from 'lucide-react';
import { canCreatePostType } from '@openpeepshq/common/lib';
import {
  useT,
  useSetPageHeader,
  useSetPlusButtonActions,
  useAuthData,
} from '../../index';
import { useNavigate } from '../../contexts/router';
import { ResourceLibrary } from '../../components/resources/ResourceLibrary';
import { getNewPostStores } from '../../stores';

export const ResourcesIndex = () => {
  const t = useT();
  const navigate = useNavigate();
  const authData = useAuthData();
  const canCreate = canCreatePostType(authData, 'resource');

  const openNew = useCallback(() => {
    const stores = getNewPostStores();
    stores.resource = { ...stores.resource, groupId: undefined };
    navigate({ type: 'resources', view: 'new' });
  }, [navigate]);

  const plusButton = useMemo(
    () =>
      canCreate
        ? {
            title: t('resources.new', { defaultValue: 'New resource' }),
            icon: FilePlus,
            action: openNew,
          }
        : undefined,
    [canCreate, openNew, t],
  );
  useSetPlusButtonActions(plusButton);
  useSetPageHeader(
    t('navigation.resources', { defaultValue: 'Resources' }),
    undefined,
    'resources-page-heading',
  );

  return <ResourceLibrary onCreate={openNew} canCreate={canCreate} />;
};
