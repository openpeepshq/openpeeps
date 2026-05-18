<script lang="ts">
  import { adminLogsStore } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader } from '@openpeeps/svelte/components';

  const logsQuery = adminLogsStore(true);
</script>

<AccessDeniedLoader queries={[$logsQuery]}>
  <div class="w-full p-5">
    <table class="border-border table-auto border">
      <thead>
        <tr>
          <th class="border-border border-b p-2 text-left">Timestamp</th>
          <th class="border-border border-b p-2 text-left">Level</th>
          <th class="border-border border-b p-2 text-left">Namespace</th>
          <th class="border-border border-b p-2 text-left">Message</th>
        </tr>
      </thead>
      <tbody>
        {#each $logsQuery.data ?? [] as log, index (index)}
          <tr>
            <td class="border-border border-b p-1 align-top">
              {log.timestamp}
            </td>
            <td class="border-border border-b p-1 align-top">
              <span
                class={log.level.toLowerCase() === 'error' ||
                log.level.toLowerCase() === 'fatal'
                  ? 'text-error-600'
                  : ''}
              >
                {log.level.toUpperCase()}
              </span>
            </td>
            <td class="border-border border-b p-1 align-top">
              {log.namespace}
            </td>
            <td
              class="border-border whitespace-pre-wrap border-b p-1 align-top"
            >
              {log.message}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</AccessDeniedLoader>
