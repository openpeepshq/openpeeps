import { useState } from 'react';
import { randomString } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps } from '../../../index';
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

export function InviteWithEmailModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const createInvite = openpeepsApi.admin.createInviteAction();

  const [emails, setEmails] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [expiry, setExpiry] = useState<string>('P1D');
  const [message, setMessage] = useState(
    t('admin.inviteEmail.defaultMessage', {
      defaultValue: 'You have been invited to join our community.',
    }),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const emailList = emails
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const submit = async () => {
    setError(null);
    if (emailList.length === 0) {
      setError(
        t('admin.inviteEmail.emailRequired', {
          defaultValue: 'Enter at least one email address.',
        }),
      );
      return;
    }
    setSubmitting(true);
    const days = EXPIRY_OPTIONS.find((o) => o.value === expiry)?.days ?? 1;
    const unlimited = maxUses === 'unlimited';
    try {
      await createInvite({
        slug: randomString(8),
        active: true,
        maxUses: unlimited ? UNLIMITED_USES : Number(maxUses),
        expiresAt: new Date(Date.now() + days * DAY_MS).toISOString(),
        emailPatterns: emailList,
        customInvitationMessage: message,
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('admin.inviteEmail.title', {
              defaultValue: 'Invite by Email',
            })}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <p className="text-success px-1 text-sm">
            {t('admin.inviteEmail.success', {
              defaultValue: 'Invitations sent.',
            })}
          </p>
        ) : (
          <div className="space-y-4 px-1">
            <div className="space-y-2">
              <Label htmlFor="invite-emails">
                {t('admin.inviteEmail.emailAddress', {
                  defaultValue: 'Email addresses',
                })}
              </Label>
              <Input
                id="invite-emails"
                value={emails}
                placeholder={t('admin.inviteEmail.emailPlaceholder', {
                  defaultValue: 'email1@example.com, email2@example.com',
                })}
                onChange={(e) => setEmails(e.target.value)}
              />
              {emailList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {emailList.map((email) => (
                    <span
                      key={email}
                      className="bg-surface-2 rounded-md border px-2 py-0.5 text-xs"
                    >
                      {email}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-message">
                {t('admin.inviteEmail.composeMessage', {
                  defaultValue: 'Compose a message',
                })}
              </Label>
              <textarea
                id="invite-message"
                className="border-input bg-background min-h-32 w-full rounded-md border p-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email-uses">
                {t('admin.inviteLink.numberOfUses', {
                  defaultValue: 'Number of Uses',
                })}
              </Label>
              <select
                id="invite-email-uses"
                className="border-input bg-background w-full rounded-md border p-2 text-sm"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              >
                {['1', '5', '10', '15', '20'].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                <option value="unlimited">
                  {t('admin.inviteLink.unlimited', {
                    defaultValue: 'Unlimited',
                  })}
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email-expiry">
                {t('admin.inviteEmail.expiresAfter', {
                  defaultValue: 'Expires After',
                })}
              </Label>
              <select
                id="invite-email-expiry"
                className="border-input bg-background w-full rounded-md border p-2 text-sm"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              >
                <option value="P1D">
                  {t('admin.inviteEmail.expires1Day', {
                    defaultValue: 'One Day',
                  })}
                </option>
                <option value="P2D">
                  {t('admin.inviteEmail.expires2Days', {
                    defaultValue: 'Two Days',
                  })}
                </option>
                <option value="P1W">
                  {t('admin.inviteEmail.expires1Week', {
                    defaultValue: 'One Week',
                  })}
                </option>
                <option value="P1M">
                  {t('admin.inviteEmail.expires1Month', {
                    defaultValue: 'One Month',
                  })}
                </option>
                <option value="P100Y">
                  {t('admin.inviteEmail.expiresNever', {
                    defaultValue: 'Never',
                  })}
                </option>
              </select>
            </div>
            {error ? (
              <p className="border-error/40 text-error rounded-md border p-2 text-sm">
                {error}
              </p>
            ) : null}
          </div>
        )}

        {sent ? (
          <DialogActions
            actionLabel={t('admin.inviteLink.done', { defaultValue: 'Done' })}
            onAction={onClose}
          />
        ) : (
          <DialogActions
            cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
            onCancel={onClose}
            actionLabel={t('admin.inviteEmail.sendInvite', {
              defaultValue: 'Send Invite',
            })}
            onAction={submit}
            disabled={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
