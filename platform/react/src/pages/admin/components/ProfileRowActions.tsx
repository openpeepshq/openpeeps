import { useState } from 'react';
import { MailIcon, PencilIcon, Trash2 } from 'lucide-react';
import type { ProfileWithMeta, Role } from '@openpeepshq/common/types';
import { useT, useOpenpeeps } from '../../../index';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PopupMenu,
  PopupMenuButton,
  PopupSection,
  PopupSeparator,
} from '@openpeepshq/react-ui';

export interface ProfileRowActionsProps {
  profile: ProfileWithMeta;
}

type ActiveModal = 'email' | 'roles' | 'delete' | null;

export function ProfileRowActions({ profile }: ProfileRowActionsProps) {
  const t = useT();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const account = profile.controllers?.[0];

  return (
    <>
      <PopupMenu placement="bottom-end" width="w-64">
        <div className="w-full space-y-2 p-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {t('profile.table.dateJoined', { defaultValue: 'Date joined' })}
            </span>
            <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {t('profile.table.emailVerified', {
                defaultValue: 'Email verified',
              })}
            </span>
            <span>{account?.emailValidated ? '✅' : '❌'}</span>
          </div>
        </div>
        <PopupSeparator />
        <PopupSection
          title={t('profile.table.actions', { defaultValue: 'Actions' })}
        />
        <PopupMenuButton
          icon={MailIcon}
          title={t('profile.table.editEmail', { defaultValue: 'Edit Email' })}
          text={t('profile.table.editEmail', { defaultValue: 'Edit Email' })}
          action={() => setActiveModal('email')}
        />
        <PopupMenuButton
          icon={PencilIcon}
          title={t('profile.table.editRoles', { defaultValue: 'Edit Roles' })}
          text={t('profile.table.editRoles', { defaultValue: 'Edit Roles' })}
          action={() => setActiveModal('roles')}
        />
        <PopupMenuButton
          icon={Trash2}
          title={t('profile.table.deleteMember', {
            defaultValue: 'Delete Member',
          })}
          text={t('profile.table.delete', { defaultValue: 'Delete' })}
          action={() => setActiveModal('delete')}
          danger
        />
      </PopupMenu>

      {activeModal === 'email' && account ? (
        <EditEmailModal
          profile={profile}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === 'roles' ? (
        <EditRolesModal
          profile={profile}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === 'delete' ? (
        <DeleteProfileModal
          profile={profile}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </>
  );
}

function EditEmailModal({
  profile,
  onClose,
}: {
  profile: ProfileWithMeta;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const account = profile.controllers?.[0];
  const updateAccount = openpeepsApi.admin.updateAccountAction({
    id: account?.id ?? '',
  });

  const [email, setEmail] = useState(account?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (email === account?.email) {
      setError(
        t('accounts.editEmail.sameEmail', {
          defaultValue: 'Enter a different email address than the current one.',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      await updateAccount({ email });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('accounts.editEmail.title', { defaultValue: 'Edit Email' })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 px-1">
          <Label htmlFor="edit-email-input">
            {t('accounts.editEmail.emailLabel', { defaultValue: 'Email' })}
          </Label>
          <Input
            id="edit-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogActions
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={t('accounts.editEmail.saveChanges', {
            defaultValue: 'Update Email',
          })}
          onAction={submit}
          disabled={submitting}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditRolesModal({
  profile,
  onClose,
}: {
  profile: ProfileWithMeta;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const rolesQuery = openpeepsApi.admin.useRolesList();
  const updateRoles = openpeepsApi.admin.updateProfileRolesAction({
    id: profile.id,
  });

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((profile.roles ?? []).map((r) => r.key)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRoles = rolesQuery.data ?? [];

  const toggle = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const roles: Role[] = allRoles.filter((r) => selected.has(r.key));
      await updateRoles({ roles });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('profile.modals.editProfile.title', {
              defaultValue: 'Edit Roles',
            })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('profile.modals.editProfile.description', {
            defaultValue: 'Choose one or more roles for this profile',
          })}
        </p>
        <div className="space-y-3 px-1">
          {allRoles.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('profile.modals.editProfile.roles', { defaultValue: 'Roles' })}
            </p>
          ) : (
            allRoles.map((role) => (
              <div
                key={role.key}
                className="flex items-center justify-between gap-4"
              >
                <Label
                  htmlFor={`role-${role.key}`}
                  classes="text-base font-medium"
                >
                  {role.displayName || role.key}
                </Label>
                <input
                  id={`role-${role.key}`}
                  type="checkbox"
                  checked={selected.has(role.key)}
                  onChange={(e) => toggle(role.key, e.target.checked)}
                  className="size-4"
                />
              </div>
            ))
          )}
        </div>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogActions
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={t('profile.modals.editProfile.saveChanges', {
            defaultValue: 'Save Changes',
          })}
          onAction={submit}
          disabled={submitting}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteProfileModal({
  profile,
  onClose,
}: {
  profile: ProfileWithMeta;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const account = profile.controllers?.[0];
  const deleteProfile = openpeepsApi.admin.deleteProfileAction({
    id: profile.id,
  });
  const deleteAccount = openpeepsApi.admin.deleteAccountAction({
    id: account?.id ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteProfile();
      if (account) await deleteAccount();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('profile.modals.deleteProfile.title', {
              defaultValue: 'Delete Profile',
            })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('profile.modals.deleteProfile.description', {
            defaultValue:
              'Are you sure you want to delete this profile? This action cannot be undone.',
            username: profile.displayName || profile.handle,
            handle: profile.handle,
          })}
        </p>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogActions
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={t('profile.modals.deleteProfile.delete', {
            defaultValue: 'Delete',
          })}
          onAction={submit}
          actionVariant="destructive"
          disabled={submitting}
        />
      </DialogContent>
    </Dialog>
  );
}
