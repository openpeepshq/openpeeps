<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import { coreConfigSanitizedSchema } from '@openpeeps/common/types';
  import { configStore } from '$lib/api';
  import { ConfigurationTree } from '$lib/components/core/configuration';
  import { Loader } from '@openpeeps/ui';

  const queryClient = useQueryClient();

  const coreConfigStore = configStore('openpeeps', 'core');
</script>

<Loader queries={[$coreConfigStore]}>
  {#if $coreConfigStore.data}
    <ConfigurationTree
      schema={coreConfigSanitizedSchema}
      defaults={$coreConfigStore.data.defaults}
      config={$coreConfigStore.data.config}
      namespace="openpeeps"
      name="core"
      onUpdate={() => {
        queryClient.invalidateQueries({ queryKey: ['server'], exact: true });
        location.reload();
      }}
    />
  {/if}
</Loader>
