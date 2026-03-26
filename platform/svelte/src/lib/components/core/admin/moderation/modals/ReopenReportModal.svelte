<script lang="ts">
	import { i18nContext } from '$lib/components/i18n';
	import type { ReportWithMeta } from '@openpeeps/common';
	import { Button, getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { reopenReportMutation } from '$lib/api';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';

	interface Props {
		report: ReportWithMeta;
		reopenCallback?: (() => void) | undefined;
	}

	let { report, reopenCallback = undefined }: Props = $props();
	const { t } = i18nContext();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const resolveReport = reopenReportMutation({
		reportId: report.id
	});

	const handleResolveReport = async () =>
		resolveReport()
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.reopenReport.success')
					})
				);
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.reopenReport.error')
					})
				);
			});
</script>

<ModalWrapper extraClassNames="relative">
	<ModalHeader title={t('admin.moderation.report.reopen.title')} />
	<article class="  m-4 h-full pb-3">
		<p class="my-4">{t('admin.moderation.report.reopen.description')}</p>
	</article>
	<ModalFooter>
		<Button
			title={t('admin.moderation.report.reopen.cancel')}
			action={() => modalManager.close()}
			variant="variant-ringed-surface"
			class="w-full"
		>
			{t('admin.moderation.report.reopen.cancel')}
		</Button>
		<Button
			title={t('admin.moderation.report.reopen.confirm')}
			action={handleResolveReport}
			variant="variant-filled-error"
			class="w-full"
		>
			{t('admin.moderation.report.reopen.confirm')}
		</Button>
	</ModalFooter>
</ModalWrapper>
