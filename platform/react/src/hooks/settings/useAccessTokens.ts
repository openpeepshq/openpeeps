import { useState } from 'react';
import type {
  AccessTokenCreationData,
  AccessTokenWithMeta,
  PublicAccessToken,
  Scope,
  ScopeLevel,
} from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';

export const ACCESS_TOKEN_RESOURCE_TYPES = [
  '*',
  'posts',
  'profiles',
  'groups',
  'jams',
  'notifications',
  'reports',
  'webhooks',
] as const;

export type AccessTokenResourceType =
  (typeof ACCESS_TOKEN_RESOURCE_TYPES)[number];

export const ACCESS_TOKEN_SCOPE_LEVELS: ScopeLevel[] = [
  'read',
  'write',
  'admin',
];

export const ACCESS_TOKEN_EXPIRATION_OPTIONS = [
  {
    value: '7d',
    labelKey: 'settings.accessTokens.expirationOptions.sevenDays',
  },
  {
    value: '30d',
    labelKey: 'settings.accessTokens.expirationOptions.thirtyDays',
  },
  {
    value: '90d',
    labelKey: 'settings.accessTokens.expirationOptions.ninetyDays',
  },
  { value: '1y', labelKey: 'settings.accessTokens.expirationOptions.oneYear' },
] as const;

export const accessTokenScopeLabel = (scope: Scope) =>
  `${scope.scopeLevel ?? 'read'}:${scope.resource.type}:${scope.resource.id ?? '*'}`;

export type AccessTokenScopePatch = {
  scopeLevel?: ScopeLevel;
  resourceType?: AccessTokenResourceType;
};

export const updateScopeAt = (
  scopes: Scope[],
  index: number,
  patch: AccessTokenScopePatch,
): Scope[] =>
  scopes.map((s, i) =>
    i === index
      ? {
          ...s,
          scopeLevel: patch.scopeLevel ?? s.scopeLevel,
          resource: {
            ...s.resource,
            type: patch.resourceType ?? s.resource.type,
          },
        }
      : s,
  );

const defaultScope: Scope = {
  scopeLevel: 'read',
  resource: { type: 'posts', id: '*' },
};

const defaultForm: AccessTokenCreationData = {
  name: '',
  description: '',
  expirationTime: '30d',
  scopes: [defaultScope],
};

export const useAccessTokens = () => {
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

  const updateScope = (index: number, patch: AccessTokenScopePatch) =>
    setForm((f) => ({
      ...f,
      scopes: updateScopeAt(f.scopes ?? [], index, patch),
    }));

  const addScope = () =>
    setForm((f) => ({ ...f, scopes: [...(f.scopes ?? []), defaultScope] }));

  const removeScope = (index: number) =>
    setForm((f) => ({
      ...f,
      scopes: (f.scopes ?? []).filter((_, i) => i !== index),
    }));

  const create = async () => {
    setError(undefined);
    if (!form.name?.trim()) {
      setError(
        t('settings.accessTokens.nameRequired', {
          defaultValue: 'Name is required',
        }),
      );
      return;
    }
    if (!(form.scopes?.length ?? 0)) {
      setError(
        t('settings.accessTokens.scopeRequired', {
          defaultValue: 'At least one scope is required',
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
        t('settings.accessTokens.createError', {
          defaultValue: 'Failed to create token',
        }),
      );
    } finally {
      setCreating(false);
    }
  };

  const revoke = (accessTokenId: string) => revokeToken({ accessTokenId });

  return {
    tokens,
    form,
    setForm,
    creating,
    createdToken,
    error,
    clearError: () => setError(undefined),
    updateScope,
    addScope,
    removeScope,
    create,
    revoke,
  };
};
