import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { inviteLinkMatchesQuery, randomString } from '@openpeeps/common/lib';
import type { GroupWithMeta } from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { UpdatingDate } from '@openpeeps/react/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openpeeps/react-ui';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_OPTIONS = [
  { value: 'P1D', days: 1 },
  { value: 'P2D', days: 2 },
  { value: 'P1W', days: 7 },
  { value: 'P1M', days: 30 },
  { value: 'P100Y', days: 365 * 100 },
] as const;

const UNLIMITED_USES = 1000;

function inviteUrl(slug: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/auth/register/invitation?inviteCode=${slug}`;
}

export function AdminInvites() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const invitesQuery = openpeepsApi.admin.useInvitesList();
  const activate = openpeepsApi.admin.activateInviteAction();
  const deactivate = openpeepsApi.admin.deactivateInviteAction();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const newInviteLabel = t('admin.invites.newInvite', {
    defaultValue: 'New Invite',
  });
  const headerActions = useMemo(
    () => (
      <Button
        title={newInviteLabel}
        variant="variant-filled-primary"
        action={() => setShowCreate(true)}
        data-testid="admin-new-invite-button"
      >
        {newInviteLabel}
      </Button>
    ),
    [newInviteLabel],
  );

  useSetPageHeader(
    t('admin.invites.title', { defaultValue: 'Invites' }),
    headerActions,
  );

  const invites = invitesQuery.data ?? [];
  const filtered = search
    ? invites.filter((i) => inviteLinkMatchesQuery(i, search))
    : invites;

  return (
    <div className="p-4">
      <div className="mb-4">
        <Input
          placeholder={t('common.search', { defaultValue: 'Search…' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface-100">
            <tr>
              <th className="p-2 text-left">Link</th>
              <th className="p-2 text-left">Created by</th>
              <th className="p-2 text-left">Expires</th>
              <th className="p-2 text-left">Uses</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((invite) => {
              const active =
                invite.active && new Date(invite.expiresAt) > new Date();
              return (
                <tr key={invite.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{invite.slug}</td>
                  <td className="p-2">@{invite.profile.handle}</td>
                  <td className="p-2 text-xs">
                    <UpdatingDate date={invite.expiresAt} />
                  </td>
                  <td className="p-2 text-xs">
                    {invite.redemptions.length}/{invite.maxUses}
                  </td>
                  <td className="p-2 text-xs">
                    <span
                      className={`rounded px-2 py-0.5 ${active ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}
                    >
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2">
                    <Button
                      title={active ? 'Deactivate' : 'Activate'}
                      variant="variant-ghost-primary"
                      action={() =>
                        (active ? deactivate : activate)({
                          id: invite.id,
                        })
                      }
                    >
                      {active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <InviteCreateModal onClose={() => setShowCreate(false)} />
      ) : null}
    </div>
  );
}

function InviteCreateModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const createInvite = openpeepsApi.admin.createInviteAction();
  const groupsQuery = openpeepsApi.useGroups();

  const [slug, setSlug] = useState('');
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
            <div className="bg-surface-100 flex items-center gap-2 rounded-md border p-2">
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

        <DialogFooter>
          {createdSlug ? (
            <Button variant="variant-filled-primary" action={onClose}>
              {t('admin.inviteLink.done', { defaultValue: 'Done' })}
            </Button>
          ) : (
            <>
              <Button variant="variant-ringed-primary" action={onClose}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                variant="variant-filled-primary"
                action={submit}
                disabled={submitting}
              >
                {t('admin.inviteLink.generateButton', {
                  defaultValue: 'Create Link',
                })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
