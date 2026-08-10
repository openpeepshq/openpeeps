import { useEffect, useState } from 'react';
import type { CommunityConfig, Role } from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps } from '@openpeepshq/react';
import { Button, Label, Toast } from '@openpeepshq/react-ui';

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
      <Button
        variant="variant-ghost-primary"
        action={handleSubmit}
        title="Save"
      >
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

const EVENT_CAPABILITY = 'core-posts-create-*';
const NOTE_CAPABILITIES = [
  'core-posts-create-note-*',
  'core-posts-create-question-*',
  'core-posts-create-article-*',
];
const GROUP_CAPABILITY = 'core-groups-create';

function RolesSimple({ roles }: { roles: Role[] }) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const updateRole = openpeepsApi.admin.updateRoleAction();
  const memberRole = roles.find((role) => role.key === 'member');
  const [canCreateEvents, setCanCreateEvents] = useState(false);
  const [canCreateGroups, setCanCreateGroups] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setCanCreateEvents(
      !!memberRole?.capabilities?.add?.includes(EVENT_CAPABILITY),
    );
    setCanCreateGroups(
      !!memberRole?.capabilities?.add?.includes(GROUP_CAPABILITY),
    );
  }, [memberRole]);

  const adjustCapabilities = (capabilities: string[]) => {
    let result = [...capabilities];
    if (canCreateGroups && !result.includes(GROUP_CAPABILITY)) {
      result = [...result, GROUP_CAPABILITY];
    }
    if (!canCreateGroups) {
      result = result.filter((c) => c !== GROUP_CAPABILITY);
    }
    if (canCreateEvents) {
      result = result.filter((c) => !NOTE_CAPABILITIES.includes(c));
      if (!result.includes(EVENT_CAPABILITY))
        result = [...result, EVENT_CAPABILITY];
    } else {
      result = result.filter((c) => c !== EVENT_CAPABILITY);
      for (const cap of NOTE_CAPABILITIES) {
        if (!result.includes(cap)) result = [...result, cap];
      }
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!memberRole) return;
    setStatus(null);
    try {
      await updateRole(
        {
          ...memberRole,
          default: false,
          capabilities: {
            add: adjustCapabilities(memberRole.capabilities?.add ?? []),
          },
        },
        { roleId: memberRole.id },
      );
      setStatus({
        type: 'success',
        message: t(
          'admin.configuration.community.roleConfigurationSimple.success',
        ),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-xl font-bold">
        {t('admin.configuration.community.roleConfigurationSimple.title')}
      </h3>
      <Label
        title={t(
          'admin.configuration.community.roleConfigurationSimple.membersCanCreateEvents.title',
        )}
        description={t(
          'admin.configuration.community.roleConfigurationSimple.membersCanCreateEvents.description',
        )}
        forCheckbox
      >
        <input
          type="checkbox"
          className="h-5 w-9"
          checked={canCreateEvents}
          onChange={(e) => setCanCreateEvents(e.target.checked)}
        />
      </Label>
      <Label
        title={t(
          'admin.configuration.community.roleConfigurationSimple.membersCanCreateGroups.title',
        )}
        description={t(
          'admin.configuration.community.roleConfigurationSimple.membersCanCreateGroups.description',
        )}
        forCheckbox
      >
        <input
          type="checkbox"
          className="h-5 w-9"
          checked={canCreateGroups}
          onChange={(e) => setCanCreateGroups(e.target.checked)}
        />
      </Label>
      <Button
        variant="variant-ghost-primary"
        action={handleSubmit}
        title="Save"
      >
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

  if (
    configQuery.isLoading ||
    rolesQuery.isLoading ||
    !base ||
    !rolesQuery.data
  ) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DefaultRoles base={base} />
      <RolesSimple roles={rolesQuery.data} />
    </div>
  );
}
