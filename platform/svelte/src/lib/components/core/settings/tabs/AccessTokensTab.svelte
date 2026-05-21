<script lang="ts">
  import type {
    AccessTokenCreationData,
    AccessTokenWithMeta,
    PublicAccessToken,
    Scope,
    ScopeLevel,
  } from '@openpeeps/common/types';
  import { accessTokenCreationDataSchema } from '@openpeeps/common';
  import {
    createCurrentProfileAccessTokenMutation,
    currentProfileAccessTokensStore,
    revokeCurrentProfileAccessTokenMutation,
  } from '$lib/api';
  import { i18nContext } from '$lib/components/i18n';
  import { toaster } from '$lib/utils/toast';
  import { Button, Form, FormInput, Loader } from '@openpeeps/ui';
  import { Copy } from 'lucide-svelte';

  const { t } = i18nContext();
  const toast = toaster();

  const accessTokens = currentProfileAccessTokensStore();
  const createAccessToken = createCurrentProfileAccessTokenMutation();
  const revokeAccessToken = revokeCurrentProfileAccessTokenMutation();
  const tokenList = $derived(($accessTokens.data ?? []) as PublicAccessToken[]);

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

  let formData = $state<AccessTokenCreationData>({
    name: '',
    description: '',
    expirationTime: '30d',
    scopes: [
      {
        scopeLevel: 'read',
        resource: { type: 'posts', id: '*' },
      },
    ],
  });
  let createdToken = $state<string | undefined>(undefined);
  let isCreating = $state(false);
  let valid = $state(false);

  const addScopeRow = () => {
    formData.scopes = [
      ...(formData.scopes ?? []),
      { scopeLevel: 'read', resource: { type: 'posts', id: '*' } },
    ];
  };

  const removeScopeRow = (index: number) => {
    formData.scopes = (formData.scopes ?? []).filter((_, i) => i !== index);
  };

  const copyToken = async () => {
    if (!createdToken) {
      return;
    }
    await navigator.clipboard.writeText(createdToken);
    toast({ message: t('settings.accessTokens.copySuccess'), type: 'success' });
  };

  const handleCreateToken = async () => {
    if (!formData.name?.trim()) {
      toast({
        message: t('settings.accessTokens.nameRequired'),
        type: 'error',
      });
      return;
    }
    if (!(formData.scopes?.length ?? 0)) {
      toast({
        message: t('settings.accessTokens.scopeRequired'),
        type: 'error',
      });
      return;
    }

    isCreating = true;
    createdToken = undefined;
    try {
      const created = (await createAccessToken({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        expirationTime: formData.expirationTime,
        scopes: (formData.scopes ?? []).map((scope) => ({
          ...scope,
          resource: {
            ...scope.resource,
            id: '*',
          },
        })),
      })) as AccessTokenWithMeta;
      createdToken = created.signedToken;
      formData = {
        name: '',
        description: '',
        expirationTime: '30d',
        scopes: [{ scopeLevel: 'read', resource: { type: 'posts', id: '*' } }],
      };
      toast({
        message: t('settings.accessTokens.createSuccess'),
        type: 'success',
      });
    } catch (error) {
      toast({
        message: t('settings.accessTokens.createError'),
        type: 'error',
      });
    } finally {
      isCreating = false;
    }
  };

  const handleRevoke = async (accessTokenId: string) => {
    try {
      await revokeAccessToken({ accessTokenId });
      toast({
        message: t('settings.accessTokens.revokeSuccess'),
        type: 'success',
      });
    } catch {
      toast({ message: t('settings.accessTokens.revokeError'), type: 'error' });
    }
  };

  const scopeLabel = (scope: Scope) =>
    `${scope.scopeLevel ?? 'read'}:${scope.resource.type}:${scope.resource.id ?? '*'}`;
  const getTokenScopes = (
    token: PublicAccessToken & { scopes?: Scope[] },
  ): Scope[] =>
    token.scopes ?? [];

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : t('settings.accessTokens.never');
</script>

