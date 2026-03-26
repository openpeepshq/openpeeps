import { goto } from '$app/navigation';
import { clearToken } from '$lib/auth';

export const handleLogout = async () => {
	clearToken();
	await goto('/auth/login');
	window.location.reload();
};
