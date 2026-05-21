<script lang="ts">
	import { Home, Newspaper, PhoneCall, Bell, PlusSquare, Users} from 'lucide-svelte';
	import { NewPostModal } from '../core/post';
	import MobileMenuItem from './MobileMenuItem.svelte';
	import { getModalManager } from '@openpeeps/ui';
	import { page } from '$app/state';
	import { groupByHandleStore } from '$lib/api';
	import { get } from 'svelte/store';
	import { postDataStore } from '../core/post/post-form/stores';
	import { i18nContext } from '$lib/components/i18n';

	const modalManager = getModalManager();
	const { t } = i18nContext();
	let groupHandle = $state('');

	let groupQuery = groupByHandleStore(groupHandle);
	$effect(() => {
		groupQuery = groupByHandleStore(groupHandle);
	});

	$effect(() => {
		if (page.url.pathname.includes('/groups/')) {
			groupHandle = page.url.pathname.split('/groups/')[1].replace('@', '');
		}
	});
	const triggerNewPostModal = async () => {
		if (page.url.pathname.includes('/groups/')) {
			const group = $groupQuery?.data;
			if (!group) {
				return;
			}
			postDataStore.set({
				...get(postDataStore),
				visibility: 'group',
				groupId: group?.id
			});
		} else {
			postDataStore.set({
				...get(postDataStore),
				visibility: 'public',
				groupId: undefined
			});
		}
		modalManager.show(NewPostModal, {});
	};
</script>

<div class="bg-surface-50 flex h-20 w-full items-center justify-evenly md:hidden">
	<MobileMenuItem title={t('navigation.home')} icon={Home} action="/feeds/local" />
	<MobileMenuItem title={t('navigation.myFeed')} icon={Newspaper} action="/feeds/my" />
	<MobileMenuItem title={t('navigation.newPost')} icon={PlusSquare} action={triggerNewPostModal} />
	<MobileMenuItem title={t('navigation.groups')} icon={Users} action="/groups"  />
	<MobileMenuItem title={t('navigation.notifications')} icon={Bell} action="/notifications" />
</div>
