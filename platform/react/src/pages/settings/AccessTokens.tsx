import { Copy } from 'lucide-react';
import type { ScopeLevel } from '@openpeepshq/common/types';
import { useT, useSetPageHeader } from '../../index';
import {
  Button,
  Input,
  Label,
  ShadcnBadge,
  Toast,
} from '@openpeepshq/react-ui';
import {
  ACCESS_TOKEN_EXPIRATION_OPTIONS,
  ACCESS_TOKEN_RESOURCE_TYPES,
  ACCESS_TOKEN_SCOPE_LEVELS,
  accessTokenScopeLabel,
  useAccessTokens,
  type AccessTokenResourceType,
} from '../../hooks';

export function AccessTokensSettings() {
  const t = useT();
  const {
    tokens,
    form,
    setForm,
    creating,
    createdToken,
    error,
    clearError,
    updateScope,
    addScope,
    removeScope,
    create,
    revoke,
  } = useAccessTokens();

  useSetPageHeader(
    t('settings.accessTokens.title', { defaultValue: 'Access tokens' }),
  );

  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('settings.accessTokens.createTitle', {
            defaultValue: 'Create token',
          })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('settings.accessTokens.createDescription', {
            defaultValue: 'Create a personal access token to use the API.',
          })}
        </p>
        <div className="space-y-2">
          <Label htmlFor="token-name">
            {t('settings.accessTokens.name', { defaultValue: 'Name' })}
          </Label>
          <Input
            id="token-name"
            value={form.name}
            placeholder={t('settings.accessTokens.namePlaceholder', {
              defaultValue: 'My integration',
            })}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token-description">
            {t('settings.accessTokens.descriptionLabel', {
              defaultValue: 'Description',
            })}
          </Label>
          <Input
            id="token-description"
            value={form.description ?? ''}
            placeholder={t('settings.accessTokens.descriptionPlaceholder', {
              defaultValue: 'What is this token for?',
            })}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token-expiration">
            {t('settings.accessTokens.expiration', {
              defaultValue: 'Expiration',
            })}
          </Label>
          <select
            id="token-expiration"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={form.expirationTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, expirationTime: e.target.value }))
            }
          >
            {ACCESS_TOKEN_EXPIRATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm font-medium">
          {t('settings.accessTokens.scopes', { defaultValue: 'Scopes' })}
        </p>

        {(form.scopes ?? []).map((scope, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <select
              className="border-input bg-background rounded-md border px-2 py-2 text-sm"
              value={scope.scopeLevel ?? 'read'}
              onChange={(e) =>
                updateScope(index, {
                  scopeLevel: e.target.value as ScopeLevel,
                })
              }
            >
              {ACCESS_TOKEN_SCOPE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <select
              className="border-input bg-background rounded-md border px-2 py-2 text-sm"
              value={scope.resource.type}
              onChange={(e) =>
                updateScope(index, {
                  resourceType: e.target.value as AccessTokenResourceType,
                })
              }
            >
              {ACCESS_TOKEN_RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={(form.scopes?.length ?? 0) === 1}
              action={() => removeScope(index)}
            >
              {t('common.remove', { defaultValue: 'Remove' })}
            </Button>
          </div>
        ))}

        <Button variant="outline" action={addScope}>
          {t('settings.accessTokens.addScope', { defaultValue: 'Add scope' })}
        </Button>

        {error ? (
          <Toast variant="error" onDismiss={clearError}>
            {error}
          </Toast>
        ) : null}

        <Button variant="default" disabled={creating} action={create}>
          {creating
            ? t('settings.accessTokens.creating', {
                defaultValue: 'Creating…',
              })
            : t('settings.accessTokens.create', {
                defaultValue: 'Create token',
              })}
        </Button>

        {createdToken ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-semibold">
              {t('settings.accessTokens.copyWarning', {
                defaultValue:
                  'Copy this token now. It will not be shown again.',
              })}
            </p>
            <div className="mt-2 flex items-start gap-2">
              <code className="break-all text-sm">{createdToken}</code>
              <button
                type="button"
                title={t('settings.accessTokens.copy', {
                  defaultValue: 'Copy',
                })}
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
          {t('settings.accessTokens.listTitle', {
            defaultValue: 'Your tokens',
          })}
        </h2>
        {tokens.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('settings.accessTokens.empty', {
              defaultValue: 'No access tokens yet.',
            })}
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
                    {t('settings.accessTokens.expiresAt', {
                      defaultValue: 'Expires',
                    })}
                    :{' '}
                    {token.expiresAt
                      ? new Date(token.expiresAt).toLocaleString()
                      : t('settings.accessTokens.never', {
                          defaultValue: 'Never',
                        })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!!token.revokedAt}
                  action={() => revoke(token.id)}
                >
                  {token.revokedAt
                    ? t('settings.accessTokens.revoked', {
                        defaultValue: 'Revoked',
                      })
                    : t('settings.accessTokens.revoke', {
                        defaultValue: 'Revoke',
                      })}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(token.scopes ?? []).length ? (
                  (token.scopes ?? []).map((scope, scopeIndex) => (
                    <ShadcnBadge key={scopeIndex} variant="outline">
                      {accessTokenScopeLabel(scope)}
                    </ShadcnBadge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {t('settings.accessTokens.noScopes', {
                      defaultValue: 'No scopes',
                    })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
