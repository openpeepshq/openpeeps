import type { RequestEvent } from '@sveltejs/kit';
import api from '$api';

export const POST = (event: RequestEvent) => api.handle(event);
export const GET = (event: RequestEvent) => api.handle(event);
