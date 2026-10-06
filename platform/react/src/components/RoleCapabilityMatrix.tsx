import { useEffect, useMemo, useState } from 'react';
import type { Role } from '@openpeepshq/common/types';
import {
  currentRoleDefaults,
  defaultRoles,
  roleCapabilityEditorKeys,
} from '@openpeepshq/common/types';
import { checkRoleCapabilities } from '@openpeepshq/common/lib';
import { Button, Input, Switch, Toast } from '@openpeepshq/react-ui';
import { useT } from '../i18n';
import { useOpenpeeps } from '../contexts/openpeeps';
import { useCurrentProfile } from './layout/IdentityContext';
import { CapabilityMatrix } from './CapabilityMatrix';
import type { CapabilityMatrixColumn } from './CapabilityMatrix';
import type { MatrixCapabilities } from '../lib/capabilityMatrix';
import { filterRoles, roleDefaultCapabilities } from '../lib/capabilityMatrix';

export interface RoleCapabilityMatrixProps {
  roles: Role[];
}

const builtInRoleKeys = new Set(defaultRoles.map((role) => role.key));

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
  const [showDefault, setShowDefault] = useState(true);
  const [showCustom, setShowCustom] = useState(true);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadedDraft = useMemo(
    () =>
      Object.fromEntries(
        roles.map((role) => [
          role.key,
          role.capabilities ?? { add: [], remove: [] },
        ]),
      ) as MatrixCapabilities,
    [roles],
  );

  useEffect(() => {
    setDraft(loadedDraft);
  }, [loadedDraft]);

  const roleDefaults = useMemo(() => roleDefaultCapabilities(roles), [roles]);

  const columns: CapabilityMatrixColumn[] = useMemo(
    () =>
      filterRoles(roles, { showDefault, showCustom, filter }).map((role) => ({
        key: role.key,
        label: role.displayName || role.key,
      })),
    [roles, showDefault, showCustom, filter],
  );
  const visibleCount = columns.length;

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

  const deviatesFromDefaults = useMemo(
    () =>
      roles.some(
        (role) =>
          JSON.stringify(draft[role.key]) !==
          JSON.stringify(roleDefaults[role.key]),
      ),
    [roles, draft, roleDefaults],
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
                // Anchor built-in roles to the defaults version they are
                // customized against, so later default changes can be merged
                // back into the customization on server start.
                ...(builtInRoleKeys.has(role.key)
                  ? { baseVersion: currentRoleDefaults.version }
                  : {}),
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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showDefault} onCheckedChange={setShowDefault} />
          {t('capabilities.roles.defaultRoles', {
            defaultValue: 'Default roles',
          })}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showCustom} onCheckedChange={setShowCustom} />
          {t('capabilities.roles.customRoles', {
            defaultValue: 'Custom roles',
          })}
        </label>
        <Input
          className="max-w-56"
          value={filter}
          placeholder={t('capabilities.roles.filterPlaceholder', {
            defaultValue: 'Filter roles…',
          })}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {visibleCount === 0 ? (
        <p className="text-muted-foreground px-1 text-sm">
          {t('capabilities.roles.noRolesMatch', {
            defaultValue: 'No roles match the filter.',
          })}
        </p>
      ) : (
        <CapabilityMatrix
          editorKeys={[...roleCapabilityEditorKeys]}
          columns={columns}
          value={draft}
          onChange={setDraft}
          i18nPrefix="capabilities.roles"
          stateI18nPrefix="groups.capabilities.state"
          everyoneColumn={undefined}
          defaultCapabilities={loadedDraft}
        />
      )}
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
        {canUpdateRoles && deviatesFromDefaults ? (
          <Button
            variant="outline"
            action={() => setDraft(roleDefaults)}
            title={t('common.restoreDefaults', {
              defaultValue: 'Restore defaults',
            })}
          >
            {t('common.restoreDefaults', { defaultValue: 'Restore defaults' })}
          </Button>
        ) : null}
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
