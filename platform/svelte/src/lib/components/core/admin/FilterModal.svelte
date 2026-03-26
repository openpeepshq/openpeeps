<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const modalStore = getModalStore();
</script>

{#if $modalStore[0]}
	<ModalWrapper extraClassNames="md:w-1/3">
		<ModalHeader title={t('admin.filter.title')} />

		<article class="flex flex-col p-3">
			<div class="w-full">
				<h4>{t('admin.filter.description')}</h4>

				<div class="mt-4">
					<div class="space-y-2">
						<h4 class="text-lg">{t('admin.filter.status')}</h4>
						<div class="flex items-center gap-x-2">
							<input type="checkbox" id="status-pending" name="status" value="status-pending" />
							<label for="status-pending">{t('admin.filter.pending')}</label>
						</div>
						<div class="flex items-center gap-x-2">
							<input type="checkbox" id="status-accepted" name="status" value="status-accepted" />
							<label for="status-accepted">{t('admin.filter.accepted')}</label>
						</div>
					</div>
					<h4 class="mt-4 text-lg">{t('admin.filter.dateSent')}</h4>
					<div class="flex items-center justify-between">
						<div class="w-[45%]">
							<label for="date-sent">{t('admin.filter.from')}</label>
							<input type="date" id="date-sent" name="date-sent" class="w-full rounded-md" />
						</div>

						<div class="w-[45%]">
							<label for="date-sent">{t('admin.filter.to')}</label>
							<input type="date" id="date-sent" name="date-sent" class="w-full rounded-md" />
						</div>
					</div>
					<h4 class="mt-4 text-lg">{t('admin.filter.dateAccepted')}</h4>
					<div class="flex items-center justify-between">
						<div class="w-[45%]">
							<label for="date-accepted">{t('admin.filter.from')}</label>
							<input
								type="date"
								id="date-accepted"
								name="date-accepted"
								class="w-full rounded-md"
							/>
						</div>

						<div class="w-[45%]">
							<label for="date-accepted">{t('admin.filter.to')}</label>
							<input
								type="date"
								id="date-accepted"
								name="date-accepted"
								class="w-full rounded-md"
							/>
						</div>
					</div>
				</div>
			</div>
		</article>
		<ModalFooter>
			<div></div>
			<div class="flex gap-x-2">
				<Button title={t('admin.filter.resetTitle')} variant="variant-ringed-surface"
					>{t('admin.filter.reset')}</Button
				>
				<Button title={t('admin.filter.applyTitle')} variant="variant-filled-primary"
					>{t('admin.filter.apply')}</Button
				>
			</div>
		</ModalFooter>
	</ModalWrapper>
{/if}
