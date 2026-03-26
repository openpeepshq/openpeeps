<script lang="ts">
  import {
    currentProfileNotificationTypesStore,
    updateProfileSettingsMutation,
  } from '$lib/api';
  import NotificationSetting from './NotificationSetting.svelte';
  import { toaster } from '$lib/utils/toast';
  import { getServerInfo } from '$lib/server';
  import { subscribePushNotifications } from '$lib/push';
  import { i18nContext } from '$lib/components/i18n';
  import PushSettings from './PushSettings.svelte';
  import { Button, Loader } from '@openpeeps/ui';
  import { getCurrentProfile, getCurrentProfileSettings } from '$lib/auth';
  import { deepSet, type ProfileSettings } from '@openpeeps/common';

  const { t } = i18nContext();

  const toast = toaster();
  const serverData = getServerInfo();
  const me = getCurrentProfile();
  const updateCurrentProfileSettings = updateProfileSettingsMutation();

  const serverDataKey = serverData.vapid.publicKey!;

  const notificationTypes = currentProfileNotificationTypesStore();

  const settings = $state(
    getCurrentProfileSettings() ?? ({ id: me?.id, notifications: {} } as ProfileSettings),
  );

  const save = async () => {
    if (!settings) {
      return;
    }
    if (
      Object.keys(settings?.notifications || {}).some(
        (type) => settings?.notifications?.[type]?.push,
      )
    ) {
      await subscribePushNotifications(serverDataKey);
    }

    await updateCurrentProfileSettings(settings).then(() =>
      toast({ message: t('settings.notifications.updateSuccess') }),
    );
  };
</script>

<section class="mr-4 mt-5 p-4">
  <h3 class="h3">{t('settings.notifications.pushSettings')}</h3>
  <PushSettings />
  <h3 class="h3">{t('settings.notifications.description')}</h3>
  <Loader queries={[$notificationTypes]}>
    {#each $notificationTypes.data as notificationType (notificationType)}
      <NotificationSetting
        settings={settings?.notifications?.[notificationType.type]}
        {notificationType}
        onChange={(notificationTypeSettings) => {
          console.log(notificationTypeSettings);
          deepSet(
            settings,
            'notifications.' + notificationType.type,
            notificationTypeSettings,
          );
        }}
      />
    {/each}
    <div>
      <Button
        title={t('common.submit')}
        variant="variant-filled-primary"
        action={save}
      >
        {t('common.submit')}
      </Button>
    </div>
  </Loader>
  <div class="py-10 md:py-8"></div>
</section>
