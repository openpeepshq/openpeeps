import type { RequestEvent } from '@sveltejs/kit';
import api from '$api';

export const PUT = async (event: RequestEvent) => api.handle(event);
