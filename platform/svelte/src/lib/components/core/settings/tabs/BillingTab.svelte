<script lang="ts">
	import { checkPaymentStatus, createCustomerPortalMutation } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';
  import { AccessDeniedLoader } from '$lib/components/layout';
	import { formatTimeStamp } from '@openpeeps/common';
	import { Button, Loader } from '@openpeeps/ui';
	import { CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-svelte';

	const { t } = i18nContext();

	const paymentStatus = checkPaymentStatus();
	const createPortal = createCustomerPortalMutation();

	const getStatusInfo = (status: string) => {
		switch (status) {
			case 'active':
				return { color: 'text-green-600', icon: CheckCircle, label: 'Active' };
			case 'trialing':
				return { color: 'text-blue-600', icon: CheckCircle, label: 'Trial' };
			case 'past_due':
				return { color: 'text-yellow-600', icon: AlertCircle, label: 'Past Due' };
			case 'canceled':
				return { color: 'text-red-600', icon: AlertCircle, label: 'Canceled' };
			case 'unpaid':
				return { color: 'text-red-600', icon: AlertCircle, label: 'Unpaid' };
			case 'none':
				return { color: 'text-gray-600', icon: AlertCircle, label: 'No Subscription' };
			default:
				return { color: 'text-gray-600', icon: AlertCircle, label: status };
		}
	};

	const onCreatePortal = async () => {
		const result = await createPortal();
		if (result.success && result.url) {
			window.open(result.url, '_self', 'noopener,noreferrer');
		}
	};
</script>

<section class="relative">
	<AccessDeniedLoader queries={[$paymentStatus]}>
		{#if $paymentStatus.data}
			{@const subscription = $paymentStatus.data.subscription}
			{@const hasSubscription = subscription && subscription.status !== 'none'}

			<div class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="flex items-center gap-2 text-xl font-semibold">
						<CreditCard size={24} />
						{t('settings.billing.title')}
					</h2>
					{#if hasSubscription}
						{@const statusInfo = getStatusInfo(subscription.status)}
						<div class="flex items-center gap-2 {statusInfo.color}">
							<svelte:component this={statusInfo.icon} size={16} />
							<span class="text-sm font-medium">{statusInfo.label}</span>
						</div>
					{/if}
				</div>

				{#if hasSubscription}
					<div class="space-y-4">
						{#if subscription.paymentMethod}
							<div class="flex items-center justify-between border-b border-surface-200 py-3">
								<span class="text-sm text-surface-600">{t('settings.billing.paymentMethod')}</span>
								<div class="flex items-center gap-2">
									<CreditCard size={16} class="text-surface-500" />
									<span class="text-sm font-medium">
										{subscription.paymentMethod.brand
											? subscription.paymentMethod.brand.toUpperCase()
											: 'Card'}
										••••{subscription.paymentMethod.last4 || '****'}
									</span>
								</div>
							</div>
						{/if}

						<div class="flex items-center justify-between border-b border-surface-200 py-3">
							<span class="text-sm text-surface-600">{t('settings.billing.currentPeriod')}</span>
							<div class="flex items-center gap-2">
								<Calendar size={16} class="text-surface-500" />
								<span class="text-sm font-medium">
									{formatTimeStamp(subscription.currentPeriodStart)} - {formatTimeStamp(
										subscription.currentPeriodEnd,
										subscription.currentPeriodStart
									)}
								</span>
							</div>
						</div>

						<div class="flex items-center justify-between py-3">
							<span class="text-sm text-surface-600">{t('settings.billing.autoRenewal')}</span>
							<span
								class="text-sm font-medium {subscription.cancelAtPeriodEnd
									? 'text-yellow-600'
									: 'text-green-600'}"
							>
								{subscription.cancelAtPeriodEnd
									? t('settings.billing.autoRenewalCanceled')
									: t('settings.billing.autoRenewalActive')}
							</span>
						</div>

						<div class="flex gap-3 pt-4">
							<Button action={onCreatePortal} variant="variant-filled-primary" class="flex-1"
								>{t('settings.billing.createPortal')}</Button
							>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</AccessDeniedLoader>
</section>
