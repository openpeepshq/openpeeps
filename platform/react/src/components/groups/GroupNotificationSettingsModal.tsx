import { useState } from 'react';
import { Bell } from 'lucide-react';
import {
  groupName,
  groupNotificationLevelOptions,
  type GroupNotificationLevel,
  type GroupWithMeta,
} from '@openpeepshq/common';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  LoadingSpinner,
  RadioGroup,
  RadioGroupItem,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useGroupNotificationLevel } from '../../hooks';
import { useToast } from '../layout/ToastProvider';

export interface GroupNotificationSettingsModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

const optionLabelKey: Record<GroupNotificationLevel, string> = {
  all: 'groups.modals.manageNotifications.options.all',
  mostRelevant: 'groups.modals.manageNotifications.options.mostRelevant',
  off: 'groups.modals.manageNotifications.options.off',
};

const optionDescriptionKey: Record<GroupNotificationLevel, string> = {
  all: 'groups.modals.manageNotifications.options.allDescription',
  mostRelevant:
    'groups.modals.manageNotifications.options.mostRelevantDescription',
  off: 'groups.modals.manageNotifications.options.offDescription',
};

const optionDescriptionDefault: Record<GroupNotificationLevel, string> = {
  all: 'Every post and membership change, using your account notification settings.',
  mostRelevant: 'Posts from people you follow.',
  off: 'No posts or membership changes from this group.',
};

export function GroupNotificationSettingsModal({
  group,
  onClose,
}: GroupNotificationSettingsModalProps) {
  const t = useT();
  const { success } = useToast();
  const { level, setLevel, save, saving, ready, loadFailed, error } =
    useGroupNotificationLevel(group.id);

  const onSave = async () => {
    const saved = await save();
    if (!saved) return;
    success(
      t('groups.modals.manageNotifications.saved', {
        defaultValue: 'Group notification settings updated.',
      }),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('groups.modals.manageNotifications.title', {
              defaultValue: 'Manage notifications',
            })}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground px-1 text-sm">
          {t('groups.modals.manageNotifications.description', {
            defaultValue: 'Manage notifications about {{groupName}}.',
            groupName: groupName(group),
          })}
        </p>
        {ready ? (
          <RadioGroup
            value={level}
            onValueChange={(value) => setLevel(value as GroupNotificationLevel)}
            className="gap-3 px-1"
          >
            {groupNotificationLevelOptions.map((option) => (
              <label key={option} className="flex items-start gap-2 text-sm">
                <RadioGroupItem value={option} className="mt-0.5" />
                <span>
                  <span className="font-medium">
                    {t(optionLabelKey[option], { defaultValue: option })}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block">
                    {t(optionDescriptionKey[option], {
                      defaultValue: optionDescriptionDefault[option],
                    })}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        ) : loadFailed ? (
          <p className="text-error px-1 text-sm">
            {t('groups.modals.manageNotifications.loadError', {
              defaultValue: 'Could not load notification settings.',
            })}
          </p>
        ) : (
          <div className="text-muted-foreground flex h-24 items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogActions
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={
            saving
              ? t('common.saving', { defaultValue: 'Saving…' })
              : t('common.save', { defaultValue: 'Save' })
          }
          onAction={onSave}
          disabled={saving || !ready}
        />
      </DialogContent>
    </Dialog>
  );
}

export function GroupNotificationButton({ group }: { group: GroupWithMeta }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const label = t('groups.modals.manageNotifications.title', {
    defaultValue: 'Manage notifications',
  });

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        className="rounded-button inline-flex items-center justify-center"
        onClick={() => setOpen(true)}
      >
        <Bell size={16} aria-hidden="true" />
      </button>
      {open ? (
        <GroupNotificationSettingsModal
          group={group}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
