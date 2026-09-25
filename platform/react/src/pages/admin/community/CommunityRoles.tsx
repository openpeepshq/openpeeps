import { useState } from 'react';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps } from '../../../index';
import { Button, Label, Toast } from '@openpeepshq/react-ui';
import {
  RoleCapabilityMatrix,
  RelationCapabilitiesEditor,
} from '../../../components';

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

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-xl font-bold">
        {t('admin.configuration.community.defaultRoles.title')}
      </h3>
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
      <Button variant="ghost" action={handleSubmit} title="Save">
        Save
      </Button>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
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

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <DefaultRoles base={base} />
      <section>
        <h3 className="text-xl font-bold">
          {t('admin.configuration.community.capabilities.rolesTitle', {
            defaultValue: 'Instance roles',
          })}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t('admin.configuration.community.capabilities.rolesDescription', {
            defaultValue:
              'Set the capabilities granted by each instance role. The matrix mirrors group roles: click a cell to cycle empty -> allow (+) -> deny (-); ~ is inherited from a wildcard and x is locked.',
          })}
        </p>
        <RoleCapabilityMatrix roles={rolesQuery.data} />
      </section>
      <section>
        <h3 className="text-xl font-bold">
          {t('admin.configuration.community.capabilities.relationsTitle', {
            defaultValue: 'Relationship capabilities',
          })}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t(
            'admin.configuration.community.capabilities.relationsDescription',
            {
              defaultValue:
                'Set the capabilities each relationship holds for posts, profiles, reports, and access tokens.',
            },
          )}
        </p>
        <RelationCapabilitiesEditor />
      </section>
    </div>
  );
}
