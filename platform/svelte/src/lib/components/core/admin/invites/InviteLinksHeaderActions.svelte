<script lang="ts">
	import { Button, getModalManager } from '@openpeeps/ui';
	import { PlusIcon } from 'lucide-svelte';
	import InviteWithLink from '../InviteWithLink.svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const modalManager = getModalManager();
</script>

<Button
	title={t('admin.invites.inviteWithLinkTitle')}
	variant="variant-filled-primary"
	action={() => modalManager.show(InviteWithLink)}
>
	<PlusIcon class="mr-2 h-5 w-5" />
	{t('admin.invites.newInvite')}
</Button>
