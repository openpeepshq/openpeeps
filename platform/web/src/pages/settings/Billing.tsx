import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, CheckCircle, CreditCard } from 'lucide-react';
import { formatTimeStamp, isOwnerProfile } from '@openpeepshq/common';
import { useT, useOpenpeeps } from '@openpeepshq/react';
import { useCurrentProfile, useServerInfo } from '@openpeepshq/react/components';
import { Button, LoadingSpinner } from '@openpeepshq/react-ui';

function statusInfo(status: string) {
  switch (status) {
    case 'active':
      return { color: 'text-green-600', Icon: CheckCircle, label: 'Active' };
    case 'trialing':
      return { color: 'text-blue-600', Icon: CheckCircle, label: 'Trial' };
    case 'past_due':
      return { color: 'text-yellow-600', Icon: AlertCircle, label: 'Past Due' };
    case 'canceled':
      return { color: 'text-red-600', Icon: AlertCircle, label: 'Canceled' };
    case 'unpaid':
      return { color: 'text-red-600', Icon: AlertCircle, label: 'Unpaid' };
    case 'none':
      return {
        color: 'text-gray-600',
        Icon: AlertCircle,
        label: 'No Subscription',
      };
    default:
      return { color: 'text-gray-600', Icon: AlertCircle, label: status };
  }
}

export function BillingSettings() {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const profile = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const paymentStatusQuery = openpeepsApi.usePaymentStatus();
  const createPortal = openpeepsApi.createCustomerPortalAction();

  const stripeMembershipEnabled =
    !!serverInfo.payments?.stripe?.paidMembership?.enabled &&
    !(profile && isOwnerProfile(profile));

  useEffect(() => {
    if (!stripeMembershipEnabled) navigate(-1);
  }, [stripeMembershipEnabled, navigate]);

  if (!stripeMembershipEnabled) return null;

  const onCreatePortal = async () => {
    const result = await createPortal();
    if (result.success && result.url) {
      window.open(result.url, '_self', 'noopener,noreferrer');
    }
  };

  if (paymentStatusQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const data = paymentStatusQuery.data;
  const subscription = data && data.status !== 'none' ? data : null;

  return (
    <section className="relative">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="flex items-center gap-2 text-xl font-semibold"
            data-testid="settings-billing-heading"
          >
            <CreditCard size={24} />
            {t('settings.billing.title', { defaultValue: 'Billing' })}
          </h2>
          {subscription &&
            (() => {
              const info = statusInfo(subscription.status);
              const Icon = info.Icon;
              return (
                <div className={`flex items-center gap-2 ${info.color}`}>
                  <Icon size={16} />
                  <span className="text-sm font-medium">{info.label}</span>
                </div>
              );
            })()}
        </div>

        {subscription && (
          <div className="space-y-4">
            {subscription.paymentMethod && (
              <div className="border-surface-200 flex items-center justify-between border-b py-3">
                <span className="text-surface-600 text-sm">
                  {t('settings.billing.paymentMethod', {
                    defaultValue: 'Payment method',
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-surface-500" />
                  <span className="text-sm font-medium">
                    {subscription.paymentMethod.brand
                      ? subscription.paymentMethod.brand.toUpperCase()
                      : 'Card'}{' '}
                    ••••{subscription.paymentMethod.last4 || '****'}
                  </span>
                </div>
              </div>
            )}

            <div className="border-surface-200 flex items-center justify-between border-b py-3">
              <span className="text-surface-600 text-sm">
                {t('settings.billing.currentPeriod', {
                  defaultValue: 'Current period',
                })}
              </span>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-surface-500" />
                <span className="text-sm font-medium">
                  {formatTimeStamp(subscription.currentPeriodStart)} -{' '}
                  {formatTimeStamp(
                    subscription.currentPeriodEnd,
                    subscription.currentPeriodStart,
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-surface-600 text-sm">
                {t('settings.billing.autoRenewal', {
                  defaultValue: 'Auto-renewal',
                })}
              </span>
              <span
                className={`text-sm font-medium ${subscription.cancelAtPeriodEnd ? 'text-yellow-600' : 'text-green-600'}`}
              >
                {subscription.cancelAtPeriodEnd
                  ? t('settings.billing.autoRenewalCanceled', {
                      defaultValue: 'Canceled at end of period',
                    })
                  : t('settings.billing.autoRenewalActive', {
                      defaultValue: 'Active',
                    })}
              </span>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                title="Manage"
                variant="variant-filled-primary"
                action={onCreatePortal}
              >
                {t('settings.billing.createPortal', {
                  defaultValue: 'Manage subscription',
                })}
              </Button>
            </div>
          </div>
        )}

        {!subscription && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {t('settings.billing.noSubscription', {
                defaultValue:
                  'No active subscription. Subscribe to support your community.',
              })}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