<section class="flex flex-col gap-6 p-4">
  <div class="rounded-md border p-4">
    <h3 class="h3">{t('settings.accessTokens.createTitle')}</h3>
    <p class="text-sm opacity-80">
      {t('settings.accessTokens.createDescription')}
    </p>

    <Form
      schema={accessTokenCreationDataSchema}
      data={formData}
      bind:valid
      class="mt-4 flex flex-col gap-3"
    >
      <FormInput
        path={['name']}
        title={t('settings.accessTokens.name')}
        placeholder={t('settings.accessTokens.namePlaceholder')}
      />
      <FormInput
        path={['description']}
        title={t('settings.accessTokens.descriptionLabel')}
        placeholder={t('settings.accessTokens.descriptionPlaceholder')}
      />
      <FormInput
        path={['expirationTime']}
        type="select"
        title={t('settings.accessTokens.expiration')}
        options={[
          {
            value: '7d',
            label: t('settings.accessTokens.expirationOptions.sevenDays'),
          },
          {
            value: '30d',
            label: t('settings.accessTokens.expirationOptions.thirtyDays'),
          },
          {
            value: '90d',
            label: t('settings.accessTokens.expirationOptions.ninetyDays'),
          },
          {
            value: '1y',
            label: t('settings.accessTokens.expirationOptions.oneYear'),
          },
        ]}
      />

      <div class="mt-2 flex flex-col gap-2">
        <p class="text-sm font-medium">{t('settings.accessTokens.scopes')}</p>
        {#each formData.scopes ?? [] as _scope, index (index)}
          <div class="flex items-center gap-2">
            <FormInput
              path={['scopes', index, 'scopeLevel']}
              type="select"
              options={SCOPE_LEVELS.map((level) => ({
                value: level,
                label: level,
              }))}
            />
            <FormInput
              path={['scopes', index, 'resource', 'type']}
              type="select"
              options={RESOURCE_TYPES.map((resourceType) => ({
                value: resourceType,
                label: resourceType,
              }))}
            />
            <Button
              variant="variant-ringed-error"
              action={() => removeScopeRow(index)}
              disabled={(formData.scopes?.length ?? 0) === 1}
            >
              {t('common.remove')}
            </Button>
          </div>
        {/each}
        <Button variant="variant-ringed-primary" action={addScopeRow}>
          {t('settings.accessTokens.addScope')}
        </Button>
      </div>

      <div class="mt-2">
        <Button
          variant="variant-filled-primary"
          action={handleCreateToken}
          disabled={isCreating || !valid}
        >
          {isCreating
            ? t('settings.accessTokens.creating')
            : t('settings.accessTokens.create')}
        </Button>
      </div>
    </Form>

    {#if createdToken}
      <div class="mt-4 rounded-md border p-3">
        <p class="text-sm font-semibold">
          {t('settings.accessTokens.copyWarning')}
        </p>
        <div class="mt-2 flex items-start gap-2">
          <code class="break-all text-sm">{createdToken}</code>
          <button title={t('settings.accessTokens.copy')} onclick={copyToken}>
            <Copy size={16} />
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="rounded-md border p-4">
    <h3 class="h3">{t('settings.accessTokens.listTitle')}</h3>
    <Loader queries={[$accessTokens]}>
      {#if tokenList.length}
        <div class="mt-3 flex flex-col gap-3">
          {#each tokenList as token (token.id)}
            <div class="rounded-md border p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold">{token.name}</p>
                  {#if token.description}
                    <p class="text-sm opacity-80">{token.description}</p>
                  {/if}
                  <p class="mt-1 text-xs opacity-70">
                    {t('settings.accessTokens.expiresAt')}: {formatDateTime(
                      token.expiresAt,
                    )}
                  </p>
                </div>
                <Button
                  variant="variant-ringed-error"
                  action={() => handleRevoke(token.id)}
                  disabled={!!token.revokedAt}
                >
                  {token.revokedAt
                    ? t('settings.accessTokens.revoked')
                    : t('settings.accessTokens.revoke')}
                </Button>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                {#if getTokenScopes(token).length}
                  {#each getTokenScopes(token) as scope, scopeIndex (scopeIndex)}
                    <span class="rounded-full border px-2 py-1 text-xs">
                      {scopeLabel(scope)}
                    </span>
                  {/each}
                {:else}
                  <span class="text-xs opacity-70"
                    >{t('settings.accessTokens.noScopes')}</span
                  >
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm opacity-80">
          {t('settings.accessTokens.empty')}
        </p>
      {/if}
    </Loader>
  </div>
</section>
