import { Button } from '@openpeepshq/react-ui';
import { useT, useSetPageHeader } from '../../index';
import { oauthScopeLabelKey, useConnectedApps } from '../../hooks';

export const ConnectedAppsSettings = () => {
  const t = useT();
  const { grants, revoke } = useConnectedApps();

  useSetPageHeader(
    t('settings.connectedApps.title', { defaultValue: 'Connected apps' }),
  );

  return (
    <div className="space-y-3 p-4">
      <p className="text-muted-foreground text-sm">
        {t('settings.connectedApps.description', {
          defaultValue:
            'Apps you signed in to with your account. Revoking access signs the app out.',
        })}
      </p>
      {grants.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('settings.connectedApps.empty', {
            defaultValue: 'No connected apps.',
          })}
        </p>
      ) : (
        grants.map((grant) => (
          <div key={grant.clientId} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{grant.clientName}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('settings.connectedApps.since', {
                    defaultValue: 'Connected since {{date}}',
                    date: new Date(grant.createdAt).toLocaleDateString(),
                  })}
                </p>
              </div>
              <Button variant="outline" action={() => revoke(grant.clientId)}>
                {t('settings.connectedApps.revoke', {
                  defaultValue: 'Revoke access',
                })}
              </Button>
            </div>
            <ul className="text-muted-foreground mt-2 list-disc pl-5 text-xs">
              {grant.scopes.map((scope) => (
                <li key={scope}>
                  {t(oauthScopeLabelKey(scope), { defaultValue: scope })}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};
