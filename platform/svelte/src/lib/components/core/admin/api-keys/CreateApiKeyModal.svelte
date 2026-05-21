<script lang="ts">
  import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils/toast';
  import { Button, ModalHeader, ModalWrapper } from '@openpeeps/ui';
  import { Copy } from 'lucide-svelte';

  type ScopeLevel = 'none' | 'read' | 'write' | 'admin';

  /** Valid scope levels per resource type — only show options that make sense for service tokens. */
  const SCOPE_CONFIG: Record<
    string,
    { levels: ScopeLevel[]; description: string }
  > = {
    posts: {
      levels: ['none', 'read', 'admin'],
      description: 'Bulk content access (read=public, admin=all)',
    },
    profiles: {
      levels: ['none', 'read'],
      description: 'List and view user profiles',
    },
    groups: {
      levels: ['none', 'read', 'admin'],
      description: 'Group data (read=public, admin=all)',
    },
    jam: {
      levels: ['none', 'read', 'admin'],
      description: 'Recordings and events (admin=list jams)',
    },
    analytics: {
      levels: ['none', 'read'],
      description: 'Platform analytics for report generation',
    },
  };

  const RESOURCE_TYPES = Object.keys(
    SCOPE_CONFIG,
  ) as (keyof typeof SCOPE_CONFIG)[];

  type ResourceType = (typeof RESOURCE_TYPES)[number];

  const modalStore = getModalStore();
  const toastStore = getToastStore();

  let name = $state('');
  let scopeLevels = $state<Record<ResourceType, ScopeLevel>>({
    posts: 'none',
    profiles: 'none',
    groups: 'none',
    jam: 'none',
    analytics: 'none',
  });

  let createdKey = $state<string | undefined>(undefined);
  let isLoading = $state(false);
  let errorMessage = $state<string | undefined>(undefined);

  const buildScopes = () =>
    RESOURCE_TYPES.flatMap((resourceType) => {
      const level = scopeLevels[resourceType];
      if (level === 'none') return [];
      return [
        {
          scope: level as 'read' | 'write' | 'admin',
          resource: { type: resourceType, id: '*' },
        },
      ];
    });

  const handleCreate = async () => {
    errorMessage = undefined;
    const scopes = buildScopes();

    if (!name.trim()) {
      errorMessage = 'Name is required.';
      return;
    }
    if (scopes.length === 0) {
      errorMessage = 'Select at least one scope.';
      return;
    }

    isLoading = true;
    try {
      const { authHeaders } = await import('$lib/api');
      const response = await fetch('/api/allpeep/core/v1/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });

      if (!response.ok) {
        errorMessage = `Failed to create API key (${response.status}).`;
        return;
      }

      const data = await response.json();
      createdKey = data.key;
    } catch {
      errorMessage = 'An unexpected error occurred.';
    } finally {
      isLoading = false;
    }
  };

  const copyKey = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    toastStore.trigger(
      toast({
        message: 'API key copied to clipboard.',
        background: 'variant-filled-success',
      }),
    );
  };
</script>

<ModalWrapper extraClassNames="md:w-1/2">
  <ModalHeader title="Create API Key" />

  <article class="flex flex-col gap-4 p-4">
    {#if createdKey}
      <div class="flex flex-col gap-3">
        <p class="text-warning-500 font-semibold">
          Copy this key now. It won't be shown again.
        </p>
        <div class="bg-surface-200 flex items-start gap-2 rounded-md p-3">
          <code class="flex-1 break-all text-sm">{createdKey}</code>
          <button
            title="Copy API key"
            class="mt-0.5 shrink-0"
            onclick={copyKey}
          >
            <Copy size={18} />
          </button>
        </div>
        <Button
          title="Close"
          variant="variant-filled-primary"
          action={() => modalStore.close()}
          class="mt-2"
        >
          Done
        </Button>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        <label class="font-medium" for="api-key-name">Name</label>
        <input
          id="api-key-name"
          type="text"
          class="input rounded-md p-2"
          placeholder="e.g. AI access token"
          bind:value={name}
          maxlength={100}
        />
      </div>

      <div class="flex flex-col gap-2">
        <p class="font-medium">Scopes</p>
        <div class="flex flex-col gap-2">
          {#each RESOURCE_TYPES as resourceType}
            <div class="flex items-center justify-between gap-4">
              <div class="w-40">
                <span class="font-medium capitalize">{resourceType}</span>
                <p class="text-surface-500 text-xs">
                  {SCOPE_CONFIG[resourceType].description}
                </p>
              </div>
              <select
                class="bg-surface-300 flex-1 rounded-md border p-2"
                bind:value={scopeLevels[resourceType]}
              >
                {#each SCOPE_CONFIG[resourceType].levels as level}
                  <option value={level}>{level}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>
      </div>

      {#if errorMessage}
        <p class="text-error-500 text-sm">{errorMessage}</p>
      {/if}

      <div class="mt-2 flex gap-2">
        <Button
          title="Cancel"
          variant="variant-ringed-surface"
          action={() => modalStore.close()}
          class="flex-1"
        >
          Cancel
        </Button>
        <Button
          title="Create API Key"
          variant="variant-filled-primary"
          action={handleCreate}
          class="flex-1"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </div>
    {/if}
  </article>
</ModalWrapper>
