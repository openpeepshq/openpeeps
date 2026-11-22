import type { GroupWithMeta } from '@openpeepshq/common/types';
import { checkGroupCapabilities, truncateText } from '@openpeepshq/common/lib';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  LoadingSpinner,
} from '@openpeepshq/react-ui';
import { useMemo, useState } from 'react';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useToast } from '../../layout/ToastProvider';

export interface ShareIntoGroupPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected group's id once the post succeeds. */
  onShare: (groupId: string) => Promise<void>;
}

/**
 * Dialog that lists groups the current profile can post notes to and shares
 * a post's link into the chosen one as a new note (never a repost).
 */
export const ShareIntoGroupPicker = ({
  open,
  onOpenChange,
  onShare,
}: ShareIntoGroupPickerProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const { success, error: toastError } = useToast();
  const [sharing, setSharing] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      (me?.memberships ?? [])
        .map((m) => m.group as GroupWithMeta)
        .filter(
          (g) =>
            checkGroupCapabilities(authData, ['core-posts-create-note'], g)
              .success,
        ),
    [me?.memberships, authData],
  );

  const share = async (group: GroupWithMeta) => {
    if (sharing) return;
    setSharing(group.id);
    try {
      await onShare(group.id);
      success(
        t('posts.shareMenu.sharedIntoGroup', {
          defaultValue: 'Shared into {{name}}',
          name: truncateText(group.displayName || `@${group.handle}`, 30),
        }),
      );
      onOpenChange(false);
    } catch {
      toastError(
        t('posts.shareMenu.shareFailed', {
          defaultValue: "Couldn't share the post",
        }),
      );
    } finally {
      setSharing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.shareMenu.shareIntoGroupPickerTitle', {
              defaultValue: 'Share into group',
            })}
          </DialogTitle>
        </DialogHeader>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('posts.shareMenu.noShareableGroups', {
              defaultValue: "You can't post to any group",
            })}
          </p>
        ) : (
          <ul className="flex flex-col gap-y-1">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  disabled={sharing !== null}
                  className="hover:bg-surface flex w-full items-center gap-x-2 rounded-button p-2 text-left transition-colors disabled:opacity-60"
                  onClick={() => void share(group)}
                >
                  {sharing === group.id ? (
                    <LoadingSpinner className="size-4" />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {truncateText(
                        group.displayName || `@${group.handle}`,
                        40,
                      )}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      @{group.handle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
