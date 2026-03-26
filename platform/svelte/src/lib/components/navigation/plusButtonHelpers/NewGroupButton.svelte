<script lang="ts">
  import { checkRoleCapabilities } from '@openpeeps/common';
  import { setPlusButtonActions } from '$lib/stores';
  import { i18nContext } from '$lib/components/i18n';
  import { getCurrentProfile } from '$lib/auth';

  const { t } = i18nContext();

  const currentProfile = getCurrentProfile();

  if (
    checkRoleCapabilities(['core-groups-create'], currentProfile?.roles).success
  ) {
    setPlusButtonActions({
      title: t('groups.new'),
      action: '/groups/new',
    });
  }
</script>
