import { useState } from 'react';
import type { CoreConfig, OAuthClientCreated } from '@openpeepshq/common/types';
import { Button, Input, Label, Switch, Toast } from '@openpeepshq/react-ui';
import { useOpenpeeps, useSetPageHeader, useT } from '../../index';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

const emptyForm = {
  name: '',
  redirectUris: '',
  confidential: false,
  firstParty: false,
};

export const AdminOAuthClients = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const clientsQuery = openpeepsApi.admin.useOAuthClients();
  const createClient = openpeepsApi.admin.createOAuthClientAction();
  const deleteClient = openpeepsApi.admin.deleteOAuthClientAction();
  const rotateClientSecret = openpeepsApi.admin.rotateOAuthClientSecretAction();
  const configQuery = openpeepsApi.admin.useConfigRead('openpeeps', 'core');
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'core',
  });

  useSetPageHeader(
    t('configuration.oauthClients.title', { defaultValue: 'OAuth clients' }),
  );

  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<OAuthClientCreated | undefined>();
  const [rotated, setRotated] = useState<
    { id: string; clientSecret: string } | undefined
  >();
  const [error, setError] = useState<string | undefined>();

  const core = configQuery.data?.config as CoreConfig | undefined;
  const clients = clientsQuery.data ?? [];

  const create = async () => {
    setError(undefined);
    setCreating(true);
    try {
      setCreated(
        await createClient({
          name: form.name.trim(),
          redirectUris: form.redirectUris
            .split('\n')
            .map((uri) => uri.trim())
            .filter(Boolean),
          confidential: form.confidential,
          firstParty: form.firstParty,
        }),
      );
      setForm(emptyForm);
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setCreating(false);
    }
  };

  const rotate = async (clientId: string) => {
    setError(undefined);
    try {
      const result = await rotateClientSecret({ clientId });
      if (result?.clientSecret) {
        setRotated({ id: clientId, clientSecret: result.clientSecret });
      }
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Label
        title={t('configuration.oauthClients.dynamicRegistration', {
          defaultValue: 'Allow dynamic client registration',
        })}
        description={t('configuration.oauthClients.dynamicRegistrationHint', {
          defaultValue:
            'Lets any app register itself as a public client. Users still have to approve every app.',
        })}
        forCheckbox
      >
        <Switch
          checked={!!core?.oauth?.dynamicRegistration}
          onCheckedChange={(dynamicRegistration) =>
            void updateConfig({ config: { oauth: { dynamicRegistration } } })
          }
        />
      </Label>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('configuration.oauthClients.createTitle', {
            defaultValue: 'Register a client',
          })}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="oauth-client-name">
            {t('common.labels.name', { defaultValue: 'Name' })}
          </Label>
          <Input
            id="oauth-client-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oauth-client-redirects">
            {t('configuration.oauthClients.redirectUris', {
              defaultValue: 'Redirect URIs (one per line)',
            })}
          </Label>
          <textarea
            id="oauth-client-redirects"
            className="border-input bg-background w-full rounded-md border px-2 py-2 text-sm"
            rows={3}
            value={form.redirectUris}
            onChange={(e) =>
              setForm((f) => ({ ...f, redirectUris: e.target.value }))
            }
          />
        </div>
        <Label
          title={t('configuration.oauthClients.confidential', {
            defaultValue: 'Confidential (server-side app with a secret)',
          })}
          forCheckbox
        >
          <Switch
            checked={form.confidential}
            onCheckedChange={(confidential) =>
              setForm((f) => ({ ...f, confidential }))
            }
          />
        </Label>
        <Label
          title={t('configuration.oauthClients.firstParty', {
            defaultValue: 'First-party (may request full account access)',
          })}
          forCheckbox
        >
          <Switch
            checked={form.firstParty}
            onCheckedChange={(firstParty) =>
              setForm((f) => ({ ...f, firstParty }))
            }
          />
        </Label>
        {error ? (
          <Toast variant="error" onDismiss={() => setError(undefined)}>
            {error}
          </Toast>
        ) : null}
        <Button
          variant="default"
          disabled={creating || !form.name.trim() || !form.redirectUris.trim()}
          action={create}
        >
          {t('configuration.oauthClients.create', { defaultValue: 'Register' })}
        </Button>
        {created ? (
          <div className="space-y-1 rounded-md border p-3 text-sm">
            <p>
              {t('configuration.oauthClients.clientId', {
                defaultValue: 'Client ID',
              })}
              : <code className="break-all">{created.id}</code>
            </p>
            {created.clientSecret ? (
              <>
                <p>
                  {t('configuration.oauthClients.clientSecret', {
                    defaultValue: 'Client secret',
                  })}
                  : <code className="break-all">{created.clientSecret}</code>
                </p>
                <p className="font-semibold">
                  {t('settings.accessTokens.copyWarning', {
                    defaultValue:
                      'Copy this token now. It will not be shown again.',
                  })}
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('configuration.oauthClients.listTitle', {
            defaultValue: 'Registered clients',
          })}
        </h2>
        {clients.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('configuration.oauthClients.empty', {
              defaultValue: 'No OAuth clients yet.',
            })}
          </p>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{client.name}</p>
                <code className="text-muted-foreground break-all text-xs">
                  {client.id}
                </code>
                <ul className="text-muted-foreground mt-1 text-xs">
                  {client.redirectUris.map((uri) => (
                    <li key={uri} className="break-all">
                      {uri}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-1 text-xs">
                  {[
                    client.confidential &&
                      t('configuration.oauthClients.confidentialBadge', {
                        defaultValue: 'confidential',
                      }),
                    client.firstParty &&
                      t('configuration.oauthClients.firstPartyBadge', {
                        defaultValue: 'first-party',
                      }),
                    client.dynamic &&
                      t('configuration.oauthClients.dynamicBadge', {
                        defaultValue: 'self-registered',
                      }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {client.confidential ? (
                  <Button variant="outline" action={() => rotate(client.id)}>
                    {t('configuration.oauthClients.rotate', {
                      defaultValue: 'Rotate secret',
                    })}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  action={() => deleteClient({ clientId: client.id })}
                >
                  {t('common.actions.delete', { defaultValue: 'Delete' })}
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
      {rotated ? (
        <div className="space-y-1 rounded-md border p-3 text-sm">
          <p className="font-semibold">
            {t('configuration.oauthClients.rotatedTitle', {
              defaultValue: 'New client secret',
            })}
          </p>
          <p>
            {t('configuration.oauthClients.clientId', {
              defaultValue: 'Client ID',
            })}
            : <code className="break-all">{rotated.id}</code>
          </p>
          <p>
            {t('configuration.oauthClients.clientSecret', {
              defaultValue: 'Client secret',
            })}
            : <code className="break-all">{rotated.clientSecret}</code>
          </p>
          <p className="font-semibold">
            {t('configuration.oauthClients.rotatedWarning', {
              defaultValue:
                'The old secret no longer works. Copy this one now — it will not be shown again.',
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
};
