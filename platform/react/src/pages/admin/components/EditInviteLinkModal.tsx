import { useState } from 'react';
import type { InviteLinkWithMeta } from '@openpeepshq/common/types';
import { useOpenpeeps, useT } from '../../../index';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openpeepshq/react-ui';
import { DAY_MS, EXPIRY_OPTIONS, UNLIMITED_USES } from './InviteWithLinkModal';

const NEVER_DAYS =
  EXPIRY_OPTIONS.find((option) => option.value === 'P100Y')?.days ?? 365 * 100;

const FAR_FUTURE_MS = 50 * 365 * DAY_MS;

const pad = (value: number) => String(value).padStart(2, '0');

const toDatetimeLocal = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
  const time = [pad(date.getHours()), pad(date.getMinutes())].join(':');
  return `${day}T${time}`;
};

const isFarFuture = (iso: string) =>
  new Date(iso).getTime() - Date.now() > FAR_FUTURE_MS;

const useChoices = (invite: InviteLinkWithMeta) => {
  const floor = Math.max(invite.redemptions.length, 1);
  const current = invite.maxUses < UNLIMITED_USES ? [invite.maxUses] : [];
  return [...new Set([1, 5, 10, 15, 20, ...current])]
    .filter((count) => count >= floor)
    .sort((a, b) => a - b);
};

const initialUses = (invite: InviteLinkWithMeta) => {
  if (
    invite.maxUses >= UNLIMITED_USES ||
    invite.maxUses < invite.redemptions.length
  ) {
    return 'unlimited';
  }
  return String(invite.maxUses);
};

const errorMessage = (err: unknown, fallback: string) => {
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof err.message === 'string' &&
    err.message
  ) {
    return err.message;
  }
  return fallback;
};

export const EditInviteLinkModal = ({
  invite,
  onClose,
}: {
  invite: InviteLinkWithMeta;
  onClose: () => void;
}) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const updateInvite = openpeepsApi.admin.updateInviteAction({
    id: invite.id,
  });
  const used = invite.redemptions.length;
  const choices = useChoices(invite);
  const startsNever = isFarFuture(invite.expiresAt);

  const [maxUses, setMaxUses] = useState(() => initialUses(invite));
  const [never, setNever] = useState(startsNever);
  const [expiresLocal, setExpiresLocal] = useState(() =>
    toDatetimeLocal(
      startsNever
        ? new Date(Date.now() + 7 * DAY_MS).toISOString()
        : invite.expiresAt,
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedExpiry = new Date(expiresLocal);
  const expiresInPast =
    !never &&
    expiresLocal !== '' &&
    !Number.isNaN(parsedExpiry.getTime()) &&
    parsedExpiry.getTime() <= Date.now();

  const submit = async () => {
    setError(null);
    const unlimited = maxUses === 'unlimited';
    const nextMaxUses = unlimited ? UNLIMITED_USES : Number(maxUses);
    if (!unlimited && (!Number.isInteger(nextMaxUses) || nextMaxUses < used)) {
      setError(
        t('admin.invites.maxUsesTooLow', {
          defaultValue:
            'Number of uses cannot be lower than {{count}}, the number of accounts that already joined.',
          count: used,
        }),
      );
      return;
    }

    const patch: { maxUses?: number; expiresAt?: string } = {};
    if (nextMaxUses !== invite.maxUses) patch.maxUses = nextMaxUses;

    if (never) {
      if (!startsNever) {
        patch.expiresAt = new Date(
          Date.now() + NEVER_DAYS * DAY_MS,
        ).toISOString();
      }
    } else if (toDatetimeLocal(invite.expiresAt) !== expiresLocal) {
      if (!expiresLocal || Number.isNaN(parsedExpiry.getTime())) {
        setError(
          t('admin.invites.expiresRequired', {
            defaultValue: 'Choose an expiration date.',
          }),
        );
        return;
      }
      patch.expiresAt = parsedExpiry.toISOString();
    }

    if (patch.maxUses == null && patch.expiresAt == null) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await updateInvite(patch);
      onClose();
    } catch (err) {
      setError(
        errorMessage(
          err,
          t('admin.invites.updateError', {
            defaultValue: 'Failed to update invite link',
          }),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-testid="edit-invite-link">
        <DialogHeader>
          <DialogTitle>
            {t('admin.invites.editTitle', {
              defaultValue: 'Edit invite link',
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-1">
          <p className="text-muted-foreground text-sm">
            {t('admin.invites.editDescription', {
              defaultValue:
                'Update how many times this link can be used, or when it expires.',
            })}
          </p>
          <p className="font-mono text-xs">{invite.slug}</p>
          <div className="space-y-2">
            <Label htmlFor="edit-invite-uses">
              {t('admin.inviteLink.numberOfUses', {
                defaultValue: 'Number of Uses',
              })}
            </Label>
            <select
              id="edit-invite-uses"
              className="border-input bg-background w-full rounded-md border p-2 text-sm"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            >
              {choices.map((count) => (
                <option key={count} value={String(count)}>
                  {count}
                </option>
              ))}
              <option value="unlimited">
                {t('admin.inviteLink.unlimited', {
                  defaultValue: 'Unlimited',
                })}
              </option>
            </select>
            {used > 0 ? (
              <p className="text-muted-foreground text-xs">
                {t('admin.invites.alreadyJoined', {
                  defaultValue: 'Already joined: {{count}}',
                  count: used,
                })}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-invite-expiry">
              {t('admin.invites.expirationDate', {
                defaultValue: 'Expiration date',
              })}
            </Label>
            <Input
              id="edit-invite-expiry"
              type="datetime-local"
              value={expiresLocal}
              disabled={never}
              onChange={(e) => setExpiresLocal(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={never}
                onChange={(e) => setNever(e.target.checked)}
              />
              <span>
                {t('admin.invites.neverExpires', {
                  defaultValue: 'Never expires',
                })}
              </span>
            </label>
            {expiresInPast ? (
              <p className="text-muted-foreground text-xs">
                {t('admin.invites.pastExpiration', {
                  defaultValue:
                    'This date is in the past, so the link will be inactive.',
                })}
              </p>
            ) : null}
          </div>
          {error ? (
            <p className="border-error/40 text-error rounded-md border p-2 text-sm">
              {error}
            </p>
          ) : null}
        </div>
        <DialogActions
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={t('common.save', { defaultValue: 'Save' })}
          onAction={submit}
          disabled={submitting}
        />
      </DialogContent>
    </Dialog>
  );
};
