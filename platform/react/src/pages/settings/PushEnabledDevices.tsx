import { Laptop, Smartphone, Trash2 } from 'lucide-react';
import {
  pushSubscriptionDeviceName,
  pushSubscriptionEndpoint,
  pushSubscriptionIsMobile,
} from '@openpeepshq/common/lib';
import {
  getPushSubscription,
  unsubscribePushNotifications,
  useT,
  useSetPageHeader,
} from '../../index';
import { usePushEnabledDevices } from '../../hooks';
import { Button, Toast } from '@openpeepshq/react-ui';

export function PushEnabledDevices() {
  const t = useT();
  const {
    subscriptions,
    isCurrentDevice,
    deletingId,
    confirmId,
    setConfirmId,
    status,
    clearStatus,
    remove,
  } = usePushEnabledDevices({
    getCurrentEndpoint: async () => (await getPushSubscription())?.endpoint,
    unsubscribeCurrent: async () => {
      await unsubscribePushNotifications();
    },
  });

  useSetPageHeader(
    t('settings.notifications.pushEnabledDevices.title', {
      defaultValue: 'Push-enabled devices',
    }),
  );

  return (
    <div className="p-4">
      {subscriptions.length === 0 ? (
        <div className="flex w-full items-center justify-center p-4">
          <h2 className="text-lg">
            {t('settings.notifications.pushEnabledDevices.noDevicesFound', {
              defaultValue: 'No push-enabled devices found.',
            })}
          </h2>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <ul className="divide-y">
            {subscriptions.map((subscription) => {
              const endpoint = pushSubscriptionEndpoint(subscription) ?? '';
              const current = isCurrentDevice(endpoint);
              const confirming = confirmId === subscription.id;

              return (
                <li
                  key={subscription.id}
                  className="hover:bg-surface flex items-center justify-between p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground">
                      {pushSubscriptionIsMobile(subscription) ? (
                        <Smartphone size={20} />
                      ) : (
                        <Laptop size={20} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {pushSubscriptionDeviceName(subscription)}
                        </p>
                        {current ? (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                            {t('common.thisDevice', {
                              defaultValue: 'This device',
                            })}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {subscription.type}
                      </p>
                    </div>
                  </div>

                  {confirming ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        disabled={deletingId === subscription.id}
                        action={() => remove(subscription)}
                      >
                        {t(
                          'settings.notifications.pushEnabledDevices.delete.confirm',
                          {
                            defaultValue: 'Delete',
                          },
                        )}
                      </Button>
                      <Button variant="ghost" action={() => setConfirmId(null)}>
                        {t(
                          'settings.notifications.pushEnabledDevices.delete.cancel',
                          {
                            defaultValue: 'Cancel',
                          },
                        )}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-error p-2 transition-colors"
                      title={t('common.actions.delete', {
                        defaultValue: 'Delete',
                      })}
                      onClick={() => setConfirmId(subscription.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {status ? (
        <Toast variant={status.type} onDismiss={clearStatus}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
