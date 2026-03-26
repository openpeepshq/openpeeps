<script lang="ts">
	import { i18nContext } from '$lib/components/i18n';
	import type { ReportWithMeta } from '@openpeeps/common';
	import { Button, getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { resolveReportMutation } from '$lib/api';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';

	interface Props {
		report: ReportWithMeta;
		closeCallback?: (() => void) | undefined;
	}

	let { report, closeCallback = undefined }: Props = $props();
	const { t } = i18nContext();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const resolveReport = resolveReportMutation({
		reportId: report.id
	});

	const handleResolveReport = async () =>
		resolveReport({ resolution: 'ignore' })
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.closeReport.success')
					})
				);
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.closeReport.error')
					})
				);
			});
</script>

<ModalWrapper extraClassNames="relative">
	<ModalHeader title={t('admin.moderation.report.close.title')} />
	<article class="  m-4 h-full pb-3">
		<p class="my-4">{t('admin.moderation.report.close.description')}</p>
	</article>
	<ModalFooter>
		<Button
			title={t('admin.moderation.report.close.cancel')}
			action={() => modalManager.close()}
			variant="variant-ringed-surface"
			class="w-full"
		>
			{t('admin.moderation.report.close.cancel')}
		</Button>
		<Button
			title={t('admin.moderation.report.close.confirm')}
			action={handleResolveReport}
			variant="variant-filled-error"
			class="w-full"
		>
			{t('admin.moderation.report.close.confirm')}
		</Button>
	</ModalFooter>
</ModalWrapper>
