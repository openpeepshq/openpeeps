import { useState } from 'react';
import { Copy } from 'lucide-react';
import type {
  AccessTokenCreationData,
  AccessTokenWithMeta,
  PublicAccessToken,
  ScopeLevel,
} from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Button, Input, Label } from '@openpeeps/react-ui';

const RESOURCE_TYPES = [
  '*',
  'posts',
  'profiles',
  'groups',
  'jams',
  'notifications',
  'reports',
  'webhooks',
] as const;

const SCOPE_LEVELS: ScopeLevel[] = ['read', 'write', 'admin'];

const defaultForm: AccessTokenCreationData = {
  name: '',
  description: '',
  expirationTime: '30d',
  scopes: [{ scopeLevel: 'read', resource: { type: 'posts', id: '*' } }],
};

export function AccessTokensSettings() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const tokensQuery = openpeepsApi.useCurrentProfileAccessTokens();
  const createToken = openpeepsApi.createCurrentProfileAccessTokenAction();
  const revokeToken = openpeepsApi.revokeCurrentProfileAccessTokenAction();

  const [form, setForm] = useState<AccessTokenCreationData>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const tokens = (tokensQuery.data ?? []) as PublicAccessToken[];

  const create = async () => {
    setError(undefined);
    if (!form.name?.trim()) {
      setError(t('settings.accessTokens.nameRequired', { defaultValue: 'Name is required' }));
      return;
    }
    if (!(form.scopes?.length ?? 0)) {
      setError(t('settings.accessTokens.scopeRequired', { defaultValue: 'At least one scope is required' }));
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
      setError(t('settings.accessTokens.createError', { defaultValue: 'Failed to create token' }));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">
        {t('settings.accessTokens.title', { defaultValue: 'Access tokens' })}
      </h1>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('settings.accessTokens.createTitle', { defaultValue: 'Create token' })}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="token-name">Name</Label>
          <Input
            id="token-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token-description">Description</Label>
          <Input
            id="token-description"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token-expiration">Expiration</Label>
          <select
            id="token-expiration"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={form.expirationTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, expirationTime: e.target.value }))
            }
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="1y">1 year</option>
          </select>
        </div>

        {(form.scopes ?? []).map((scope, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <select
              className="border-input bg-background rounded-md border px-2 py-2 text-sm"
              value={scope.scopeLevel ?? 'read'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  scopes: (f.scopes ?? []).map((s, i) =>
                    i === index ? { ...s, scopeLevel: e.target.value as ScopeLevel } : s,
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
                            type: e.target.value as (typeof RESOURCE_TYPES)[number],
                          },
                        }
                      : s,
                  ),
                }))
              }
            >
              {RESOURCE_TYPES.map((type) => (
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
                { scopeLevel: 'read', resource: { type: 'posts', id: '*' } },
              ],
            }))
          }
        >
          Add scope
        </Button>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <Button variant="default" disabled={creating} action={create}>
          {creating ? 'Creating…' : 'Create token'}
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
        <h2 className="text-lg font-medium">Your tokens</h2>
        {tokens.length === 0 ? (
          <p className="text-muted-foreground text-sm">No access tokens yet.</p>
        ) : (
          tokens.map((token) => (
            <div key={token.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{token.name}</p>
                  {token.description ? (
                    <p className="text-muted-foreground text-sm">{token.description}</p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-xs">
                    Expires:{' '}
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
            </div>
          ))
        )}
      </section>
    </div>
  );
}
