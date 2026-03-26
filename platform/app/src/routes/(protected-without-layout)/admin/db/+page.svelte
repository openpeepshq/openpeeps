<script lang="ts">
  import { AccessDeniedLoader, ProfileGuard } from '@openpeeps/svelte/components';
  import { getDbToken } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';

  const dbTokenPromise = getDbToken();
  dbTokenPromise
    .then((r) => goto('/_db?token=' + r.token))
    .catch(() => goto('/'));
</script>

<ProfileGuard neededCapabilities={['admin-db-access']}>
  <AccessDeniedLoader promises={[dbTokenPromise]} />
</ProfileGuard>
