import { useCallback, useMemo } from 'react';
import { FilePlus } from 'lucide-react';
import { canCreatePostTypeIgnoringScopes } from '@openpeepshq/common/lib';
import {
  useT,
  useSetPageHeader,
  useSetPlusButtonActions,
  useAuthData,
} from '../../index';
import { useNavigate, useRouter } from '../../contexts/router';
import { ResourceLibrary } from '../../components/resources/ResourceLibrary';
import { getNewPostStores } from '../../stores';

export const ResourcesIndex = () => {
  const t = useT();
  const router = useRouter();
  const navigate = useNavigate();
  const authData = useAuthData();
  const canCreate = canCreatePostTypeIgnoringScopes(authData, 'resource');

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

  // Kept stable so ResourceLibrary.changeCategory (deps include
  // onCategoryChange) does not get a new identity every render.
  const onCategoryChange = useCallback(
    (path: string[]) => {
      const next = new URLSearchParams(router.searchParams);
      next.delete('category');
      for (const segment of path) {
        if (segment) next.append('category', segment);
      }
      router.setSearchParams(next, { replace: true });
    },
    [router],
  );

  return <ResourceLibrary onCategoryChange={onCategoryChange} />;
};
