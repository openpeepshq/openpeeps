import { useEffect, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { randomString } from '@openpeepshq/common/lib';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useServerInfo } from '../../../index';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openpeepshq/react-ui';
import {
  communityQrLogoSrc,
  downloadInviteQr,
  inviteQrDataUrl,
  inviteUrl,
} from './inviteQr';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_OPTIONS = [
  { value: 'P1D', days: 1 },
  { value: 'P2D', days: 2 },
  { value: 'P1W', days: 7 },
  { value: 'P1M', days: 30 },
  { value: 'P100Y', days: 365 * 100 },
] as const;

export const UNLIMITED_USES = 1000;

const InviteQrPreview = ({ slug }: { slug: string }) => {
  const t = useT();
  const logoSrc = communityQrLogoSrc(useServerInfo().communityConfig);
  const [src, setSrc] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setQrError(false);
    void inviteQrDataUrl(inviteUrl(slug), logoSrc)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setQrError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, logoSrc]);

  if (qrError) {
    return (
      <p className="text-error text-xs">
        {t('admin.inviteLink.qrError', {
          defaultValue: 'Could not generate QR code',
        })}
      </p>
    );
  }

  if (!src) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={src}
        alt={t('admin.inviteLink.qrCodeAlt', {
          defaultValue: 'QR code for this invite link',
        })}
        className="size-48 rounded-md border bg-white p-2"
      />
      <Button
        variant="outline"
        compact
        action={() => downloadInviteQr(slug, logoSrc)}
      >
        <Download size={16} />
        {t('admin.inviteLink.saveAsQrCode', {
          defaultValue: 'Save as QR code',
        })}
      </Button>
    </div>
  );
};

export function InviteWithLinkModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const createInvite = openpeepsApi.admin.createInviteAction();
  const groupsQuery = openpeepsApi.useGroups();

  const [slug, setSlug] = useState(() => randomString(8));
  const [maxUses, setMaxUses] = useState('1');
  const [expiry, setExpiry] = useState<string>('P1D');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const groups = groupsQuery.data ?? [];

  const toggleGroup = (id: string, checked: boolean) =>
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    const finalSlug = slug || randomString(8);
    const days = EXPIRY_OPTIONS.find((o) => o.value === expiry)?.days ?? 1;
    const unlimited = maxUses === 'unlimited';
    try {
      const result = await createInvite({
        slug: finalSlug,
        active: true,
        maxUses: unlimited ? UNLIMITED_USES : Number(maxUses),
        expiresAt: new Date(Date.now() + days * DAY_MS).toISOString(),
        ...(selectedGroups.size
          ? { groupIds: Array.from(selectedGroups) }
          : {}),
      });
      setCreatedSlug((result as { slug: string }).slug ?? finalSlug);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (!createdSlug) return;
    await navigator.clipboard.writeText(inviteUrl(createdSlug));
    setCopied(true);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('admin.inviteLink.title', {
              defaultValue: 'Create Invite Link',
            })}
          </DialogTitle>
        </DialogHeader>

        {createdSlug ? (
          <div className="space-y-3 px-1">
            <div className="bg-surface flex items-center gap-2 rounded-md border p-2">
              <span className="flex-1 break-all text-xs">
                {inviteUrl(createdSlug)}
              </span>
              <button
                type="button"
                title={t('admin.inviteLink.copyToClipboard', {
                  defaultValue: 'Copy to Clipboard',
                })}
                onClick={copy}
              >
                <Copy size={18} />
              </button>
            </div>
            {copied ? (
              <p className="text-success text-xs">
                {t('admin.invites.copiedToClipboard', {
                  defaultValue: 'Copied to clipboard',
                })}
              </p>
            ) : null}
            <InviteQrPreview slug={createdSlug} />
          </div>
        ) : (
          <div className="space-y-4 px-1">
            <p className="text-muted-foreground text-sm">
              {t('admin.inviteLink.description', {
                defaultValue:
                  'Invite Links can be limited to a number of uses or by date',
              })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="invite-slug">
                {t('admin.invites.linkHeading', { defaultValue: 'Link' })}
              </Label>
              <Input
                id="invite-slug"
                value={slug}
                placeholder={t('admin.inviteLink.generateButton', {
                  defaultValue: 'Create Link',
                })}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-uses">
                {t('admin.inviteLink.numberOfUses', {
                  defaultValue: 'Number of Uses',
                })}
              </Label>
              <select
                id="invite-uses"
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
              <Label htmlFor="invite-expiry">
                {t('admin.inviteLink.expiresAfter', {
                  defaultValue: 'Expires After',
                })}
              </Label>
              <select
                id="invite-expiry"
                className="border-input bg-background w-full rounded-md border p-2 text-sm"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              >
                <option value="P1D">
                  {t('admin.inviteLink.oneDay', { defaultValue: 'One Day' })}
                </option>
                <option value="P2D">
                  {t('admin.inviteLink.twoDays', { defaultValue: 'Two Days' })}
                </option>
                <option value="P1W">
                  {t('admin.inviteLink.oneWeek', { defaultValue: 'One Week' })}
                </option>
                <option value="P1M">
                  {t('admin.inviteLink.oneMonth', {
                    defaultValue: 'One Month',
                  })}
                </option>
                <option value="P100Y">
                  {t('admin.inviteLink.never', { defaultValue: 'Never' })}
                </option>
              </select>
            </div>
            {groups.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="invite-groups">
                  {t('admin.inviteLink.autoJoinGroups', {
                    defaultValue: 'Auto-join groups',
                  })}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {t('admin.inviteLink.autoJoinGroupsHint', {
                    defaultValue:
                      'People who register with this link are added as members of the groups you select.',
                  })}
                </p>
                <div
                  id="invite-groups"
                  className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2"
                >
                  {groups.map((g: GroupWithMeta) => (
                    <label
                      key={g.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{g.displayName || `@${g.handle}`}</span>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={selectedGroups.has(g.id)}
                        onChange={(e) => toggleGroup(g.id, e.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {error ? (
              <p className="border-error/40 text-error rounded-md border p-2 text-sm">
                {error}
              </p>
            ) : null}
          </div>
        )}

        {createdSlug ? (
          <DialogActions
            actionLabel={t('admin.inviteLink.done', { defaultValue: 'Done' })}
            onAction={onClose}
          />
        ) : (
          <DialogActions
            cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
            onCancel={onClose}
            actionLabel={t('admin.inviteLink.generateButton', {
              defaultValue: 'Create Link',
            })}
            onAction={submit}
            disabled={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
