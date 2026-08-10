import { useState } from 'react';
import { Copy } from 'lucide-react';
import type {
  AccessTokenCreationData,
  AccessTokenWithMeta,
  PublicAccessToken,
  Scope,
  ScopeLevel,
  ServiceResourceType,
} from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeepshq/react';
import { Button, Input, Label, Toast } from '@openpeepshq/react-ui';

const SERVICE_RESOURCE_TYPES: (ServiceResourceType | '*')[] = [
  'analytics',
  'webhooks',
  'posts',
  'profiles',
];

const SCOPE_LEVELS: ScopeLevel[] = ['read', 'write', 'admin'];

const EXPIRATION_OPTIONS = [
  { value: '7d', labelKey: 'sevenDays' },
  { value: '30d', labelKey: 'thirtyDays' },
  { value: '90d', labelKey: 'ninetyDays' },
  { value: '1y', labelKey: 'oneYear' },
] as const;

const EXPIRATION_OPTION_DEFAULTS: Record<
  (typeof EXPIRATION_OPTIONS)[number]['labelKey'],
  string
> = {
  sevenDays: '7 days',
  thirtyDays: '30 days',
  ninetyDays: '90 days',
  oneYear: '1 year',
};

const defaultForm: AccessTokenCreationData = {
  name: '',
  description: '',
  expirationTime: '30d',
  scopes: [{ scopeLevel: 'read', resource: { type: 'profiles', id: '*' } }],
};

const scopeLabel = (scope: Scope) =>
  `${scope.scopeLevel ?? 'read'}:${scope.resource.type}:${scope.resource.id ?? '*'}`;

const isExpiredToken = (token: PublicAccessToken, now: number) =>
  token.expiresAt != null && new Date(token.expiresAt).getTime() <= now;

const TokenCard = ({
  token,
  onRevoke,
  expiresLabel,
  neverLabel,
  revokeLabel,
  revokedLabel,
  noScopesLabel,
}: {
  token: PublicAccessToken;
  onRevoke: (accessTokenId: string) => void;
  expiresLabel: string;
  neverLabel: string;
  revokeLabel: string;
  revokedLabel: string;
  noScopesLabel: string;
}) => (
  <div className="rounded-md border p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold">{token.name}</p>
        {token.description ? (
          <p className="text-muted-foreground text-sm">{token.description}</p>
        ) : null}
        <p className="text-muted-foreground mt-1 text-xs">
          {expiresLabel}:{' '}
          {token.expiresAt
            ? new Date(token.expiresAt).toLocaleString()
            : neverLabel}
        </p>
      </div>
      <Button
        variant="outline"
        disabled={!!token.revokedAt}
        action={() => onRevoke(token.id)}
      >
        {token.revokedAt ? revokedLabel : revokeLabel}
      </Button>
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {token.scopes?.length ? (
        token.scopes.map((scope, i) => (
          <span key={i} className="rounded-full border px-2 py-1 text-xs">
            {scopeLabel(scope)}
          </span>
        ))
      ) : (
        <span className="text-xs opacity-70">{noScopesLabel}</span>
      )}
    </div>
  </div>
);

