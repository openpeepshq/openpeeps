import { useCallback, useMemo } from 'react';
import { FilePlus } from 'lucide-react';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeepshq/common';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { getNewPostStores, useSetPlusButtonActions } from '../../stores';
import { useAuthData } from '../layout/IdentityContext';
import { useNavigate } from '../../contexts/router';

export interface NewResourceButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
  showButton?: boolean;
}

export const NewResourceButton = ({
  visibility,
  currentProfile,
  group,
  showButton = true,
}: NewResourceButtonProps) => {
  const t = useT();
  const authData = useAuthData();
  const navigate = useNavigate();
  const stores = getNewPostStores();

  const profile = currentProfile ?? authData.profile;
  const canPost =
    !!profile && canCreatePost(authData, 'resource', visibility, group);

  const openNew = useCallback(() => {
    stores.resource = {
      ...stores.resource,
      visibility,
      groupId: group?.id,
    };
    navigate({ type: 'resources', view: 'new' });
  }, [group?.id, navigate, stores, visibility]);

  const plusActions = useMemo(
    () =>
      canPost
        ? {
            title: t('resources.new', { defaultValue: 'New resource' }),
            icon: FilePlus,
            action: openNew,
          }
        : undefined,
    [canPost, openNew, t],
  );

  useSetPlusButtonActions(plusActions);

  if (!canPost || !showButton) return null;

  return (
    <div className="mb-4 p-4 pb-0">
      <Button
        title={t('resources.new', { defaultValue: 'New resource' })}
        variant="default"
        action={openNew}
        data-testid="resources-new-resource-button"
      >
        <FilePlus className="mr-1 size-4" />
        {t('resources.new', { defaultValue: 'New resource' })}
      </Button>
    </div>
  );
};
