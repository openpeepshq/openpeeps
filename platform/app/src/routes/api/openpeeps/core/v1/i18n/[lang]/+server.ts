import type { RequestEvent } from '@sveltejs/kit';
import api from '$api';

export const GET = async (event: RequestEvent) => api.handle(event);
