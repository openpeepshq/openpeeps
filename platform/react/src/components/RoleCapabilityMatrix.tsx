import { useEffect, useMemo, useState } from 'react';
import type { Role } from '@openpeepshq/common/types';
import { roleCapabilityEditorKeys } from '@openpeepshq/common/types';
import { checkRoleCapabilities } from '@openpeepshq/common/lib';
import { Button, Toast } from '@openpeepshq/react-ui';
import { useT } from '../i18n';
import { useOpenpeeps } from '../contexts/openpeeps';
import { useCurrentProfile } from './layout/IdentityContext';
import { CapabilityMatrix } from './CapabilityMatrix';
import type { CapabilityMatrixColumn } from './CapabilityMatrix';
import type { MatrixCapabilities } from '../lib/capabilityMatrix';

export interface RoleCapabilityMatrixProps {
  roles: Role[];
}

/**
 * Instance-admin matrix for the capabilities of every role. Columns are the
 * instance roles, rows are the role capability keys — mirrors the group roles
 * matrix, but without an "everyone" column since roles are independent.
 */
export function RoleCapabilityMatrix({ roles }: RoleCapabilityMatrixProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const updateRole = openpeepsApi.admin.updateRoleAction();

  const [draft, setDraft] = useState<MatrixCapabilities>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        roles.map((role) => [
          role.key,
          role.capabilities ?? { add: [], remove: [] },
        ]),
      ),
    );
  }, [roles]);

  const columns: CapabilityMatrixColumn[] = useMemo(
    () =>
      roles.map((role) => ({
        key: role.key,
        label: role.displayName || role.key,
      })),
    [roles],
  );

  const changedRoleIds = useMemo(
    () =>
      roles
        .filter(
          (role) =>
            JSON.stringify(draft[role.key]) !==
            JSON.stringify(role.capabilities ?? { add: [], remove: [] }),
        )
        .map((role) => role.id),
    [roles, draft],
  );

  const canUpdateRoles = checkRoleCapabilities(currentProfile?.roles ?? [], [
    'core-roles-update',
  ]).success;

  const handleSave = async () => {
    if (!canUpdateRoles || changedRoleIds.length === 0) return;
    setSaving(true);
    setStatus(null);
    try {
      await Promise.all(
        roles
          .filter((role) => changedRoleIds.includes(role.id))
          .map((role) =>
            updateRole(
              {
                key: role.key,
                default: role.default,
                displayName: role.displayName,
                description: role.description,
                capabilities: draft[role.key] ?? role.capabilities,
              },
              { roleId: role.id },
            ),
          ),
      );
      setStatus({
        type: 'success',
        message: t('capabilities.roles.saveSuccess', {
          defaultValue: 'Role capabilities updated',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CapabilityMatrix
        editorKeys={[...roleCapabilityEditorKeys]}
        columns={columns}
        value={draft}
        onChange={setDraft}
        i18nPrefix="capabilities.roles"
        stateI18nPrefix="groups.capabilities.state"
        everyoneColumn={undefined}
      />
      <div className="flex items-center gap-3 px-1">
        <Button
          variant="default"
          action={handleSave}
          disabled={saving || !canUpdateRoles || changedRoleIds.length === 0}
          loadingContent={t('common.saving', { defaultValue: 'Saving…' })}
          title={t('common.save', { defaultValue: 'Save' })}
        >
          {saving
            ? t('common.saving', { defaultValue: 'Saving…' })
            : t('common.save', { defaultValue: 'Save' })}
        </Button>
        {!canUpdateRoles ? (
          <span className="text-muted-foreground text-xs">
            {t('capabilities.roles.noUpdateCapability', {
              defaultValue:
                'You can view but not edit role capabilities without core-roles-update.',
            })}
          </span>
        ) : null}
      </div>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
