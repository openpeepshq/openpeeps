<script lang="ts">
  import { getBackupsListStore } from '@openpeeps/svelte/api';
  import { FlaskConical, MonitorDown } from 'lucide-svelte';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import {
    BackupsHeaderActions,
    RestoreTestBackupModal,
  } from '@openpeeps/svelte/components';
  import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
  import { Button } from '@openpeeps/ui';

  getPageHeaderStore().set({
    title: 'Backups & Restore',
    actions: BackupsHeaderActions,
  });

  const backupsListStore = getBackupsListStore();

  const modalStore = getModalStore();

  export const testModal: ModalSettings = {
    type: 'component',
    component: { ref: RestoreTestBackupModal },
  };
</script>

<div class="relative">
  <div class="flex justify-end pr-8 mt-2">
    <Button
      title="Download Test Data Template"
      variant="variant-ghost-primary"
      action={() => modalStore.trigger(testModal)}
    >
      <FlaskConical size={18} />
      <span class="hidden md:flex">Test Backup</span>
    </Button>
    <!-- </a> -->
  </div>
  <div class="w-[90%] mx-auto p-4 align-center border-2 mt-2 rounded-md">
    All backups are stored in the server temporarily. Please download the
    backups and store them in a safe place. You can restore the backups by
    uploading them here.
  </div>

  {#if $backupsListStore.isSuccess}
    {#if $backupsListStore.data.length === 0}
      <div class="w-full flex justify-center items-center p-4">
        <h2 class="text-lg">No Backups found</h2>
      </div>
    {:else if $backupsListStore.data.length > 0}
      <div class="mt-2">
        {#each [...$backupsListStore.data].reverse() as backup (backup)}
          <div class="flex items-center gap-2 p-4 border-b w-full">
            <div class="flex items-center gap-2">
              <h2 class="text-lg">
                {backup}
              </h2>

              <div class="flex gap-x-3 items-center">
                <!-- <Button variant="default">
                  <ArchiveRestore />
                </Button> -->
                <a title="Download" download href="/backups/{backup}.zip">
                  <MonitorDown />
                </a>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  {#if $backupsListStore.isError}
    <div class="w-full flex justify-center items-center p-4">
      <h2 class="text-lg">Error fetching</h2>
    </div>
  {/if}

  {#if $backupsListStore.isLoading}
    <div class="w-full flex justify-center items-center p-4">
      <h2 class="text-lg">Loading...</h2>
    </div>
  {/if}
</div>
