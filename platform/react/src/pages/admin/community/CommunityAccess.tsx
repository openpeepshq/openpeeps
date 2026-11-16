import { useState } from 'react';
import { type CoreConfig, type ConfigTree } from '@openpeepshq/common/types';
import {
  useT,
  useSetPageHeader,
  useOpenpeeps,
  diffConfigTrees,
} from '../../../index';
import { Label, Switch, Toast } from '@openpeepshq/react-ui';

/**
 * Open signups and public content live in the `openpeeps.core` config under
 * `server.*`, but are surfaced here (under Community Customization) so an
 * admin can update them without opening the raw Server settings tree editor.
 */
export function AdminConfigurationCommunityAccess() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead('openpeeps', 'core');
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'core',
  });

  useSetPageHeader(
    t('configuration.community.access.title', { defaultValue: 'Access' }),
  );

  const base = configQuery.data?.config as CoreConfig | undefined;
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const signUpsOpen = base?.server?.signUpsOpen ?? true;
  const publicContent = base?.server?.publicContent ?? false;

  const persist = async (patch: CoreConfig['server']) => {
    if (!base) return;
    setStatus(null);
    try {
      const diff = diffConfigTrees(
        base.server as unknown as ConfigTree,
        patch as unknown as ConfigTree,
      );
      if (Object.keys(diff).length === 0) return;
      await updateConfig({
        config: { server: diff } as Partial<CoreConfig>,
      });
      setStatus({
        type: 'success',
        message: t('configuration.community.access.updated', {
          defaultValue: 'Access settings updated',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  };

  if (configQuery.isLoading || !base) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.states.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <p className="text-muted-foreground text-sm">
        {t('configuration.community.access.description', {
          defaultValue:
            'Control who can join your community and who can see it',
        })}
      </p>

      <Label
        title={t('configuration.community.openRegistrations.title', {
          defaultValue: 'Open Signups',
        })}
        description={t(
          'configuration.community.openRegistrations.description',
          {
            defaultValue: 'Allow visitors to sign up for the community',
          },
        )}
        forCheckbox
      >
        <Switch
          checked={signUpsOpen}
          onCheckedChange={(next) =>
            void persist({ ...base.server, signUpsOpen: next })
          }
          data-testid="admin-community-access-signups"
        />
      </Label>

      <Label
        title={t('configuration.community.publicContent.title', {
          defaultValue: 'Public content',
        })}
        description={t('configuration.community.publicContent.description', {
          defaultValue:
            'Allow visitors to read public posts without an account',
        })}
        forCheckbox
      >
        <Switch
          checked={publicContent}
          onCheckedChange={(next) =>
            void persist({ ...base.server, publicContent: next })
          }
          data-testid="admin-community-access-public-content"
        />
      </Label>

      {status ? (
        <Toast
          variant={status.type}
          testId="admin-community-access-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
