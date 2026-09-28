import { useState } from 'react';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps } from '../../../index';
import { Button, Label, Toast } from '@openpeepshq/react-ui';
import {
  RoleCapabilityMatrix,
  RelationCapabilitiesEditor,
} from '../../../components';

const TAB_DEFAULT_ROLE = 'default-role';
const TAB_ROLES = 'roles';
const TAB_RELATIONS = 'relations';
const TAB_LIST = [TAB_DEFAULT_ROLE, TAB_ROLES, TAB_RELATIONS] as const;
type TabKey = (typeof TAB_LIST)[number];

function DefaultRoles({ base }: { base: CommunityConfig }) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'community',
  });
  const [roleOnRegistration, setRoleOnRegistration] = useState(
    base.roles.onRegistration.add?.[0] ?? 'pendingmember',
  );
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    setStatus(null);
    const roles = structuredClone(base.roles);
    roles.onRegistration.add = [roleOnRegistration];
    try {
      await updateConfig({ config: { roles } });
      setStatus({
        type: 'success',
        message: t('admin.configuration.community.defaultRoles.success'),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  };

  const handleRestoreDefaults = async () => {
    const defaultValue = 'pendingmember';
    if (roleOnRegistration === defaultValue) return;
    setRoleOnRegistration(defaultValue);
    await handleSubmit();
  };

  const isDefault = roleOnRegistration === 'pendingmember';

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold">
        {t('admin.configuration.community.defaultRoles.title')}
      </h3>
      <div className="flex flex-col gap-4">
        <Label
          title={t(
            'admin.configuration.community.defaultRoles.roleOnRegistration',
          )}
          description={t(
            'admin.configuration.community.defaultRoles.roleOnRegistrationDescription',
          )}
        >
          <select
            className="op-input"
            value={roleOnRegistration}
            onChange={(e) => setRoleOnRegistration(e.target.value)}
          >
            <option value="pendingmember">Pending Member</option>
            <option value="member">Member</option>
          </select>
        </Label>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            action={handleSubmit}
            title={t('common.save', { defaultValue: 'Save' })}
          >
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
          <Button
            variant="outline"
            action={handleRestoreDefaults}
            disabled={isDefault}
            title={t('common.restoreDefaults', {
              defaultValue: 'Restore defaults',
            })}
          >
            {t('common.restoreDefaults', { defaultValue: 'Restore defaults' })}
          </Button>
        </div>
        {status ? (
          <Toast variant={status.type} onDismiss={() => setStatus(null)}>
            {status.message}
          </Toast>
        ) : null}
      </div>
    </div>
  );
}

export function AdminConfigurationCommunityRoles() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead(
    'openpeeps',
    'community',
  );
  const rolesQuery = openpeepsApi.admin.useRolesList();

  useSetPageHeader(t('admin.configuration.community.capabilities.title'));

  const base = configQuery.data?.config as CommunityConfig | undefined;

  const loading =
    configQuery.isLoading || rolesQuery.isLoading || !base || !rolesQuery.data;

  const [activeTab, setActiveTab] = useState<TabKey>(TAB_DEFAULT_ROLE);

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    {
      key: TAB_DEFAULT_ROLE,
      label: t('admin.configuration.community.defaultRoles.title'),
    },
    {
      key: TAB_ROLES,
      label: t('admin.configuration.community.capabilities.rolesTitle', {
        defaultValue: 'Instance roles',
      }),
    },
    {
      key: TAB_RELATIONS,
      label: t('admin.configuration.community.capabilities.relationsTitle', {
        defaultValue: 'Relationship capabilities',
      }),
    },
  ];

  return (
    <div>
      <div className="border-border flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-primary text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {activeTab === TAB_DEFAULT_ROLE && <DefaultRoles base={base} />}
        {activeTab === TAB_ROLES && (
          <section>
            <p className="text-muted-foreground text-sm">
              {t(
                'admin.configuration.community.capabilities.rolesDescription',
                {
                  defaultValue:
                    'Set the capabilities granted by each instance role. The matrix mirrors group roles: click a cell to cycle empty -> allow (+) -> deny (-); ~ is inherited from a wildcard and x is locked.',
                },
              )}
            </p>
            <div className="mt-4">
              <RoleCapabilityMatrix roles={rolesQuery.data} />
            </div>
          </section>
        )}
        {activeTab === TAB_RELATIONS && (
          <section>
            <p className="text-muted-foreground text-sm">
              {t(
                'admin.configuration.community.capabilities.relationsDescription',
                {
                  defaultValue:
                    'Set the capabilities each relationship holds for posts, profiles, reports, and access tokens.',
                },
              )}
            </p>
            <div className="mt-4">
              <RelationCapabilitiesEditor />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
