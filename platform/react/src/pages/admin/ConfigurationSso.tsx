import { useState } from 'react';
import { SSO_ADD_KINDS, ssoOidcKind } from '@openpeepshq/common/lib';
import { useNavigate, useSetPageHeader } from '../../index';
import { Button, Label, Switch, Toast } from '@openpeepshq/react-ui';
import { Building2, IdCard, Puzzle, type LucideIcon } from 'lucide-react';
import {
  siAuth0,
  siAuthentik,
  siDiscord,
  siGithub,
  siGitlab,
  siGoogle,
  siKeycloak,
  siOkta,
  siOpenid,
  type SimpleIcon,
} from 'simple-icons';
import {
  fromGeneric,
  fromOidc,
  SsoProviderFields,
  toGeneric,
  toOidc,
  useSsoConfig,
  validateProviderForm,
  type ProviderFormState,
} from './configurationSsoShared';

const BrandIcon = ({
  icon,
  className,
}: {
  icon: SimpleIcon;
  className?: string;
}) => (
  <svg role="img" viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d={icon.path} fill="currentColor" />
  </svg>
);

// Entra and Pocket ID have no Simple Icons entry (Microsoft marks were
// removed; Pocket ID is not in the set).
type KindIcon = { brand: SimpleIcon } | { lucide: LucideIcon };

const KIND_ICONS: Record<(typeof SSO_ADD_KINDS)[number], KindIcon> = {
  gitlab: { brand: siGitlab },
  'gitlab-selfhosted': { brand: siGitlab },
  github: { brand: siGithub },
  google: { brand: siGoogle },
  entra: { lucide: Building2 },
  discord: { brand: siDiscord },
  auth0: { brand: siAuth0 },
  okta: { brand: siOkta },
  keycloak: { brand: siKeycloak },
  authentik: { brand: siAuthentik },
  pocketid: { lucide: IdCard },
  oidc: { brand: siOpenid },
  generic: { lucide: Puzzle },
};

export function AdminConfigurationSso() {
  const navigate = useNavigate();
  const { t, core, sso, persist, saving, status, setStatus, configQuery } =
    useSsoConfig();

  useSetPageHeader(t('configuration.sso.title', { defaultValue: 'SSO' }));

  const [editing, setEditing] = useState<
    { bucket: 'oidc' | 'generic'; id: string } | undefined
  >();
  const [editForm, setEditForm] = useState<ProviderFormState | undefined>();

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    const error = validateProviderForm(editForm, t, editing.id, sso);
    if (error) {
      setStatus({ type: 'error', message: error });
      return;
    }
    if (editing.bucket === 'generic') {
      await persist({
        generic: sso.generic.map((provider) =>
          provider.id === editing.id ? toGeneric(editForm) : provider,
        ),
      });
    } else {
      await persist({
        oidc: sso.oidc.map((provider) =>
          provider.id === editing.id ? toOidc(editForm) : provider,
        ),
      });
    }
    setEditing(undefined);
    setEditForm(undefined);
  };

  const removeProvider = async (bucket: 'oidc' | 'generic', id: string) => {
    if (bucket === 'generic') {
      await persist({
        generic: sso.generic.filter((provider) => provider.id !== id),
      });
    } else {
      await persist({
        oidc: sso.oidc.filter((provider) => provider.id !== id),
      });
    }
    if (editing?.id === id) {
      setEditing(undefined);
      setEditForm(undefined);
    }
  };

  if (configQuery.isLoading || !core) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const listed = [
    ...sso.oidc.map((provider) => ({
      bucket: 'oidc' as const,
      id: provider.id,
      name: provider.name,
      kind: ssoOidcKind(provider),
    })),
    ...sso.generic.map((provider) => ({
      bucket: 'generic' as const,
      id: provider.id,
      name: provider.name,
      kind: 'generic' as const,
    })),
  ];

  return (
    <div className="space-y-8 p-4">
      <p className="text-sm opacity-80">{t('configuration.sso.intro')}</p>

      <Label
        title={t('configuration.sso.onlySSO')}
        description={t('configuration.sso.onlySSODescription')}
        forCheckbox
      >
        <Switch
          checked={!!sso.onlySSO}
          onCheckedChange={(onlySSO) => void persist({ onlySSO })}
          data-testid="admin-sso-only"
        />
      </Label>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">
          {t('configuration.sso.providers')}
        </h3>
        {listed.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('configuration.sso.empty')}
          </p>
        ) : (
          listed.map((item) => {
            const isEditing =
              editing?.bucket === item.bucket && editing.id === item.id;
            return (
              <div
                key={`${item.bucket}:${item.id}`}
                className="bg-surface-2 space-y-3 rounded-lg p-4"
                data-testid={`admin-sso-provider-${item.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {t(`configuration.sso.kind.${item.kind}`)} · {item.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      title={t('configuration.sso.editProvider')}
                      action={() => {
                        if (isEditing) {
                          setEditing(undefined);
                          setEditForm(undefined);
                          return;
                        }
                        setEditing({ bucket: item.bucket, id: item.id });
                        setEditForm(
                          item.bucket === 'generic'
                            ? fromGeneric(
                                sso.generic.find(
                                  (provider) => provider.id === item.id,
                                )!,
                              )
                            : fromOidc(
                                sso.oidc.find(
                                  (provider) => provider.id === item.id,
                                )!,
                              ),
                        );
                      }}
                    >
                      {isEditing
                        ? t('configuration.sso.cancelEdit')
                        : t('configuration.sso.editProvider')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title={t('configuration.sso.removeProvider')}
                      action={() => void removeProvider(item.bucket, item.id)}
                    >
                      {t('configuration.sso.removeProvider')}
                    </Button>
                  </div>
                </div>
                {isEditing && editForm ? (
                  <SsoProviderFields
                    form={editForm}
                    onChange={setEditForm}
                    lockId
                    host={core.server.host}
                  />
                ) : null}
                {isEditing ? (
                  <div className="flex justify-end">
                    <Button
                      title={t('configuration.sso.saveProvider')}
                      action={() => void saveEdit()}
                      disabled={saving}
                      loading={saving}
                    >
                      {t('configuration.sso.saveProvider')}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">
          {t('configuration.sso.addTitle')}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t('configuration.sso.addChooseType')}
        </p>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          data-testid="admin-sso-type-grid"
        >
          {SSO_ADD_KINDS.map((kind) => {
            const icon = KIND_ICONS[kind];
            return (
              <button
                key={kind}
                type="button"
                data-testid={`admin-sso-type-${kind}`}
                onClick={() => navigate(`/admin/configuration/sso/new/${kind}`)}
                className="hover:bg-surface border-border flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center"
              >
                {'brand' in icon ? (
                  <BrandIcon icon={icon.brand} className="size-8" />
                ) : (
                  <icon.lucide className="size-8" aria-hidden="true" />
                )}
                <span className="text-sm font-medium">
                  {t(`configuration.sso.types.${kind}.title`)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {status ? (
        <Toast
          variant={status.type}
          testId="admin-sso-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
