import { useMemo } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import type { PostCreationData } from '@openpeeps/common/types';
import { groupName } from '@openpeeps/common/lib';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useServerInfo } from '../../server-data';
import { GroupAvatar } from '../../groups/GroupAvatar';
import { ProfileBadge } from '../../profile';
import { buildAudienceChoices } from './audienceChoices';

export interface VisibilitySelectorProps {
  postData: PostCreationData;
  onClick: () => void;
  disabled?: boolean;
  showDirect?: boolean;
}

export const VisibilitySelector = ({
  postData,
  onClick,
  disabled = false,
  showDirect = false,
}: VisibilitySelectorProps) => {
  const t = useT();
  const authData = useAuthData();
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();

  const audienceChoices = useMemo(
    () =>
      buildAudienceChoices(postData.type, authData, t, {
        publicContent: serverInfo.publicContent,
        showDirect,
      }),
    [postData.type, authData, t, serverInfo.publicContent, showDirect],
  );

  const selectedGroup = useMemo(
    () =>
      me?.memberships?.find((m) => m.group.id === postData.groupId)?.group,
    [me?.memberships, postData.groupId],
  );

  const description = (visibility: string) =>
    audienceChoices.find((c) => c.value === visibility)?.description ?? '';

  const content = () => {
    if (postData.visibility === 'group') {
      return (
        <span className="flex min-w-0 items-center gap-1 text-sm font-normal">
          <span className="shrink-0 pr-2">{description('group')}</span>
          {selectedGroup ? (
            <span className="flex min-w-0 items-center gap-1 truncate">
              <GroupAvatar group={selectedGroup} size={1.5} borderless />
              <span className="truncate">{groupName(selectedGroup)}</span>
            </span>
          ) : null}
        </span>
      );
    }

    if (postData.visibility === 'direct') {
      const audience = postData.audience ?? [];
      return (
        <span className="flex min-w-0 items-center gap-1 text-sm font-light">
          <span className="shrink-0 pr-2">{description('direct')}</span>
          {audience.length ? (
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {audience.map((profile) => (
                <ProfileBadge key={profile.id} profile={profile} />
              ))}
            </span>
          ) : null}
        </span>
      );
    }

    return (
      <span className="text-sm font-light">
        {description(postData.visibility)}
      </span>
    );
  };

  return (
    <div className="op-input-group grid grid-cols-[auto_1fr_auto]">
      <div className="op-input-group-shim">
        <Eye className="size-4" />
      </div>
      <button
        type="button"
        title={t('posts.form.changeAudience', {
          defaultValue: 'Change audience',
        })}
        className="hover:bg-muted/50 flex h-10 w-full min-w-0 items-center px-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onClick}
        disabled={disabled}
      >
        {content()}
      </button>
      {!disabled ? (
        <div className="op-input-group-shim">
          <ChevronDown className="text-muted-foreground size-4" />
        </div>
      ) : null}
    </div>
  );
};
