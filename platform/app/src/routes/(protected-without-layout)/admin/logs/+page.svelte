<script lang="ts">
  import { adminLogsStore } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader } from '@openpeeps/svelte/components';
  import { UpdatingDate } from '@openpeeps/ui';

  const logsQuery = adminLogsStore(true);
</script>

<AccessDeniedLoader queries={[$logsQuery]}>
  <div class="w-full p-5">
    <table class="table-auto border border-border">
      <thead>
        <tr>
          <th class="text-left p-2 border-b border-border">Timestamp</th>
          <th class="text-left p-2 border-b border-border">Level</th>
          <th class="text-left p-2 border-b border-border">Namespace</th>
          <th class="text-left p-2 border-b border-border">Message</th>
        </tr>
      </thead>
      <tbody>
        {#each $logsQuery.data ?? [] as log, index (index)}
          <tr>
            <td class="align-top p-1 border-b border-border"
              ><UpdatingDate date={log.timestamp} /></td
            >
            <td class="align-top p-1 border-b border-border">
              <span
                class={log.level.toLowerCase() === 'error' ||
                log.level.toLowerCase() === 'fatal'
                  ? 'text-error-600'
                  : ''}
              >
                {log.level.toUpperCase()}
              </span>
            </td>
            <td class="align-top p-1 border-b border-border">
              {log.namespace}
            </td>
            <td
              class="align-top p-1 border-b border-border whitespace-pre-wrap"
            >
              {log.message}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</AccessDeniedLoader>
