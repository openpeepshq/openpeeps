import { useState } from 'react';
import { Copy } from 'lucide-react';
import type {
  AccessTokenCreationData,
  AccessTokenWithMeta,
  PublicAccessToken,
  Scope,
  ScopeLevel,
  ServiceResourceType,
} from '@openpeeps/common/types';
import { useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Button, Input, Label, Toast } from '@openpeeps/react-ui';

const SERVICE_RESOURCE_TYPES: (ServiceResourceType | '*')[] = [
  'analytics',
  'webhooks',
  'posts',
  'profiles',
];

const SCOPE_LEVELS: ScopeLevel[] = ['read', 'write', 'admin'];

const EXPIRATION_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
] as const;

const defaultForm: AccessTokenCreationData = {
  name: '',
  description: '',
  expirationTime: '30d',
  scopes: [{ scopeLevel: 'read', resource: { type: 'profiles', id: '*' } }],
};

const scopeLabel = (scope: Scope) =>
  `${scope.scopeLevel ?? 'read'}:${scope.resource.type}:${scope.resource.id ?? '*'}`;

export function AdminApiKeys() {
  const { openpeepsApi } = useOpenpeeps();
  const tokensQuery = openpeepsApi.admin.useServiceAccessTokens();
  const createToken = openpeepsApi.admin.createServiceAccessTokenAction();
  const revokeToken = openpeepsApi.admin.revokeServiceAccessTokenAction();

  useSetPageHeader('Service Access Tokens');

  const [form, setForm] = useState<AccessTokenCreationData>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const tokens = (tokensQuery.data ?? []) as PublicAccessToken[];

  const create = async () => {
    setError(undefined);
    if (!form.name?.trim()) {
      setError('Name is required.');
      return;
    }
    if (!(form.scopes?.length ?? 0)) {
      setError('At least one scope is required.');
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
      setError('Failed to create service token.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">Create Service Access Token</h2>
        <p className="text-sm opacity-80">
          Create a service token for integrations. Copy the token value when it
          is created.
        </p>
        <div className="space-y-2">
          <Label htmlFor="svc-name">Name</Label>
          <Input
            id="svc-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-description">Description</Label>
          <Input
            id="svc-description"
            value={form.description ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-expiration">Expiration</Label>
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
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm font-medium">Scopes</p>

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
              Remove
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
          Add Scope
        </Button>

        {error ? (
          <Toast variant="error" onDismiss={() => setError(undefined)}>
            {error}
          </Toast>
        ) : null}

        <Button variant="default" disabled={creating} action={create}>
          {creating ? 'Creating...' : 'Create Service Token'}
        </Button>

        {createdToken ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-semibold">
              Copy this token now. It will not be shown again.
            </p>
            <div className="mt-2 flex items-start gap-2">
              <code className="break-all text-sm">{createdToken}</code>
              <button
                type="button"
                title="Copy"
                onClick={() => void navigator.clipboard.writeText(createdToken)}
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">Service Access Tokens</h2>
        {tokens.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No service access tokens yet.
          </p>
        ) : (
          tokens.map((token) => (
            <div key={token.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{token.name}</p>
                  {token.description ? (
                    <p className="text-muted-foreground text-sm">
                      {token.description}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-xs">
                    Expires at:{' '}
                    {token.expiresAt
                      ? new Date(token.expiresAt).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!!token.revokedAt}
                  action={() => revokeToken({ accessTokenId: token.id })}
                >
                  {token.revokedAt ? 'Revoked' : 'Revoke'}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {token.scopes?.length ? (
                  token.scopes.map((scope, i) => (
                    <span
                      key={i}
                      className="rounded-full border px-2 py-1 text-xs"
                    >
                      {scopeLabel(scope)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs opacity-70">No scopes</span>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
