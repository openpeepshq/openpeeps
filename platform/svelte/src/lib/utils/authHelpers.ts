import { currentAccountStore } from '$lib/api';
import { goto } from '$app/navigation';

export const requireAccount = () => {
	currentAccountStore().subscribe(async ({ isSuccess, isPending }) => {
		if (!isSuccess && !isPending) {
			await goto('/auth/login');
		}
	});
};
