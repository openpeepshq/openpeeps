import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => api.handle(event);
