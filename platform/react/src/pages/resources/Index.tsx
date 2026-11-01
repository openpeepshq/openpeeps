import { useCallback, useMemo, useRef } from 'react';
import { FilePlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { canCreatePostTypeIgnoringScopes } from '@openpeepshq/common/lib';
import {
  useT,
  useSetPageHeader,
  useSetPlusButtonActions,
  useAuthData,
} from '../../index';
import { useNavigate } from '../../contexts/router';
import { ResourceLibrary } from '../../components/resources/ResourceLibrary';
import {
  filtersFromUrl,
  filtersToUrl,
  type ResourceLibraryFilters,
} from '../../components/resources/resourceLibraryFilters';
import { getNewPostStores } from '../../stores';

export const ResourcesIndex = () => {
  const t = useT();
  const navigate = useNavigate();
  const authData = useAuthData();
  const canCreate = canCreatePostTypeIgnoringScopes(authData, 'resource');
  const [searchParams, setSearchParams] = useSearchParams();

  // The page owns the URL. Read the library's filters from it as its initial
  // config, and write them back when they change.
  const initialFilters = filtersFromUrl(searchParams);

  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;
  const handleFiltersChange = useCallback(
    (filters: ResourceLibraryFilters) => {
      const next = filtersToUrl(paramsRef.current, filters);
      // Guard: skip a no-op write, which would otherwise loop (writing
      // updates searchParams, which re-runs this callback).
      if (next.toString() === paramsRef.current.toString()) return;
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

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

  return (
    <ResourceLibrary
      initialFilters={initialFilters}
      onFiltersChange={handleFiltersChange}
    />
  );
};