export const AdminApiKeys = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const tokensQuery = openpeepsApi.admin.useServiceAccessTokens();
  const createToken = openpeepsApi.admin.createServiceAccessTokenAction();
  const revokeToken = openpeepsApi.admin.revokeServiceAccessTokenAction();

  useSetPageHeader(
    t('admin.apiKeys.title', { defaultValue: 'Service Access Tokens' }),
  );

  const [form, setForm] = useState<AccessTokenCreationData>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const tokens = (tokensQuery.data ?? []) as PublicAccessToken[];
  const now = Date.now();
  const activeTokens = tokens.filter((token) => !isExpiredToken(token, now));
  const expiredTokens = tokens.filter((token) => isExpiredToken(token, now));

  const create = async () => {
    setError(undefined);
    if (!form.name?.trim()) {
      setError(
        t('admin.apiKeys.nameRequired', { defaultValue: 'Name is required.' }),
      );
      return;
    }
    if (!(form.scopes?.length ?? 0)) {
      setError(
        t('admin.apiKeys.scopeRequired', {
          defaultValue: 'At least one scope is required.',
        }),
      );
      return;
    }

    setCreating(true);
    setCreatedToken(undefined);
    try {
      const created = (await createToken({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        expirationTime: form.expirationTime,
        scopes: (form.scopes ?? []).map((scope) => ({
          ...scope,
          resource: { ...scope.resource, id: '*' },
        })),
      })) as AccessTokenWithMeta;
      setCreatedToken(created.signedToken);
      setForm(defaultForm);
    } catch {
      setError(
        t('admin.apiKeys.createError', {
          defaultValue: 'Failed to create service token.',
        }),
      );
    } finally {
      setCreating(false);
    }
  };

  const cardLabels = {
    expiresLabel: t('admin.apiKeys.expiresAt', { defaultValue: 'Expires at' }),
    neverLabel: t('admin.apiKeys.never', { defaultValue: 'Never' }),
    revokeLabel: t('admin.apiKeys.revoke', { defaultValue: 'Revoke' }),
    revokedLabel: t('admin.apiKeys.revoked', { defaultValue: 'Revoked' }),
    noScopesLabel: t('admin.apiKeys.noScopes', { defaultValue: 'No scopes' }),
  };

  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('admin.apiKeys.createTitle', {
            defaultValue: 'Create Service Access Token',
          })}
        </h2>
        <p className="text-sm opacity-80">
          {t('admin.apiKeys.createDescription', {
            defaultValue:
              'Create a service token for integrations. Copy the token value when it is created.',
          })}
        </p>
        <div className="space-y-2">
          <Label htmlFor="svc-name">
            {t('admin.apiKeys.name', { defaultValue: 'Name' })}
          </Label>
          <Input
            id="svc-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-description">
            {t('admin.apiKeys.descriptionLabel', {
              defaultValue: 'Description',
            })}
          </Label>
          <Input
            id="svc-description"
            value={form.description ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-expiration">
            {t('admin.apiKeys.expiration', { defaultValue: 'Expiration' })}
          </Label>
          <select
            id="svc-expiration"
            className="border-input bg-background w-full rounded-md border px-2 py-2 text-sm"
            value={form.expirationTime ?? '30d'}
            onChange={(e) =>
              setForm((f) => ({ ...f, expirationTime: e.target.value }))
            }
          >
            {EXPIRATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`admin.apiKeys.expirationOptions.${option.labelKey}`, {
                  defaultValue: EXPIRATION_OPTION_DEFAULTS[option.labelKey],
                })}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm font-medium">
          {t('admin.apiKeys.scopes', { defaultValue: 'Scopes' })}
        </p>

        {(form.scopes ?? []).map((scope, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <select
              className="border-input bg-background rounded-md border px-2 py-2 text-sm"
              value={scope.scopeLevel ?? 'read'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  scopes: (f.scopes ?? []).map((s, i) =>
                    i === index
                      ? { ...s, scopeLevel: e.target.value as ScopeLevel }
                      : s,
                  ),
                }))
              }
            >
              {SCOPE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <select
              className="border-input bg-background rounded-md border px-2 py-2 text-sm"
              value={scope.resource.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  scopes: (f.scopes ?? []).map((s, i) =>
                    i === index
                      ? {
                          ...s,
                          resource: {
                            ...s.resource,
                            type: e.target.value as ServiceResourceType | '*',
                          },
                        }
                      : s,
                  ),
                }))
              }
            >
              {SERVICE_RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={(form.scopes?.length ?? 0) === 1}
              action={() =>
                setForm((f) => ({
                  ...f,
                  scopes: (f.scopes ?? []).filter((_, i) => i !== index),
                }))
              }
            >
              {t('admin.apiKeys.removeScope', { defaultValue: 'Remove' })}
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          action={() =>
            setForm((f) => ({
              ...f,
              scopes: [
                ...(f.scopes ?? []),
                { scopeLevel: 'read', resource: { type: 'profiles', id: '*' } },
              ],
            }))
          }
        >
          {t('admin.apiKeys.addScope', { defaultValue: 'Add Scope' })}
        </Button>

        {error ? (
          <Toast variant="error" onDismiss={() => setError(undefined)}>
            {error}
          </Toast>
        ) : null}

        <Button variant="default" disabled={creating} action={create}>
          {creating
            ? t('admin.apiKeys.creating', { defaultValue: 'Creating...' })
            : t('admin.apiKeys.create', {
                defaultValue: 'Create Service Token',
              })}
        </Button>

        {createdToken ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-semibold">
              {t('admin.apiKeys.copyWarning', {
                defaultValue:
                  'Copy this token now. It will not be shown again.',
              })}
            </p>
            <div className="mt-2 flex items-start gap-2">
              <code className="break-all text-sm">{createdToken}</code>
              <button
                type="button"
                title={t('admin.apiKeys.copy', { defaultValue: 'Copy' })}
                onClick={() => void navigator.clipboard.writeText(createdToken)}
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('admin.apiKeys.listTitle', {
            defaultValue: 'Service Access Tokens',
          })}
        </h2>
        {activeTokens.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('admin.apiKeys.empty', {
              defaultValue: 'No active service access tokens.',
            })}
          </p>
        ) : (
          activeTokens.map((token) => (
            <TokenCard
              key={token.id}
              token={token}
              onRevoke={(accessTokenId) => revokeToken({ accessTokenId })}
              {...cardLabels}
            />
          ))
        )}

        {expiredTokens.length > 0 ? (
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t('admin.apiKeys.expiredToggle', {
                count: expiredTokens.length,
                defaultValue: 'Expired tokens ({{count}})',
              })}
            </summary>
            <div className="mt-3 space-y-3">
              {expiredTokens.map((token) => (
                <TokenCard
                  key={token.id}
                  token={token}
                  onRevoke={(accessTokenId) => revokeToken({ accessTokenId })}
                  {...cardLabels}
                />
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
};
