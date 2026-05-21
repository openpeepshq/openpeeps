<script lang="ts">
  import type {
    AccessTokenCreationData,
    AccessTokenWithMeta,
    PublicAccessToken,
    Scope,
    ScopeLevel,
    ServiceResourceType,
  } from '@openpeeps/common/types';
  import { accessTokenCreationDataSchema } from '@openpeeps/common/types';
  import {
    adminServiceAccessTokensStore,
    createAdminServiceAccessTokenMutation,
    revokeAdminServiceAccessTokenMutation,
  } from '@openpeeps/svelte/api';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { Button, Form, FormInput, Loader } from '@openpeeps/ui';
  import { Copy } from 'lucide-svelte';

  getPageHeaderStore().set({
    title: 'Service Access Tokens',
  });

  const SERVICE_RESOURCE_TYPES: (ServiceResourceType | '*')[] = [
    'analytics',
    'webhooks',
    'posts',
    'profiles',
  ];
  const SCOPE_LEVELS: ScopeLevel[] = ['read', 'write', 'admin'];

  const tokensQuery = adminServiceAccessTokensStore();
  const createToken = createAdminServiceAccessTokenMutation();
  const revokeToken = revokeAdminServiceAccessTokenMutation();

  let formData = $state<AccessTokenCreationData>({
    name: '',
    description: '',
    expirationTime: '30d',
    scopes: [{ scopeLevel: 'read', resource: { type: 'profiles', id: '*' } }],
  });
  let valid = $state(false);
  let creating = $state(false);
  let createdToken = $state<string | undefined>(undefined);
  let errorMessage = $state<string | undefined>(undefined);

  const addScopeRow = () => {
    formData.scopes = [
      ...(formData.scopes ?? []),
      { scopeLevel: 'read', resource: { type: 'profiles', id: '*' } },
    ];
  };

  const removeScopeRow = (index: number) => {
    formData.scopes = (formData.scopes ?? []).filter((_, i) => i !== index);
  };

  const create = async () => {
    errorMessage = undefined;
    if (!formData.name?.trim()) {
      errorMessage = 'Name is required.';
      return;
    }
    if (!(formData.scopes?.length ?? 0)) {
      errorMessage = 'At least one scope is required.';
      return;
    }

    creating = true;
    createdToken = undefined;
    try {
      const created = (await createToken({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        expirationTime: formData.expirationTime,
        scopes: (formData.scopes ?? []).map((scope) => ({
          ...scope,
          resource: { ...scope.resource, id: '*' },
        })),
      })) as AccessTokenWithMeta;
      createdToken = created.signedToken;
      formData = {
        name: '',
        description: '',
        expirationTime: '30d',
        scopes: [
          { scopeLevel: 'read', resource: { type: 'profiles', id: '*' } },
        ],
      };
    } catch (error) {
      errorMessage = 'Failed to create service token.';
    } finally {
      creating = false;
    }
  };

  const revoke = async (accessTokenId: string) => {
    await revokeToken({ accessTokenId });
  };

  const copyCreatedToken = async () => {
    if (!createdToken) {
      return;
    }
    await navigator.clipboard.writeText(createdToken);
  };

  const scopeLabel = (scope: Scope) =>
    `${scope.scopeLevel ?? 'read'}:${scope.resource.type}:${scope.resource.id ?? '*'}`;

  const tokens = $derived(($tokensQuery.data ?? []) as PublicAccessToken[]);
</script>

<section class="flex flex-col gap-6 p-4">
  <div class="rounded-md border p-4">
    <h3 class="h3">Create Service Access Token</h3>
    <p class="text-sm opacity-80">
      Create a service token for integrations. Copy the token value when it is
      created.
    </p>

    <Form
      schema={accessTokenCreationDataSchema}
      data={formData}
      bind:valid
      class="mt-4 flex flex-col gap-3"
    >
      <FormInput
        path={['name']}
        title="Name"
        placeholder="e.g. Analytics importer"
      />
      <FormInput
        path={['description']}
        title="Description"
        placeholder="Optional description"
      />
      <FormInput
        path={['expirationTime']}
        type="select"
        title="Expiration"
        options={[
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: '90d', label: '90 days' },
          { value: '1y', label: '1 year' },
        ]}
      />

      <div class="mt-2 flex flex-col gap-2">
        <p class="text-sm font-medium">Scopes</p>
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
              options={SERVICE_RESOURCE_TYPES.map((resourceType) => ({
                value: resourceType,
                label: resourceType,
              }))}
            />
            <Button
              variant="variant-ringed-error"
              action={() => removeScopeRow(index)}
              disabled={(formData.scopes?.length ?? 0) === 1}
            >
              Remove
            </Button>
          </div>
        {/each}
        <Button variant="variant-ringed-primary" action={addScopeRow}>
          Add Scope
        </Button>
      </div>

      {#if errorMessage}
        <p class="text-error-500 text-sm">{errorMessage}</p>
      {/if}

      <div class="mt-2">
        <Button
          variant="variant-filled-primary"
          action={create}
          disabled={creating || !valid}
        >
          {creating ? 'Creating...' : 'Create Service Token'}
        </Button>
      </div>
    </Form>

    {#if createdToken}
      <div class="mt-4 rounded-md border p-3">
        <p class="text-sm font-semibold">
          Copy this token now. It will not be shown again.
        </p>
        <div class="mt-2 flex items-start gap-2">
          <code class="break-all text-sm">{createdToken}</code>
          <button title="Copy token" onclick={copyCreatedToken}>
            <Copy size={16} />
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="rounded-md border p-4">
    <h3 class="h3">Service Access Tokens</h3>
    <Loader queries={[$tokensQuery]}>
      {#if tokens.length}
        <div class="mt-3 flex flex-col gap-3">
          {#each tokens as token (token.id)}
            <div class="rounded-md border p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold">{token.name}</p>
                  {#if token.description}
                    <p class="text-sm opacity-80">{token.description}</p>
                  {/if}
                  <p class="mt-1 text-xs opacity-70">
                    Expires at: {token.expiresAt
                      ? new Date(token.expiresAt).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <Button
                  variant="variant-ringed-error"
                  action={() => revoke(token.id)}
                  disabled={!!token.revokedAt}
                >
                  {token.revokedAt ? 'Revoked' : 'Revoke'}
                </Button>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                {#if token.scopes?.length}
                  {#each token.scopes as scope, scopeIndex (scopeIndex)}
                    <span class="rounded-full border px-2 py-1 text-xs">
                      {scopeLabel(scope)}
                    </span>
                  {/each}
                {:else}
                  <span class="text-xs opacity-70">No scopes</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm opacity-80">No service access tokens yet.</p>
      {/if}
    </Loader>
  </div>
</section>
