<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	// ------------ STORES --------------
	const modalStore = getModalStore();
</script>

{#if $modalStore[0]}
	<ModalWrapper extraClassNames="md:w-1/3">
		<ModalHeader title={t('admin.sort.title')} />

		<article class="flex flex-col p-3">
			<div class="w-full">
				<h4>{t('admin.sort.description')}</h4>

				<div class="mt-4 space-y-2">
					<!-- member name -->
					<div class="flex items-center gap-x-2">
						<input type="radio" id="name-a-z" name="sort" value="name-a-z" />
						<label for="name-a-z">{t('admin.sort.memberNameAZ')}</label>
					</div>
					<div class="flex items-center gap-x-2">
						<input type="radio" id="name-z-a" name="sort" value="name-z-a" />
						<label for="name-z-a">{t('admin.sort.memberNameZA')}</label>
					</div>
					<!--  userame -->
					<div class="flex items-center gap-x-2">
						<input type="radio" id="username-a-z" name="sort" value="username-a-z" />
						<label for="username-a-z">{t('admin.sort.usernameAZ')}</label>
					</div>
					<div class="flex items-center gap-x-2">
						<input type="radio" id="username-z-a" name="sort" value="username-z-a" />
						<label for="username-z-a">{t('admin.sort.usernameZA')}</label>
					</div>
					<!--  date sent -->
					<div class="flex items-center gap-x-2">
						<input
							type="radio"
							id="date-sent-newest-oldest"
							name="sort"
							value="date-sent-newest-oldest"
						/>
						<label for="date-sent-newest-oldest">{t('admin.sort.dateSentNewestOldest')}</label>
					</div>
					<div class="flex items-center gap-x-2">
						<input
							type="radio"
							id="date-sent-oldest-newest"
							name="sort"
							value="date-sent-oldest-newest"
						/>
						<label for="date-sent-oldest-newest">{t('admin.sort.dateSentOldestNewest')}</label>
					</div>
					<!--  date accepted-->
					<div class="flex items-center gap-x-2">
						<input
							type="radio"
							id="date-accepted-newest-oldest"
							name="sort"
							value="date-accepted-newest-oldest"
						/>
						<label for="date-accepted-newest-oldest"
							>{t('admin.sort.dateAcceptedNewestOldest')}</label
						>
					</div>
					<div class="flex items-center gap-x-2">
						<input
							type="radio"
							id="date-accepted-oldest-newest"
							name="sort"
							value="date-accepted-oldest-newest"
						/>
						<label for="date-accepted-oldest-newest"
							>{t('admin.sort.dateAcceptedOldestNewest')}</label
						>
					</div>
					<!--  status accepted-->
					<div class="flex items-center gap-x-2">
						<input type="radio" id="status-accepted" name="sort" value="status-accepted" />
						<label for="status-accepted">{t('admin.sort.statusAccepted')}</label>
					</div>
					<div class="flex items-center gap-x-2">
						<input type="radio" id="date-pending" name="sort" value="date-pending" />
						<label for="date-pending">{t('admin.sort.statusPending')}</label>
					</div>
				</div>
			</div>
		</article>
		<ModalFooter>
			<div></div>
			<Button variant="variant-filled-primary">{t('admin.sort.sortNow')}</Button>
		</ModalFooter>
	</ModalWrapper>
{/if}
